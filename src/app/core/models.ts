/** Pure domain contracts shared by the UI, local storage and future API. */
export type FitnessLevel = 'Principiante' | 'Intermedio' | 'Avanzado';
export type RoutineCategory = 'Fuerza' | 'Movilidad' | 'Resistencia';

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  instructions: string[];
  image?: string;
}

export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  /** Kilograms; 0 means bodyweight or no external load. */
  weight: number;
  restSeconds: number;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  category: RoutineCategory;
  /** Estimated session length in minutes. */
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
}

export interface Profile {
  name: string;
  goal: string;
  level: FitnessLevel;
  weeklyGoal: number;
  /** Kilograms; null until the user chooses to enter a value. */
  weight: number | null;
}

export interface ScheduledWorkout {
  id: string;
  /** Local calendar date, YYYY-MM-DD; do not convert through UTC. */
  date: string;
  routineId: string;
}

export interface WeightRecord {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  weight: number;
}
