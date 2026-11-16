import { computed, Injectable, signal } from '@angular/core';
import type { Profile, Routine, ScheduledWorkout, WeightRecord, Workout } from './models';
import { seedExercises } from './seed';
import {
  buildWorkout, completeWorkout, createInitialState, deserializeState, FitAppState,
  localDate, parseLocalDate, removeRoutine, serializeState, STORAGE_KEY,
  validateProfile, validateRoutine, validSetValues, weekDates,
} from './workout-utils';

@Injectable({ providedIn: 'root' })
export class WorkoutStore {
  readonly profile = signal<Profile>(createInitialState().profile);
  readonly routines = signal<Routine[]>(createInitialState().routines);
  readonly exercises = signal(seedExercises);
  readonly history = signal<Workout[]>([]);
  readonly schedule = signal<ScheduledWorkout[]>([]);
  readonly weights = signal<WeightRecord[]>([]);
  readonly activeWorkout = signal<Workout | null>(null);
  readonly storageError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly completedThisWeek = computed(() => {
    const dates = new Set(weekDates());
    return this.history().filter((workout) => workout.finishedAt && dates.has(localDate(new Date(workout.finishedAt)))).length;
  });

  constructor() {
    try {
      const saved = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const restored = deserializeState(saved);
        if (restored) this.applyState(restored);
        else this.storageError.set('No pudimos recuperar los datos guardados: el archivo local no es válido. Podés importar una copia de seguridad.');
      }
    } catch {
      this.storageError.set('El navegador no permite leer tus datos guardados. Los cambios de esta sesión podrían perderse al cerrar.');
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
    this.persist();
    return true;
  }

  scheduleRoutine(date: string, routineId: string): boolean {
    if (!parseLocalDate(date) || !this.routines().some((routine) => routine.id === routineId)) return this.fail('Elegí una fecha y una rutina válidas.');
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

  startWorkout(routineId: string): boolean {
    if (this.activeWorkout()) return this.fail('Ya tenés un entrenamiento en curso. Retomalo o descartalo antes de empezar otro.');
    const routine = this.routines().find((entry) => entry.id === routineId);
    if (!routine) return this.fail('No encontramos esa rutina.');
    this.activeWorkout.set(buildWorkout(routine, this.id('workout')));
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

  private state(): FitAppState {
    return {
      version: 1, profile: this.profile(), routines: this.routines(), history: this.history(),
      schedule: this.schedule(), weights: this.weights(), activeWorkout: this.activeWorkout(),
    };
  }

  private applyState(state: FitAppState): void {
    this.profile.set(state.profile);
    this.routines.set(state.routines);
    this.history.set(state.history);
    this.schedule.set(state.schedule);
    this.weights.set(state.weights);
    this.activeWorkout.set(state.activeWorkout);
  }

  private persist(): void {
    this.actionError.set(null);
    try {
      if (typeof localStorage === 'undefined') throw new Error('Storage unavailable');
      localStorage.setItem(STORAGE_KEY, this.exportJson());
      this.storageError.set(null);
    } catch {
      this.storageError.set('No se pudieron guardar los cambios en este navegador. Exportá una copia antes de cerrar la página.');
    }
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
