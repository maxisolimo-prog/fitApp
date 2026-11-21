import type { Routine, TrainingProgram, Workout } from './models';

export function validateProgram(value: unknown, routines: Pick<Routine, 'id'>[]): TrainingProgram | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (typeof p['id'] !== 'string' || !p['id'].trim() || p['id'].length > 100
    || typeof p['name'] !== 'string' || !p['name'].trim() || p['name'].length > 100
    || !Array.isArray(p['routineIds']) || p['routineIds'].length < 1 || p['routineIds'].length > 100
    || !p['routineIds'].every(id => routines.some(r => r.id === id))
    || typeof p['position'] !== 'number' || !Number.isInteger(p['position']) || p['position'] < 0 || p['position'] > p['routineIds'].length
    || typeof p['paused'] !== 'boolean') return null;
  return {id:p['id'],name:p['name'].trim(),routineIds:[...p['routineIds']],position:p['position'],paused:p['paused']};
}

export function advanceProgram(program: TrainingProgram | null, workout: Workout): TrainingProgram | null {
  const step = workout.programStep;
  if (!program || !step || !workout.finishedAt || !workout.sets.some(s => s.completed)
    || step.programId !== program.id || step.position !== program.position
    || program.routineIds[program.position] !== workout.routineId) return program;
  return {...program,position:program.position+1};
}

/** Solo el tramo ya completado fija el avance; las sesiones futuras se pueden reordenar. */
export function canPreserveProgramProgress(program: TrainingProgram, routineIds: string[]): boolean {
  return routineIds.length >= program.position
    && program.routineIds.slice(0, program.position).every((id, index) => routineIds[index] === id);
}
