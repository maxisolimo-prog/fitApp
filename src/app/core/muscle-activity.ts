import type { Exercise, MuscleId, Workout } from './models';
import { MUSCLE_IDS, MUSCLE_LABELS } from './muscles';
import { localDate } from './workout-utils';

/** Participación en series registradas, no intensidad, recuperación ni porcentaje de esfuerzo. */
export function muscleActivity(history: readonly Workout[], dates: readonly string[], catalog: readonly Exercise[]) {
  const counts = new Map<MuscleId, { primary: number; secondary: number }>();
  const exercises = new Map(catalog.map(exercise => [exercise.id, exercise]));
  let sessions = 0, sets = 0;
  for (const workout of history) {
    if (!workout.finishedAt || !Number.isFinite(Date.parse(workout.finishedAt)) || !dates.includes(localDate(new Date(workout.finishedAt)))) continue;
    let included = false;
    for (const set of workout.sets) {
      const exercise = exercises.get(set.exerciseId);
      if (!set.completed || !exercise) continue;
      included = true;
      sets++;
      for (const role of ['primary', 'secondary'] as const) {
        for (const muscle of new Set(exercise[role === 'primary' ? 'primaryMuscles' : 'secondaryMuscles'])) {
          const count = counts.get(muscle) ?? { primary: 0, secondary: 0 };
          count[role]++;
          counts.set(muscle, count);
        }
      }
    }
    if (included) sessions++;
  }
  const rows = MUSCLE_IDS.filter(id => counts.has(id)).map(id => ({ id, name: MUSCLE_LABELS[id], ...counts.get(id)! }));
  return { sessions, sets, rows,
    primary: rows.filter(row => row.primary > 0).map(row => row.id),
    secondary: rows.filter(row => row.primary === 0 && row.secondary > 0).map(row => row.id),
  };
}
