import type { Exercise, RoutineExercise } from './models';

/** Reemplazo dentro de un borrador: mismo movimiento, sin duplicados ni cargas heredadas. */
export function replaceRoutineExercise(entries: readonly RoutineExercise[], fromId: string, toId: string, catalog: readonly Exercise[]): RoutineExercise[] | null {
  const source = catalog.find(exercise => exercise.id === fromId);
  const target = catalog.find(exercise => exercise.id === toId);
  const entry = entries.find(item => item.exerciseId === fromId);
  if (!source || !target || !entry || fromId === toId || source.movement !== target.movement || entries.some(item => item.exerciseId === toId)) return null;
  // El mismo movimiento conserva el objetivo. Una variante que exige tiempo no puede heredar repeticiones.
  const replacement: RoutineExercise = { ...entry, exerciseId: toId, weight: 0 };
  if (target.tracking === 'duration' && replacement.durationSeconds === undefined) {
    replacement.reps = 0;
    replacement.durationSeconds = 1200;
  }
  return entries.map(item => item.exerciseId === fromId ? replacement : { ...item });
}

export interface RoutineReplacementUndo {
  before: RoutineExercise;
  after: RoutineExercise;
}

/** Deshacer afecta solo esa fila y solo si sus valores siguen como quedaron al cambiarla. */
export function canUndoRoutineReplacement(entries: readonly RoutineExercise[], undo: RoutineReplacementUndo): boolean {
  const current = entries.find(entry => entry.exerciseId === undo.after.exerciseId);
  return !!current && !entries.some(entry => entry.exerciseId === undo.before.exerciseId)
    && current.sets === undo.after.sets && current.reps === undo.after.reps && current.weight === undo.after.weight
    && current.restSeconds === undo.after.restSeconds && current.durationSeconds === undo.after.durationSeconds;
}

export function undoRoutineReplacement(entries: readonly RoutineExercise[], undo: RoutineReplacementUndo): RoutineExercise[] | null {
  if (!canUndoRoutineReplacement(entries, undo)) return null;
  return entries.map(entry => ({ ...(entry.exerciseId === undo.after.exerciseId ? undo.before : entry) }));
}
