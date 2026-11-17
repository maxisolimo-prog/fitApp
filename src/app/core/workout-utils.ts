import type {
  FitnessLevel, Profile, Routine, RoutineCategory, ScheduledWorkout, TrainingFocus, TrainingPlace, WeeklyPlan,
  WeightRecord, Workout, WorkoutSet,
} from './models';
import { defaultProfile, seedExercises, seedRoutines } from './seed';

export const STORAGE_KEY = 'fitapp-state-v1';

/** Current format. v1 had no weeklyPlan, v2 no profile focus/place; validateState upgrades both. */
export interface FitAppState {
  version: 3;
  profile: Profile;
  routines: Routine[];
  history: Workout[];
  /** One-off plans for a specific date; they take precedence over weeklyPlan. */
  schedule: ScheduledWorkout[];
  /** Repeating plan: index 0 = lunes … 6 = domingo; null = descanso. */
  weeklyPlan: WeeklyPlan;
  weights: WeightRecord[];
  activeWorkout: Workout | null;
}

const levels: FitnessLevel[] = ['Principiante', 'Intermedio', 'Avanzado'];
const categories: RoutineCategory[] = ['Fuerza', 'Movilidad', 'Resistencia'];
const exerciseIds = new Set(seedExercises.map((exercise) => exercise.id));

/** Calendar helpers deliberately use local dates, never UTC slicing. */
export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2200) return null;
  const result = new Date(year, month - 1, day, 12);
  return result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day ? result : null;
}

export function startOfWeek(value = new Date()): Date {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
  result.setDate(result.getDate() - (result.getDay() + 6) % 7);
  return result;
}

export function weekDates(value = new Date()): string[] {
  const monday = startOfWeek(value);
  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + offset);
    return localDate(day);
  });
}

export function workoutVolume(workout: Pick<Workout, 'sets'>): number {
  return workout.sets.reduce((total, set) => total + (set.completed ? set.reps * set.weight : 0), 0);
}

export function workoutDurationMinutes(workout: Pick<Workout, 'startedAt' | 'finishedAt'>): number {
  const end = workout.finishedAt ? Date.parse(workout.finishedAt) : Date.now();
  const difference = end - Date.parse(workout.startedAt);
  return Number.isFinite(difference) ? Math.max(0, Math.round(difference / 60_000)) : 0;
}

export function emptyWeeklyPlan(): WeeklyPlan {
  return [null, null, null, null, null, null, null];
}

/** 0 = lunes … 6 = domingo, for a local YYYY-MM-DD date. */
export function weekdayIndex(date: string): number {
  const parsed = parseLocalDate(date);
  return parsed ? (parsed.getDay() + 6) % 7 : 0;
}

/** What is planned for a date: a one-off plan wins over the weekly plan. */
export function plannedRoutineId(state: Pick<FitAppState, 'schedule' | 'weeklyPlan'>, date: string): string | null {
  const oneOff = state.schedule.find((entry) => entry.date === date);
  return oneOff ? oneOff.routineId : state.weeklyPlan[weekdayIndex(date)] ?? null;
}

export function createInitialState(): FitAppState {
  return {
    version: 3,
    profile: { ...defaultProfile },
    routines: seedRoutines.map((routine) => ({ ...routine, exercises: routine.exercises.map((exercise) => ({ ...exercise })) })),
    history: [],
    schedule: [],
    weeklyPlan: emptyWeeklyPlan(),
    weights: [],
    activeWorkout: null,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0);
}

function number(value: unknown, min: number, max: number, integer = false): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
}

function timestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  // 1970–9999: what the API's DATETIME column stores; anything else is not a real session.
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= 0 && time < Date.UTC(10000, 0, 1);
}

function uniqueIds(values: { id: string }[]): boolean {
  return new Set(values.map((value) => value.id)).size === values.length;
}

export function validSetValues(reps: unknown, weight: unknown): boolean {
  return number(reps, 1, 999, true) && number(weight, 0, 2000);
}

export const focuses: TrainingFocus[] = ['fuerza', 'musculo', 'grasa', 'salud'];
export const places: TrainingPlace[] = ['gimnasio', 'casa-pesas', 'casa-sin-equipo'];

/** focus and place arrived in v3: when missing (older data) they take the defaults; when present they must be valid. */
export function validateProfile(value: unknown): Profile | null {
  if (!record(value) || !text(value['name'], 80) || !text(value['goal'], 200)
    || !levels.includes(value['level'] as FitnessLevel) || !number(value['weeklyGoal'], 1, 7, true)
    || !(value['weight'] === null || number(value['weight'], 1, 500))
    || (value['focus'] !== undefined && !focuses.includes(value['focus'] as TrainingFocus))
    || (value['place'] !== undefined && !places.includes(value['place'] as TrainingPlace))) return null;
  return {
    name: value['name'].trim(), goal: value['goal'].trim(), level: value['level'] as FitnessLevel,
    weeklyGoal: value['weeklyGoal'], weight: value['weight'] as number | null,
    focus: (value['focus'] as TrainingFocus | undefined) ?? defaultProfile.focus,
    place: (value['place'] as TrainingPlace | undefined) ?? defaultProfile.place,
  };
}

export function validateRoutine(value: unknown): Routine | null {
  if (!record(value) || !text(value['id'], 100) || !text(value['name'], 100)
    || !text(value['description'], 2000, true) || !categories.includes(value['category'] as RoutineCategory)
    || !levels.includes(value['level'] as FitnessLevel) || !number(value['duration'], 1, 600, true)
    || !Array.isArray(value['exercises']) || value['exercises'].length < 1 || value['exercises'].length > 50
    || (value['custom'] !== undefined && typeof value['custom'] !== 'boolean')) return null;
  const exercises: Routine['exercises'] = [];
  for (const candidate of value['exercises']) {
    if (!record(candidate) || !text(candidate['exerciseId'], 100) || !exerciseIds.has(candidate['exerciseId'])
      || !number(candidate['sets'], 1, 30, true) || !validSetValues(candidate['reps'], candidate['weight'])
      || !number(candidate['restSeconds'], 0, 3600, true)) return null;
    exercises.push({
      exerciseId: candidate['exerciseId'], sets: candidate['sets'], reps: candidate['reps'] as number,
      weight: candidate['weight'] as number, restSeconds: candidate['restSeconds'],
    });
  }
  if (exercises.reduce((sum, exercise) => sum + exercise.sets, 0) > 500
    || new Set(exercises.map(e => e.exerciseId)).size !== exercises.length) return null;
  return {
    id: value['id'], name: value['name'].trim(), description: value['description'].trim(),
    category: value['category'] as RoutineCategory, duration: value['duration'],
    level: value['level'] as FitnessLevel, exercises,
    ...(value['custom'] === undefined ? {} : { custom: value['custom'] as boolean }),
  };
}

export function validateWorkout(value: unknown, active: boolean): Workout | null {
  if (!record(value) || !text(value['id'], 100) || !text(value['routineId'], 100)
    || !text(value['routineName'], 100) || !timestamp(value['startedAt'])
    || (active ? value['finishedAt'] !== null : !timestamp(value['finishedAt']))
    || !Array.isArray(value['sets']) || value['sets'].length < 1 || value['sets'].length > 500
    || (value['notes'] !== undefined && !text(value['notes'], 4000, true))) return null;
  if (!active && Date.parse(value['finishedAt'] as string) < Date.parse(value['startedAt'])) return null;
  const sets: WorkoutSet[] = [];
  for (const candidate of value['sets']) {
    if (!record(candidate) || !text(candidate['exerciseId'], 100) || !exerciseIds.has(candidate['exerciseId']) || !text(candidate['exerciseName'], 100)
      || !number(candidate['setNumber'], 1, 30, true) || !validSetValues(candidate['reps'], candidate['weight'])
      || typeof candidate['completed'] !== 'boolean' || (!active && !candidate['completed'])) return null;
    sets.push({
      exerciseId: candidate['exerciseId'], exerciseName: candidate['exerciseName'],
      setNumber: candidate['setNumber'], reps: candidate['reps'] as number,
      weight: candidate['weight'] as number, completed: candidate['completed'],
    });
  }
  return {
    id: value['id'], routineId: value['routineId'], routineName: value['routineName'],
    // Canonical ISO form (UTC, milliseconds): the same value the API returns, so copies compare equal.
    startedAt: new Date(value['startedAt']).toISOString(),
    finishedAt: value['finishedAt'] === null ? null : new Date(value['finishedAt'] as string).toISOString(), sets,
    ...(value['notes'] === undefined ? {} : { notes: value['notes'] as string }),
  };
}

/** Strictly reconstruct known fields: imported objects are never assigned to app state. */
export function validateState(value: unknown): FitAppState | null {
  if (!record(value) || ![1, 2, 3].includes(value['version'] as number) || !Array.isArray(value['routines'])
    || !Array.isArray(value['history']) || !Array.isArray(value['schedule']) || !Array.isArray(value['weights'])
    || value['routines'].length < 1 || value['routines'].length > 200 || value['history'].length > 10_000
    || value['schedule'].length > 5000 || value['weights'].length > 10_000) return null;
  const profile = validateProfile(value['profile']);
  if (!profile) return null;
  const routines: Routine[] = [];
  for (const candidate of value['routines']) {
    const routine = validateRoutine(candidate);
    if (!routine) return null;
    routines.push(routine);
  }
  const history: Workout[] = [];
  for (const candidate of value['history']) {
    const workout = validateWorkout(candidate, false);
    if (!workout) return null;
    history.push(workout);
  }
  const schedule: ScheduledWorkout[] = [];
  for (const candidate of value['schedule']) {
    if (!record(candidate) || !text(candidate['id'], 100) || !text(candidate['date'], 10)
      || !parseLocalDate(candidate['date']) || !(candidate['routineId'] === null || text(candidate['routineId'], 100))) return null;
    schedule.push({ id: candidate['id'], date: candidate['date'], routineId: candidate['routineId'] as string | null });
  }
  const weights: WeightRecord[] = [];
  for (const candidate of value['weights']) {
    if (!record(candidate) || !text(candidate['id'], 100) || !text(candidate['date'], 10)
      || !parseLocalDate(candidate['date']) || !number(candidate['weight'], 1, 500)) return null;
    weights.push({ id: candidate['id'], date: candidate['date'], weight: candidate['weight'] });
  }
  // v1 had no weekly plan; from v2 on it has exactly seven slots.
  let weeklyPlan = emptyWeeklyPlan();
  if (value['version'] !== 1) {
    const plan = value['weeklyPlan'];
    if (!Array.isArray(plan) || plan.length !== 7 || !plan.every((slot) => slot === null || text(slot, 100))) return null;
    weeklyPlan = plan.map((slot) => slot as string | null);
  }
  const activeWorkout = value['activeWorkout'] === null ? null : validateWorkout(value['activeWorkout'], true);
  if (value['activeWorkout'] !== null && !activeWorkout) return null;
  if (![routines, history, schedule, weights].every(uniqueIds)
    || new Set(schedule.map((entry) => entry.date)).size !== schedule.length
    || new Set(weights.map((entry) => entry.date)).size !== weights.length
    || (activeWorkout && history.some((workout) => workout.id === activeWorkout.id))) return null;
  // Calendar and weights are kept in date order everywhere (store and API).
  schedule.sort((a, b) => a.date.localeCompare(b.date));
  weights.sort((a, b) => a.date.localeCompare(b.date));
  return { version: 3, profile, routines, history, schedule, weeklyPlan, weights, activeWorkout };
}

export function serializeState(value: FitAppState): string {
  return JSON.stringify(value, null, 2);
}

export function deserializeState(value: string): FitAppState | null {
  if (value.length > 20_000_000) return null;
  try { return validateState(JSON.parse(value)); } catch { return null; }
}

/** Deleting a template leaves completed sessions and past plans intact. */
export function removeRoutine(state: FitAppState, id: string, today = localDate()): FitAppState {
  return {
    ...state,
    routines: state.routines.filter((routine) => routine.id !== id),
    schedule: state.schedule.filter((entry) => entry.routineId !== id || entry.date < today),
    weeklyPlan: state.weeklyPlan.map((slot) => slot === id ? null : slot),
  };
}

/**
 * Completed sets of an exercise in the most recent session that included it (history is newest
 * first). Used to show "Anterior" and to start a new session from real loads instead of zeros.
 */
export function lastSetsFor(history: Workout[], exerciseId: string): WorkoutSet[] {
  for (const workout of history) {
    const sets = workout.sets.filter((set) => set.exerciseId === exerciseId && set.completed);
    if (sets.length) return sets;
  }
  return [];
}

/** A new session copies the routine, prefilled with what was actually lifted last time. */
export function buildWorkout(routine: Routine, id: string, startedAt = new Date().toISOString(), history: Workout[] = []): Workout {
  return {
    id, routineId: routine.id, routineName: routine.name, startedAt, finishedAt: null,
    sets: routine.exercises.flatMap((entry) => {
      const previous = lastSetsFor(history, entry.exerciseId);
      return Array.from({ length: entry.sets }, (_, index) => {
        const last = previous[index] ?? previous.at(-1);
        return {
          exerciseId: entry.exerciseId,
          exerciseName: seedExercises.find((exercise) => exercise.id === entry.exerciseId)?.name ?? entry.exerciseId,
          setNumber: index + 1, reps: last?.reps ?? entry.reps, weight: last?.weight ?? entry.weight, completed: false,
        };
      });
    }),
  };
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  previous: number;
}

/**
 * Heaviest completed set per exercise that beats every earlier session. Only exercises with a
 * real previous load count: a first time is not presented as a record.
 */
export function personalRecords(workout: Workout, earlier: Workout[]): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  for (const exerciseId of new Set(workout.sets.map((set) => set.exerciseId))) {
    const best = workout.sets.filter((set) => set.exerciseId === exerciseId && set.completed && set.weight > 0)
      .reduce<WorkoutSet | null>((top, set) => !top || set.weight > top.weight || (set.weight === top.weight && set.reps > top.reps) ? set : top, null);
    if (!best) continue;
    const previous = earlier.flatMap((w) => w.sets).filter((set) => set.exerciseId === exerciseId && set.completed)
      .reduce((top, set) => Math.max(top, set.weight), 0);
    if (previous > 0 && best.weight > previous) {
      records.push({ exerciseId, exerciseName: best.exerciseName, weight: best.weight, reps: best.reps, previous });
    }
  }
  return records;
}

/** Plain-text summary to share (WhatsApp, etc.). Only real numbers from the session. */
export function workoutSummaryText(workout: Workout, records: PersonalRecord[]): string {
  const format = (value: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value);
  const volume = workoutVolume(workout);
  const lines = [
    `Terminé "${workout.routineName}" en FitApp`,
    `${workoutDurationMinutes(workout)} min · ${workout.sets.length} ${workout.sets.length === 1 ? 'serie' : 'series'}${volume > 0 ? ` · ${format(volume)} kg levantados` : ''}`,
    ...records.map((record) => `Récord en ${record.exerciseName}: ${format(record.weight)} kg × ${record.reps} (antes ${format(record.previous)} kg)`),
  ];
  return lines.join('\n');
}

export function completeWorkout(workout: Workout, finishedAt = new Date().toISOString()): Workout | null {
  const sets = workout.sets.filter((set) => set.completed).map((set) => ({ ...set }));
  // A system clock adjustment must not create a session that cannot be restored.
  const safeEnd = Date.parse(finishedAt) < Date.parse(workout.startedAt) ? workout.startedAt : finishedAt;
  return sets.length ? { ...workout, finishedAt: safeEnd, sets } : null;
}

/** Weekdays (0 = lunes) to train for a number of days, spread so rest days fall in between. */
const trainingDays: Record<number, number[]> = {
  1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
};

/**
 * A starting weekly plan from the profile's days and place, using the starter templates. It is a
 * suggestion the user can edit; it never claims to be a personalised prescription.
 */
export function suggestWeeklyPlan(profile: Pick<Profile, 'weeklyGoal' | 'place'>, routines: Pick<Routine, 'id'>[]): WeeklyPlan {
  const has = (id: string) => routines.some((routine) => routine.id === id);
  const days = trainingDays[Math.min(7, Math.max(1, profile.weeklyGoal))];
  let rotation: string[];
  if (profile.place === 'casa-sin-equipo') rotation = ['at-home'];
  else if (profile.place === 'casa-pesas') rotation = ['full-body', 'at-home'];
  else if (days.length <= 2) rotation = ['full-body'];
  else if (days.length === 3) rotation = ['upper-body', 'lower-body', 'full-body'];
  else rotation = ['upper-body', 'lower-body'];
  rotation = rotation.filter(has);
  if (!rotation.length) rotation = routines.slice(0, 1).map((routine) => routine.id);
  const plan = emptyWeeklyPlan();
  days.forEach((weekday, index) => { plan[weekday] = rotation[index % rotation.length] ?? null; });
  return plan;
}

export interface ProgressionSuggestion {
  kind: 'subir' | 'mantener' | 'mas-reps';
  /** Suggested load in kg for 'subir'/'mantener'; reps target for 'mas-reps'. */
  value: number;
  reason: string;
}

/**
 * Double progression from the last session of an exercise: every set at or above the target reps
 * → add load (or a rep for bodyweight); otherwise keep the load. No history → no suggestion.
 */
export function suggestProgression(lastSets: WorkoutSet[], targetReps: number, equipment: string): ProgressionSuggestion | null {
  if (!lastSets.length || !Number.isInteger(targetReps) || targetReps < 1) return null;
  const allReached = lastSets.every((set) => set.reps >= targetReps);
  const load = Math.max(...lastSets.map((set) => set.weight));
  if (load <= 0) {
    if (!allReached) return null;
    return { kind: 'mas-reps', value: targetReps + 1, reason: `Completaste ${targetReps} repeticiones en todas las series: probá una más.` };
  }
  if (!allReached) return { kind: 'mantener', value: load, reason: `La última vez no llegaste a ${targetReps} repeticiones en todas las series: repetí la carga.` };
  const step = /mancuerna/i.test(equipment) ? 2 : 2.5;
  return { kind: 'subir', value: load + step, reason: `Completaste todas las series con ${new Intl.NumberFormat('es-AR').format(load)} kg: probá subir ${new Intl.NumberFormat('es-AR').format(step)} kg.` };
}
