import { computed, Injectable, signal } from '@angular/core';
import type { Profile, Routine, ScheduledWorkout, WeeklyPlan, WeightRecord, Workout } from './models';
import { seedExercises } from './seed';
import {
  buildWorkout, completeWorkout, createInitialState, deserializeState, FitAppState,
  localDate, parseLocalDate, removeRoutine, serializeState, STORAGE_KEY,
  validateProfile, validateRoutine, validateState, validSetValues, weekDates,
} from './workout-utils';

/** Written by an earlier build in its own key; now part of STORAGE_KEY. */
const LEGACY_SYNC_KEY = 'fitapp-sync-v1';

export interface SyncMeta {
  email: string;
  /** Server revision the local data is based on; null until the first pull after signing in. */
  revision: number | null;
  /** Local changes not yet accepted by the server. */
  dirty: boolean;
  /** false after the session expired: revision and dirty are kept so signing in again does not conflict. */
  signedIn: boolean;
}

function parseSyncMeta(value: unknown): SyncMeta | null {
  if (value === null || typeof value !== 'object') return null;
  const meta = value as Record<string, unknown>;
  const revision = meta['revision'];
  if (typeof meta['email'] !== 'string' || meta['email'].length > 254 || typeof meta['dirty'] !== 'boolean'
    || typeof meta['signedIn'] !== 'boolean'
    || !(revision === null || (typeof revision === 'number' && Number.isInteger(revision) && revision >= 0))) return null;
  return { email: meta['email'], revision, dirty: meta['dirty'], signedIn: meta['signedIn'] };
}

/** The stored entry is FitAppState v1 plus an optional `sync` field that validateState ignores. */
function parseStored(raw: string): { state: FitAppState; sync: SyncMeta | null } | null {
  if (raw.length > 20_000_000) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const state = validateState(parsed);
    if (!state) return null;
    return { state, sync: parseSyncMeta((parsed as Record<string, unknown>)['sync']) };
  } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class WorkoutStore {
  readonly profile = signal<Profile>(createInitialState().profile);
  readonly routines = signal<Routine[]>(createInitialState().routines);
  readonly exercises = signal(seedExercises);
  readonly history = signal<Workout[]>([]);
  readonly schedule = signal<ScheduledWorkout[]>([]);
  readonly weeklyPlan = signal<WeeklyPlan>(createInitialState().weeklyPlan);
  readonly weights = signal<WeightRecord[]>([]);
  readonly activeWorkout = signal<Workout | null>(null);
  readonly storageError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly completedThisWeek = computed(() => {
    const dates = new Set(weekDates());
    return this.history().filter((workout) => workout.finishedAt && dates.has(localDate(new Date(workout.finishedAt)))).length;
  });

  /** Account sync bookkeeping; null when this device does not follow an account (or its data could not be read). */
  private sync: SyncMeta | null = null;

  constructor() {
    try {
      const saved = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const restored = parseStored(saved);
        if (restored) { this.applyState(restored.state); this.sync = restored.sync; }
        // Without valid data the sync metadata is not trusted either: the account copy must not be overwritten.
        else this.storageError.set('No pudimos recuperar los datos guardados: el archivo local no es válido. Podés importar una copia de seguridad o ingresar a tu cuenta.');
      }
      if (typeof localStorage !== 'undefined') localStorage.removeItem(LEGACY_SYNC_KEY);
    } catch {
      this.storageError.set('El navegador no permite leer tus datos guardados. Los cambios de esta sesión podrían perderse al cerrar.');
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY) this.reloadFrom(event.newValue); });
    }
  }

  updateProfile(patch: Partial<Profile>): boolean {
    const current = this.profile();
    const validated = validateProfile({
      name: patch.name ?? current.name, goal: patch.goal ?? current.goal,
      level: patch.level ?? current.level, weeklyGoal: patch.weeklyGoal ?? current.weeklyGoal,
      weight: patch.weight === undefined ? current.weight : patch.weight,
    });
    if (!validated) return this.fail('Revisá tu nombre, objetivo y cantidad de entrenamientos semanales.');
    this.profile.set(validated);
    this.persist();
    return true;
  }

  saveRoutine(routine: Routine): boolean {
    const validated = validateRoutine(routine);
    if (!validated) return this.fail('Revisá el nombre y los ejercicios de la rutina. Las series y repeticiones deben ser válidas.');
    const exists = this.routines().some((entry) => entry.id === validated.id);
    if (!exists && this.routines().length >= 200) return this.fail('Alcanzaste el límite de 200 rutinas.');
    this.routines.update((entries) => exists ? entries.map((entry) => entry.id === validated.id ? validated : entry) : [...entries, validated]);
    this.persist();
    return true;
  }

  deleteRoutine(id: string): boolean {
    if (this.routines().length <= 1) return this.fail('Conservá al menos una rutina para entrenar.');
    if (!this.routines().some((routine) => routine.id === id)) return this.fail('No encontramos esa rutina.');
    const next = removeRoutine(this.state(), id);
    this.routines.set(next.routines);
    this.schedule.set(next.schedule);
    this.weeklyPlan.set(next.weeklyPlan);
    this.persist();
    return true;
  }

  /** routineId null = descanso ese día aunque la semana tipo tenga una rutina. */
  scheduleRoutine(date: string, routineId: string | null): boolean {
    if (!parseLocalDate(date) || (routineId !== null && !this.routines().some((routine) => routine.id === routineId))) return this.fail('Elegí una fecha y una rutina válidas.');
    const previous = this.schedule().find((entry) => entry.date === date);
    if (!previous && this.schedule().length >= 5000) return this.fail('Alcanzaste el límite de fechas planificadas.');
    const planned = { id: previous?.id ?? this.id('plan'), date, routineId };
    this.schedule.update((entries) => [...entries.filter((entry) => entry.date !== date), planned].sort((a, b) => a.date.localeCompare(b.date)));
    this.persist();
    return true;
  }

  unschedule(date: string): void {
    this.schedule.update((entries) => entries.filter((entry) => entry.date !== date));
    this.persist();
  }

  /** weekday: 0 = lunes … 6 = domingo; routineId null = descanso. */
  setWeeklyPlan(weekday: number, routineId: string | null): boolean {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6
      || (routineId !== null && !this.routines().some((routine) => routine.id === routineId))) return this.fail('Elegí un día y una rutina válidos.');
    this.weeklyPlan.update((plan) => plan.map((slot, index) => index === weekday ? routineId : slot));
    this.persist();
    return true;
  }

  startWorkout(routineId: string): boolean {
    if (this.activeWorkout()) return this.fail('Ya tenés un entrenamiento en curso. Retomalo o descartalo antes de empezar otro.');
    const routine = this.routines().find((entry) => entry.id === routineId);
    if (!routine) return this.fail('No encontramos esa rutina.');
    this.activeWorkout.set(buildWorkout(routine, this.id('workout'), undefined, this.history()));
    this.persist();
    return true;
  }

  updateSet(index: number, reps: number, weight: number): boolean {
    const workout = this.activeWorkout();
    if (!workout || !Number.isInteger(index) || !workout.sets[index] || !validSetValues(reps, weight)) return this.fail('Ingresá repeticiones enteras de 1 a 999 y un peso entre 0 y 2000 kg.');
    this.activeWorkout.set({ ...workout, sets: workout.sets.map((set, position) => position === index ? { ...set, reps, weight } : set) });
    this.persist();
    return true;
  }

  toggleSet(index: number): boolean {
    const workout = this.activeWorkout();
    if (!workout || !Number.isInteger(index) || !workout.sets[index]) return this.fail('No encontramos esa serie.');
    this.activeWorkout.set({ ...workout, sets: workout.sets.map((set, position) => position === index ? { ...set, completed: !set.completed } : set) });
    this.persist();
    return true;
  }

  /** Adds one more set to an exercise of the session, copying its last set's load and reps. */
  addSet(exerciseId: string): boolean {
    const workout = this.activeWorkout();
    if (!workout) return this.fail('No hay una sesión en curso.');
    const ofExercise = workout.sets.map((set, index) => ({ set, index })).filter(({ set }) => set.exerciseId === exerciseId);
    if (!ofExercise.length) return this.fail('No encontramos ese ejercicio en la sesión.');
    if (ofExercise.length >= 30 || workout.sets.length >= 500) return this.fail('Llegaste al máximo de series para este ejercicio.');
    const last = ofExercise.at(-1)!;
    const added = { ...last.set, setNumber: ofExercise.length + 1, completed: false };
    const sets = [...workout.sets.slice(0, last.index + 1), added, ...workout.sets.slice(last.index + 1)];
    this.activeWorkout.set({ ...workout, sets });
    this.persist();
    return true;
  }

  /** Removes a set and renumbers the rest of that exercise. The session keeps at least one set. */
  removeSet(index: number): boolean {
    const workout = this.activeWorkout();
    if (!workout || !Number.isInteger(index) || !workout.sets[index]) return this.fail('No encontramos esa serie.');
    if (workout.sets.length <= 1) return this.fail('La sesión necesita al menos una serie.');
    const exerciseId = workout.sets[index].exerciseId;
    let number = 0;
    const sets = workout.sets.filter((_, position) => position !== index)
      .map((set) => set.exerciseId === exerciseId ? { ...set, setNumber: ++number } : set);
    this.activeWorkout.set({ ...workout, sets });
    this.persist();
    return true;
  }

  /** Free-text notes for the session in progress (kept when it is saved). */
  setNotes(notes: string): boolean {
    const workout = this.activeWorkout();
    if (!workout) return this.fail('No hay una sesión en curso.');
    if (notes.length > 4000) return this.fail('Las notas pueden tener hasta 4.000 caracteres.');
    const { notes: _previous, ...rest } = workout;
    this.activeWorkout.set(notes.trim() ? { ...rest, notes } : rest);
    this.persist();
    return true;
  }

  finishWorkout(): Workout | null {
    if (this.history().length >= 10_000) {
      this.fail('Alcanzaste el límite de entrenamientos guardados. Exportá una copia de tus datos.');
      return null;
    }
    const active = this.activeWorkout();
    const completed = active ? completeWorkout(active) : null;
    if (!completed) {
      this.fail('Completá al menos una serie para guardar el entrenamiento.');
      return null;
    }
    this.history.update((entries) => [completed, ...entries]);
    this.activeWorkout.set(null);
    this.persist();
    return completed;
  }

  discardWorkout(): void {
    this.activeWorkout.set(null);
    this.persist();
  }

  addWeight(value: number, date = localDate()): boolean {
    if (!Number.isFinite(value) || value < 1 || value > 500 || !parseLocalDate(date)) return this.fail('Ingresá un peso entre 1 y 500 kg y una fecha válida.');
    const previous = this.weights().find((entry) => entry.date === date);
    if (!previous && this.weights().length >= 10_000) return this.fail('Alcanzaste el límite de registros de peso.');
    this.weights.update((entries) => [...entries.filter((entry) => entry.date !== date), { id: previous?.id ?? this.id('weight'), date, weight: value }].sort((a, b) => a.date.localeCompare(b.date)));
    const latest = this.weights().at(-1);
    if (latest) this.profile.update((profile) => ({ ...profile, weight: latest.weight }));
    this.persist();
    return true;
  }

  exportJson(): string {
    return serializeState(this.state());
  }

  importJson(json: string): boolean {
    const validated = deserializeState(json);
    if (!validated) return this.fail('La copia de seguridad no tiene un formato FitApp válido. Tus datos actuales siguen intactos.');
    this.applyState(validated);
    this.persist();
    return true;
  }

  /** Called after every user change is persisted locally (not for replaceState). Used by SyncService. */
  onChange: (() => void) | null = null;
  /** Called when another tab changed the stored data and this tab reloaded it. */
  onExternalChange: (() => void) | null = null;

  /** Current data as a FitAppState v1 snapshot. */
  snapshot(): FitAppState {
    return this.state();
  }

  /**
   * Sync bookkeeping lives in the same localStorage entry as the data, so both are written in one
   * setItem: they can never disagree after a quota error or a crash between two writes.
   */
  syncMeta(): SyncMeta | null {
    return this.sync ? { ...this.sync } : null;
  }

  setSyncMeta(meta: SyncMeta | null): void {
    this.sync = meta ? { ...meta } : null;
    this.persist(false);
  }

  /** Applies data that already lives on the server (or a reset) together with its sync metadata, in one write. */
  replaceState(state: unknown, meta: SyncMeta | null): boolean {
    const validated = validateState(state);
    if (!validated) return this.fail('Los datos de tu cuenta no tienen un formato válido. Tus datos locales siguen intactos.');
    this.applyState(validated);
    this.sync = meta ? { ...meta } : null;
    this.persist(false);
    return true;
  }

  /** Another tab wrote STORAGE_KEY: adopt its data and metadata without writing back. */
  private reloadFrom(raw: string | null): void {
    if (raw === null) return;
    const parsed = parseStored(raw);
    if (!parsed) return;
    this.applyState(parsed.state);
    this.sync = parsed.sync;
    this.onExternalChange?.();
  }

  private state(): FitAppState {
    return {
      version: 2, profile: this.profile(), routines: this.routines(), history: this.history(),
      schedule: this.schedule(), weeklyPlan: this.weeklyPlan(), weights: this.weights(), activeWorkout: this.activeWorkout(),
    };
  }

  private applyState(state: FitAppState): void {
    this.profile.set(state.profile);
    this.routines.set(state.routines);
    this.history.set(state.history);
    this.schedule.set(state.schedule);
    this.weeklyPlan.set(state.weeklyPlan);
    this.weights.set(state.weights);
    this.activeWorkout.set(state.activeWorkout);
  }

  /** notify = a user change: it is marked pending for sync in the same write. */
  private persist(notify = true): void {
    this.actionError.set(null);
    if (notify && this.sync && !this.sync.dirty) this.sync = { ...this.sync, dirty: true };
    try {
      if (typeof localStorage === 'undefined') throw new Error('Storage unavailable');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sync ? { ...this.state(), sync: this.sync } : this.state()));
      this.storageError.set(null);
    } catch {
      this.storageError.set('No se pudieron guardar los cambios en este navegador. Exportá una copia antes de cerrar la página.');
    }
    if (notify) this.onChange?.();
  }

  private fail(message: string): false {
    this.actionError.set(message);
    return false;
  }

  private id(prefix: string): string {
    const unique = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${unique}`;
  }
}
