/** Pure domain contracts shared by the UI, local storage and future API. */
export type FitnessLevel = 'Principiante' | 'Intermedio' | 'Avanzado';
export type RoutineCategory = 'Fuerza' | 'Movilidad' | 'Resistencia';

/** Zonas que el mapa muscular puede dibujar. Nombres y orden en `muscles.ts`. */
export type MuscleId =
  | 'trapezius' | 'deltoids' | 'chest' | 'upper-back' | 'lower-back' | 'biceps' | 'triceps' | 'forearm'
  | 'abs' | 'obliques' | 'gluteal' | 'quadriceps' | 'hamstring' | 'adductors' | 'calves' | 'tibialis';

/** Patrón de movimiento: dos ejercicios con el mismo patrón se pueden reemplazar entre sí. Nombres en `movements.ts`. */
export type MovementId =
  | 'press-pecho' | 'apertura-pecho' | 'remo' | 'traccion-vertical' | 'press-hombros' | 'elevacion-lateral'
  | 'hombro-posterior' | 'curl-biceps' | 'extension-triceps' | 'sentadilla' | 'zancada' | 'bisagra-cadera'
  | 'extension-cadera' | 'abduccion-cadera' | 'extension-rodilla' | 'flexion-rodilla' | 'gemelos' | 'flexion-tronco'
  | 'estabilidad-tronco' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  /** Grupo para filtros y listas ("Pecho", "Piernas"). El detalle por músculo está en los dos campos siguientes. */
  muscle: string;
  equipment: string;
  /** Patrón de movimiento, para proponer reemplazos durante la sesión. */
  movement: MovementId;
  /** Músculos que hacen el trabajo principal. Al menos uno. */
  primaryMuscles: MuscleId[];
  /** Músculos que ayudan a mover. Puede estar vacío. */
  secondaryMuscles: MuscleId[];
  instructions: string[];
  image?: string;
  /** Cardio se registra siempre por tiempo. Otros ejercicios permiten elegir en el editor. */
  tracking?: 'duration';
}

export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  /** Kilograms; 0 means bodyweight or no external load. */
  weight: number;
  restSeconds: number;
  /** Tiempo por serie en segundos. Si está presente, reps y weight son 0. */
  durationSeconds?: number;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  category: RoutineCategory;
  /** Minutos estimados, guardados al editar. Las pantallas muestran `estimateRoutineMinutes`, que se calcula con las series y los descansos. */
  duration: number;
  level: FitnessLevel;
  exercises: RoutineExercise[];
  custom?: boolean;
}

export interface WorkoutSet {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
  /** Duración realizada; ausente en series por repeticiones, incluso en datos antiguos. */
  durationSeconds?: number;
  /**
   * Momento en que se marcó como completada (ISO 8601, v4). Falta en las series pendientes y en las registradas
   * antes de la versión 4: no se inventa.
   */
  completedAt?: string;
  /** Comentario corto del alumno sobre la serie (v4). */
  note?: string;
}

export interface Workout {
  id: string;
  routineId: string;
  routineName: string;
  /** ISO 8601 timestamp. */
  startedAt: string;
  /** null while a workout is in progress. */
  finishedAt: string | null;
  sets: WorkoutSet[];
  notes?: string;
  /** Solo las sesiones iniciadas desde el programa hacen avanzar su secuencia. */
  programStep?: { programId: string; position: number };
}

export interface TrainingProgram {
  id: string;
  name: string;
  /** Orden explícito. Una rutina puede repetirse en distintos pasos. */
  routineIds: string[];
  /** Próxima sesión; length significa programa completado. */
  position: number;
  paused: boolean;
}

export type TrainingFocus = 'fuerza' | 'musculo' | 'grasa' | 'salud';
export type TrainingPlace = 'gimnasio' | 'casa-pesas' | 'casa-sin-equipo';

export interface Profile {
  name: string;
  /** Free-text personal goal, in the user's words. */
  goal: string;
  level: FitnessLevel;
  /** Training days per week (1–7). */
  weeklyGoal: number;
  /** Kilograms; null until the user chooses to enter a value. */
  weight: number | null;
  /** Main focus, used for suggestions (v3). */
  focus: TrainingFocus;
  /** Where the user trains, used to suggest routines (v3). */
  place: TrainingPlace;
}

/** Repeating weekly plan: index 0 = lunes … 6 = domingo; each slot is a routine id or null (descanso). */
export type WeeklyPlan = (string | null)[];

export interface ScheduledWorkout {
  id: string;
  /** Local calendar date, YYYY-MM-DD; do not convert through UTC. */
  date: string;
  /** null = descanso ese día aunque la semana tipo tenga una rutina. */
  routineId: string | null;
}

export interface WeightRecord {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  weight: number;
}
