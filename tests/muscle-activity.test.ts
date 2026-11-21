import assert from 'node:assert/strict';
import test from 'node:test';
import { muscleActivity } from '../src/app/core/muscle-activity';
import { seedExercises } from '../src/app/core/seed';
import { buildWorkout, createInitialState, localDate } from '../src/app/core/workout-utils';

test('mapa semanal usa solo sesiones finalizadas y series completas del período local', () => {
  const workout = buildWorkout(createInitialState().routines[0], 'week');
  workout.finishedAt = new Date(2026, 10, 20, 23, 59).toISOString();
  const day = localDate(new Date(workout.finishedAt));
  workout.sets = [{ exerciseId: 'bench-press', exerciseName: 'Press', setNumber: 1, reps: 10, weight: 20, completed: true },
    { exerciseId: 'seated-row', exerciseName: 'Remo', setNumber: 1, reps: 10, weight: 20, completed: false }];
  const activity = muscleActivity([workout, { ...workout, finishedAt: null }], [day], seedExercises);
  assert.equal(activity.sessions, 1);
  assert.equal(activity.sets, 1);
  assert.deepEqual(activity.primary, ['chest']);
  assert.deepEqual(activity.secondary, ['deltoids', 'triceps']);
  assert.equal(activity.rows.find(row => row.id === 'chest')?.primary, 1);
  assert.equal(muscleActivity([workout], ['2026-11-19'], seedExercises).sets, 0);
  assert.deepEqual(muscleActivity([], [day], seedExercises).primary, []);
});

test('un músculo puede ser principal y apoyo en distintas series, sin duplicarse en el mapa', () => {
  const workout = buildWorkout(createInitialState().routines[0], 'week');
  workout.finishedAt = new Date().toISOString();
  workout.sets = ['bench-press', 'parallel-bar-dip'].map(exerciseId => ({ exerciseId, exerciseName: exerciseId, setNumber: 1, reps: 8, weight: 0, completed: true }));
  const result = muscleActivity([workout], [localDate()], seedExercises);
  assert.deepEqual(result.rows.find(row => row.id === 'chest'), { id: 'chest', name: 'Pecho', primary: 1, secondary: 1 });
  assert.ok(result.primary.includes('chest') && !result.secondary.includes('chest'));
  assert.equal(result.sets, 2);
});
