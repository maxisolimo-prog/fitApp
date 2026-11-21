import assert from 'node:assert/strict';
import test from 'node:test';
import { seedExercises } from '../src/app/core/seed';
import { replaceRoutineExercise, canUndoRoutineReplacement, undoRoutineReplacement } from '../src/app/core/routine-replacement';

const bench = { exerciseId: 'bench-press', sets: 4, reps: 8, weight: 40, restSeconds: 120 };
const cardio = { exerciseId: 'treadmill', sets: 1, reps: 0, weight: 0, restSeconds: 30, durationSeconds: 1225 };

test('reemplazar conserva el objetivo, posición y descanso; no transfiere carga ni modifica el original', () => {
  const original = [bench, cardio];
  const next = replaceRoutineExercise(original, 'bench-press', 'incline-press', seedExercises)!;
  assert.deepEqual(next, [{ ...bench, exerciseId: 'incline-press', weight: 0 }, cardio]);
  next[1].sets = 2;
  assert.equal(cardio.sets, 1);
  assert.equal(bench.exerciseId, 'bench-press');
  assert.equal(bench.weight, 40);
});

test('reemplazar rechaza duplicados, el mismo ejercicio, otro movimiento y referencias inexistentes', () => {
  for (const target of ['bench-press', 'treadmill', 'no-existe']) {
    assert.equal(replaceRoutineExercise([bench], 'bench-press', target, seedExercises), null);
  }
  assert.equal(replaceRoutineExercise([bench, { ...bench, exerciseId: 'incline-press' }], 'bench-press', 'incline-press', seedExercises), null);
  assert.equal(replaceRoutineExercise([bench], 'no-existe', 'incline-press', seedExercises), null);
});

test('cambiar cardio conserva exactamente el tiempo y no introduce repeticiones ni kilos', () => {
  assert.deepEqual(replaceRoutineExercise([cardio], 'treadmill', 'stair-climber', seedExercises), [{ ...cardio, exerciseId: 'stair-climber' }]);
});

test('deshacer restaura la carga original incluso después de mover filas y editar otro ejercicio', () => {
  const next = replaceRoutineExercise([bench, cardio], 'bench-press', 'incline-press', seedExercises)!;
  const undo = { before: { ...bench }, after: { ...next[0] } };
  const reordered = [{ ...next[1], sets: 2 }, next[0]];
  assert.equal(canUndoRoutineReplacement(reordered, undo), true);
  assert.deepEqual(undoRoutineReplacement(reordered, undo), [{ ...cardio, sets: 2 }, bench]);
});

test('deshacer no pisa nuevas ediciones, no revive una fila borrada ni duplica el original', () => {
  const next = replaceRoutineExercise([bench], 'bench-press', 'incline-press', seedExercises)!;
  const undo = { before: bench, after: { ...next[0] } };
  for (const entries of [[], [{ ...next[0], reps: 12 }], [...next, bench]]) {
    assert.equal(canUndoRoutineReplacement(entries, undo), false);
    assert.equal(undoRoutineReplacement(entries, undo), null);
  }
});
