import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import { WorkoutStore } from '../src/app/core/workout-store';
import {
  buildWorkout, completeWorkout, createInitialState, deserializeState, lastSetsFor, localDate, personalRecords, plannedRoutineId, suggestProgression, suggestWeeklyPlan, workoutSummaryText,
  parseLocalDate, parseSessionSwaps, recordSwap, removeRoutine, serializeState, startOfWeek, substituteExercise, swapOrigin, validateState,
  STORAGE_KEY, validSetValues, weekDates, workoutDurationMinutes, workoutVolume,
} from '../src/app/core/workout-utils';

function withStorage(run: (storage: Storage) => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() { return data.size; },
    clear() { data.clear(); },
    getItem(key) { return data.get(key) ?? null; },
    key(index) { return [...data.keys()][index] ?? null; },
    removeItem(key) { data.delete(key); },
    setItem(key, value) { data.set(key, value); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try { run(storage); } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

test('calendar dates and weeks use the local calendar across a year boundary', () => {
  const sunday = new Date(2027, 0, 3, 23, 59);
  assert.equal(localDate(sunday), '2027-01-03');
  assert.equal(localDate(startOfWeek(sunday)), '2026-12-28');
  assert.deepEqual(weekDates(sunday), [
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
    '2027-01-01', '2027-01-02', '2027-01-03',
  ]);
  assert.equal(parseLocalDate('2026-02-30'), null);
  assert.equal(parseLocalDate('2026-13-01'), null);
  assert.equal(parseLocalDate('2026-1-01'), null);
  assert.equal(localDate(parseLocalDate('2028-02-29')!), '2028-02-29');
});

test('volume counts completed sets and excludes bodyweight and pending sets', () => {
  const workout = buildWorkout(createInitialState().routines[0], 'test');
  workout.sets = [
    { exerciseId: 'bench-press', exerciseName: 'Press', setNumber: 1, reps: 10, weight: 25, completed: true },
    { exerciseId: 'bench-press', exerciseName: 'Press', setNumber: 2, reps: 12, weight: 50, completed: false },
    { exerciseId: 'push-up', exerciseName: 'Flexiones', setNumber: 1, reps: 15, weight: 0, completed: true },
  ];
  assert.equal(workoutVolume(workout), 250);
});

test('new sessions copy templates without marking any set complete', () => {
  const state = createInitialState();
  const routine = state.routines[0];
  const active = buildWorkout(routine, 'active', '2026-11-16T12:00:00.000Z');
  assert.equal(active.sets.length, routine.exercises.reduce((total, entry) => total + entry.sets, 0));
  assert.equal(active.sets.some((entry) => entry.completed), false);
  active.sets[0].weight = 42;
  assert.equal(routine.exercises[0].weight, 0);
  assert.equal(completeWorkout(active), null);
});

test('finishing saves only explicitly completed sets and retains the start timestamp', () => {
  const active = buildWorkout(createInitialState().routines[0], 'active', '2026-11-16T12:00:00.000Z');
  active.sets[0].completed = true;
  const finished = completeWorkout(active, '2026-11-16T12:12:00.000Z')!;
  assert.equal(finished.sets.length, 1);
  assert.equal(finished.startedAt, '2026-11-16T12:00:00.000Z');
  assert.equal(workoutDurationMinutes(finished), 12);
  assert.equal(active.finishedAt, null);
});

test('state round trips with an active session, profile, plan and weight', () => {
  const state = createInitialState();
  state.activeWorkout = buildWorkout(state.routines[0], 'active');
  state.profile.name = 'María';
  state.schedule = [{ id: 'plan', date: '2026-11-16', routineId: state.routines[0].id }];
  state.weights = [{ id: 'weight', date: '2026-11-16', weight: 68.5 }];
  assert.deepEqual(deserializeState(serializeState(state)), state);
  assert.equal(state.history.length, 0);
});

test('corrupt, mismatched or invalid imports are rejected', () => {
  assert.equal(deserializeState('{broken'), null);
  assert.equal(deserializeState('null'), null);
  assert.equal(deserializeState('{}'), null);
  assert.equal(validateState({ ...createInitialState(), version: 4 }), null);
  const invalid = createInitialState();
  invalid.routines[0].exercises[0].weight = Number.NaN;
  assert.equal(validateState(invalid), null);
  const unknown = createInitialState();
  unknown.routines[0].exercises[0].exerciseId = 'missing';
  assert.equal(validateState(unknown), null);
  const duplicate = createInitialState();
  duplicate.schedule = [
    { id: 'a', date: '2026-11-16', routineId: 'upper-body' },
    { id: 'b', date: '2026-11-16', routineId: 'lower-body' },
  ];
  assert.equal(validateState(duplicate), null);
});

test('imports reconstruct known fields and do not carry prototype-like properties', () => {
  const parsed = JSON.parse(serializeState(createInitialState()));
  parsed.profile.__proto__ = { privileged: true };
  parsed.profile.admin = true;
  parsed.untrusted = 'ignored';
  const sanitized = validateState(parsed)!;
  assert.equal(Object.hasOwn(sanitized, 'untrusted'), false);
  assert.equal(Object.hasOwn(sanitized.profile, 'admin'), false);
  assert.equal(Object.hasOwn(sanitized.profile, 'privileged'), false);
  assert.equal(Object.getPrototypeOf(sanitized.profile), Object.prototype);
});

test('deleting a routine preserves history and active work but removes today and future plans', () => {
  const state = createInitialState();
  const routine = state.routines[0];
  const workout = buildWorkout(routine, 'past', '2026-11-15T12:00:00.000Z');
  workout.sets[0].completed = true;
  state.history = [completeWorkout(workout, '2026-11-15T12:20:00.000Z')!];
  state.activeWorkout = buildWorkout(routine, 'active');
  state.schedule = [
    { id: 'past', date: '2026-11-15', routineId: routine.id },
    { id: 'today', date: '2026-11-16', routineId: routine.id },
    { id: 'future', date: '2026-11-17', routineId: routine.id },
    { id: 'other', date: '2026-11-18', routineId: 'lower-body' },
  ];
  const result = removeRoutine(state, routine.id, '2026-11-16');
  assert.equal(result.routines.some((entry) => entry.id === routine.id), false);
  assert.deepEqual(result.history, state.history);
  assert.deepEqual(result.activeWorkout, state.activeWorkout);
  assert.deepEqual(result.schedule.map((entry) => entry.id), ['past', 'other']);
  assert.ok(deserializeState(serializeState(result)));
});

test('set values reject nonfinite, fractional repetitions and invalid bounds', () => {
  assert.equal(validSetValues(8, 22.5), true);
  assert.equal(validSetValues(0, 0), false);
  assert.equal(validSetValues(1, 0), true);
  assert.equal(validSetValues(8.5, 10), false);
  assert.equal(validSetValues(-1, 10), false);
  assert.equal(validSetValues(1000, 10), false);
  assert.equal(validSetValues(8, Infinity), false);
  assert.equal(validSetValues(8, -1), false);
  assert.equal(validSetValues(8, 2001), false);
});

test('store persists an in-progress session, prevents replacing it and restores completed work', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    assert.equal(store.startWorkout('upper-body'), true);
    const activeId = store.activeWorkout()!.id;
    assert.equal(store.updateSet(0, 8, 25), true);
    assert.equal(store.toggleSet(0), true);
    assert.equal(store.startWorkout('lower-body'), false);
    assert.equal(store.activeWorkout()!.id, activeId);
    assert.equal(store.updateSet(0, 8.5, 25), false);

    const restored = new WorkoutStore();
    assert.equal(restored.activeWorkout()!.id, activeId);
    assert.equal(restored.activeWorkout()!.sets[0].reps, 8);
    const saved = restored.finishWorkout()!;
    assert.equal(saved.sets.length, 1);
    assert.equal(workoutVolume(saved), 200);
    assert.equal(restored.activeWorkout(), null);
    assert.equal(new WorkoutStore().history()[0].id, activeId);
  });
});

test('store handles corrupt storage and invalid imports without throwing or mutating current data', () => {
  withStorage((storage) => {
    storage.setItem(STORAGE_KEY, '{broken');
    const store = new WorkoutStore();
    assert.ok(store.storageError());
    assert.equal(store.history().length, 0);
    const before = store.exportJson();
    assert.equal(store.importJson('{"version":1}'), false);
    assert.equal(store.exportJson(), before);
    assert.ok(store.actionError());
    assert.equal(storage.getItem(STORAGE_KEY), '{broken');
  });
});

test('storage failures are visible and calendar/weight updates retain one entry per date', () => {
  withStorage((storage) => {
    const store = new WorkoutStore();
    assert.equal(store.scheduleRoutine('2026-11-16', 'upper-body'), true);
    assert.equal(store.scheduleRoutine('2026-11-16', 'lower-body'), true);
    assert.equal(store.schedule().length, 1);
    assert.equal(store.schedule()[0].routineId, 'lower-body');
    assert.equal(store.addWeight(70, '2026-11-16'), true);
    assert.equal(store.addWeight(71, '2026-11-16'), true);
    assert.equal(store.weights().length, 1);
    assert.equal(store.profile().weight, 71);
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.equal(store.updateProfile({ name: 'María' }), true);
    assert.equal(store.profile().name, 'María');
    assert.ok(store.storageError());
  });
});

test('v1 data (before the weekly plan) upgrades to v3 with every day free', () => {
  const v1 = JSON.parse(serializeState(createInitialState()));
  v1.version = 1;
  delete v1.weeklyPlan;
  const upgraded = validateState(v1)!;
  assert.equal(upgraded.version, 3);
  assert.equal(upgraded.profile.focus, 'fuerza');
  assert.equal(upgraded.profile.place, 'gimnasio');
  assert.deepEqual(upgraded.weeklyPlan, [null, null, null, null, null, null, null]);
});

test('weekly plan must have seven slots of routine ids or null', () => {
  const bad = createInitialState() as unknown as { weeklyPlan: unknown };
  bad.weeklyPlan = ['upper-body'];
  assert.equal(validateState(bad), null);
  bad.weeklyPlan = [1, null, null, null, null, null, null];
  assert.equal(validateState(bad), null);
});

test('a one-off plan wins over the weekly plan; deleting a routine frees its weekdays', () => {
  const state = createInitialState();
  state.weeklyPlan = ['upper-body', null, 'lower-body', null, null, null, null];
  assert.equal(plannedRoutineId(state, '2026-11-16'), 'upper-body', 'lunes');
  assert.equal(plannedRoutineId(state, '2026-11-17'), null, 'martes libre');
  state.schedule = [{ id: 'p', date: '2026-11-16', routineId: 'at-home' }];
  assert.equal(plannedRoutineId(state, '2026-11-16'), 'at-home');
  assert.equal(plannedRoutineId(state, '2026-11-23'), 'upper-body', 'el lunes siguiente vuelve a la semana tipo');
  const removed = removeRoutine(state, 'upper-body', '2026-11-16');
  assert.deepEqual(removed.weeklyPlan, [null, null, 'lower-body', null, null, null, null]);
});

test('store sets weekly plan slots and rejects unknown routines', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    assert.equal(store.setWeeklyPlan(0, 'upper-body'), true);
    assert.equal(store.setWeeklyPlan(7, 'upper-body'), false);
    assert.equal(store.setWeeklyPlan(1, 'no-existe'), false);
    assert.equal(store.setWeeklyPlan(0, null), true);
    assert.equal(store.setWeeklyPlan(2, 'lower-body'), true);
    assert.deepEqual(new WorkoutStore().weeklyPlan(), [null, null, 'lower-body', null, null, null, null]);
  });
});

test('a one-off rest day overrides the weekly plan and survives a round trip', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    store.setWeeklyPlan(0, 'upper-body');
    assert.equal(store.scheduleRoutine('2026-11-16', null), true);
    const state = store.snapshot();
    assert.equal(plannedRoutineId(state, '2026-11-16'), null);
    assert.equal(plannedRoutineId(state, '2026-11-23'), 'upper-body');
    assert.deepEqual(deserializeState(serializeState(state)), state);
  });
});

test('a new session starts from the loads actually lifted last time', () => {
  const state = createInitialState();
  const routine = state.routines[0];
  const first = buildWorkout(routine, 'w1', '2026-11-10T12:00:00.000Z');
  first.sets[0] = { ...first.sets[0], weight: 40, reps: 8, completed: true };
  first.sets[1] = { ...first.sets[1], weight: 42.5, reps: 6, completed: true };
  const history = [completeWorkout(first, '2026-11-10T12:30:00.000Z')!];
  assert.deepEqual(lastSetsFor(history, 'bench-press').map((s) => [s.weight, s.reps]), [[40, 8], [42.5, 6]]);
  const next = buildWorkout(routine, 'w2', '2026-11-12T12:00:00.000Z', history);
  const bench = next.sets.filter((s) => s.exerciseId === 'bench-press');
  assert.deepEqual(bench.map((s) => [s.weight, s.reps, s.completed]), [[40, 8, false], [42.5, 6, false], [42.5, 6, false]]);
  const row = next.sets.find((s) => s.exerciseId === 'seated-row')!;
  assert.equal(row.weight, 0, 'never-done exercises keep the template');
});

test('records only count when a previous load is beaten', () => {
  const routine = createInitialState().routines[0];
  const old = buildWorkout(routine, 'old', '2026-11-01T12:00:00.000Z');
  old.sets[0] = { ...old.sets[0], weight: 40, reps: 8, completed: true };
  const earlier = [completeWorkout(old, '2026-11-01T12:30:00.000Z')!];
  const now = buildWorkout(routine, 'now', '2026-11-08T12:00:00.000Z');
  now.sets[0] = { ...now.sets[0], weight: 45, reps: 5, completed: true };
  now.sets[3] = { ...now.sets[3], weight: 30, reps: 10, completed: true };
  const records = personalRecords(completeWorkout(now, '2026-11-08T12:40:00.000Z')!, earlier);
  assert.deepEqual(records.map((r) => [r.exerciseId, r.weight, r.previous]), [['bench-press', 45, 40]], 'seated row is a first time, not a record');
  const text = workoutSummaryText(completeWorkout(now, '2026-11-08T12:40:00.000Z')!, records);
  assert.match(text, /Tren superior/);
  assert.match(text, /Récord en Press de banca: 45 kg × 5 \(antes 40 kg\)/);
});

test('sets can be added and removed during a session, with renumbering and limits', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    store.startWorkout('upper-body');
    const benchCount = () => store.activeWorkout()!.sets.filter((s) => s.exerciseId === 'bench-press').length;
    assert.equal(store.updateSet(2, 9, 50), true);
    assert.equal(store.addSet('bench-press'), true);
    assert.equal(benchCount(), 4);
    const added = store.activeWorkout()!.sets[3];
    assert.deepEqual([added.exerciseId, added.setNumber, added.weight, added.reps, added.completed], ['bench-press', 4, 50, 9, false]);
    assert.equal(store.removeSet(0), true);
    assert.deepEqual(store.activeWorkout()!.sets.filter((s) => s.exerciseId === 'bench-press').map((s) => s.setNumber), [1, 2, 3]);
    assert.equal(store.addSet('no-existe'), false);
    assert.equal(store.setNotes('Hombro bien, subir carga'), true);
    assert.equal(new WorkoutStore().activeWorkout()!.notes, 'Hombro bien, subir carga');
    assert.equal(store.setNotes('   '), true);
    assert.equal(store.activeWorkout()!.notes, undefined);
  });
});

test('substituting an exercise changes only its pending sets; completed ones and the routine stay (B-06)', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    assert.equal(store.substituteExercise('bench-press', 'incline-press'), false, 'needs a session');
    store.startWorkout('upper-body');
    store.updateSet(1, 9, 40);
    store.toggleSet(1); // la segunda serie de press de banca, hecha antes que la primera
    const before = JSON.stringify(store.activeWorkout());
    assert.equal(store.substituteExercise('bench-press', 'seated-row'), false, 'already in the session');
    assert.equal(store.actionError(), 'Ese ejercicio ya está en la sesión.');
    assert.equal(store.substituteExercise('bench-press', 'bench-press'), false);
    assert.equal(store.substituteExercise('bench-press', 'no-existe'), false);
    assert.equal(store.substituteExercise('push-up', 'incline-press'), false, 'the original is not in the session');
    assert.equal(JSON.stringify(store.activeWorkout()), before, 'failed attempts change nothing');

    assert.equal(store.substituteExercise('bench-press', 'incline-press'), true);
    const sets = store.activeWorkout()!.sets;
    assert.equal(sets.length, 14);
    assert.deepEqual(sets.slice(0, 4).map((s) => [s.exerciseId, s.exerciseName, s.setNumber, s.weight, s.reps, s.completed]), [
      ['incline-press', 'Press inclinado con mancuernas', 1, 0, 10, false],
      ['bench-press', 'Press de banca', 1, 40, 9, true],
      ['incline-press', 'Press inclinado con mancuernas', 2, 0, 10, false],
      ['seated-row', 'Remo en polea', 1, 0, 12, false],
    ], 'pending sets become the substitute without load; the completed set keeps its exercise and is renumbered');
    assert.equal(store.routines().find((r) => r.id === 'upper-body')!.exercises[0].exerciseId, 'bench-press', 'the routine is untouched');
    assert.deepEqual(new WorkoutStore().activeWorkout()!.sets.map((s) => s.exerciseId), sets.map((s) => s.exerciseId), 'persisted and valid on reload');

    assert.equal(store.substituteExercise('bench-press', 'push-up'), false, 'no pending sets left of the original');
    assert.equal(store.substituteExercise('incline-press', 'push-up'), true, 'a substitute can be changed again');
    assert.equal(store.substituteExercise('push-up', 'bench-press'), false, 'cannot go back while the original is in the session');
    store.toggleSet(0);
    const saved = store.finishWorkout()!;
    assert.deepEqual(saved.sets.map((s) => [s.exerciseId, s.setNumber]), [['push-up', 1], ['bench-press', 1]]);
  });
});

test('renumbering never writes a session that would not load again (review of B-06)', () => {
  withStorage((storage) => {
    // Una sesión con 31 series del mismo ejercicio es válida al importar (la validación mira cada número de serie,
    // no cuántas hay), pero renumerarlas daría una serie 31, fuera de rango.
    const state = createInitialState();
    const active = buildWorkout(state.routines[0], 'w-31', '2026-11-19T10:00:00.000Z');
    active.sets = Array.from({ length: 31 }, () => ({ exerciseId: 'bench-press', exerciseName: 'Press de banca', setNumber: 1, reps: 10, weight: 0, completed: false }));
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, activeWorkout: active }));
    const store = new WorkoutStore();
    assert.equal(store.activeWorkout()!.sets.length, 31);
    assert.equal(store.substituteExercise('bench-press', 'incline-press'), false);
    assert.equal(store.activeWorkout()!.sets[30].exerciseId, 'bench-press', 'nothing changed');
    assert.ok(new WorkoutStore().activeWorkout(), 'the stored session still loads');
    assert.equal(store.storageError(), null);
  });
});

test('a substitute starts from what was lifted last time with that exercise, never from the original load', () => {
  const routine = createInitialState().routines.find((r) => r.id === 'upper-body')!;
  const earlier = completeWorkout({
    ...buildWorkout(routine, 'old', '2026-11-10T10:00:00.000Z'),
    sets: [
      { exerciseId: 'incline-press', exerciseName: 'Press inclinado con mancuernas', setNumber: 1, reps: 8, weight: 20, completed: true },
      { exerciseId: 'incline-press', exerciseName: 'Press inclinado con mancuernas', setNumber: 2, reps: 7, weight: 22, completed: true },
    ],
  }, '2026-11-10T11:00:00.000Z')!;
  const workout = buildWorkout(routine, 'now', '2026-11-19T10:00:00.000Z');
  workout.sets[0] = { ...workout.sets[0], weight: 60 };
  const next = substituteExercise(workout, 'bench-press', 'incline-press', [earlier])!;
  assert.deepEqual(next.sets.slice(0, 3).map((s) => [s.setNumber, s.weight, s.reps]), [[1, 20, 8], [2, 22, 7], [3, 22, 7]]);
  assert.equal(workout.sets[0].exerciseId, 'bench-press', 'the input is not mutated');
  assert.equal(substituteExercise(workout, 'bench-press', 'seated-row'), null);
  assert.ok(validateState({ ...createInitialState(), activeWorkout: next }), 'the result is a valid active session');
});

test('session swaps point a substitute at the routine exercise it replaced and reject junk', () => {
  let swaps = recordSwap(null, 'w1', 'bench-press', 'incline-press');
  swaps = recordSwap(swaps, 'w1', 'incline-press', 'push-up');
  assert.deepEqual(swaps, { workoutId: 'w1', swaps: { 'incline-press': 'bench-press', 'push-up': 'bench-press' } });
  assert.equal(swapOrigin(swaps, 'w1', 'push-up'), 'bench-press');
  assert.equal(swapOrigin(swaps, 'w1', 'seated-row'), 'seated-row');
  assert.equal(swapOrigin(swaps, 'otra-sesion', 'push-up'), 'push-up', 'swaps of another session do not apply');
  assert.equal(swapOrigin(null, 'w1', 'push-up'), 'push-up');
  assert.deepEqual(recordSwap(swaps, 'w2', 'seated-row', 'barbell-row'), { workoutId: 'w2', swaps: { 'barbell-row': 'seated-row' } }, 'a new session starts clean');
  assert.deepEqual(parseSessionSwaps(JSON.stringify(swaps)), swaps);
  for (const raw of [null, '', 'no es json', '[]', '{}', '{"workoutId":"w1"}', '{"workoutId":7,"swaps":{}}', '{"workoutId":"w1","swaps":[]}',
    '{"workoutId":"w1","swaps":{"push-up":"no-existe"}}', '{"workoutId":"w1","swaps":{"no-existe":"push-up"}}',
    '{"workoutId":"w1","swaps":{"__proto__":"push-up"}}', '{"workoutId":"w1","swaps":{"push-up":7}}']) {
    assert.equal(parseSessionSwaps(raw), null, String(raw));
  }
});

test('routines are not capped at 12 exercises; the catalog ids are unique', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    const ids = store.exercises().map((exercise) => exercise.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length >= 40);
    const routine = { id: 'custom-big', name: 'Larga', description: '', category: 'Fuerza' as const, duration: 90, level: 'Intermedio' as const, custom: true,
      exercises: ids.slice(0, 20).map((exerciseId) => ({ exerciseId, sets: 3, reps: 10, weight: 0, restSeconds: 60 })) };
    assert.equal(store.saveRoutine(routine), true);
    assert.equal(store.routines().find((r) => r.id === 'custom-big')!.exercises.length, 20);
  });
});

test('v2 profiles get focus and place defaults; invalid values are rejected', () => {
  const v2 = JSON.parse(serializeState(createInitialState()));
  v2.version = 2;
  delete v2.profile.focus;
  delete v2.profile.place;
  const upgraded = validateState(v2)!;
  assert.deepEqual([upgraded.version, upgraded.profile.focus, upgraded.profile.place], [3, 'fuerza', 'gimnasio']);
  const bad = createInitialState() as unknown as { profile: { focus: string } };
  bad.profile.focus = 'volar';
  assert.equal(validateState(bad), null);
});

test('weekly plan suggestion follows days per week and place', () => {
  const routines = createInitialState().routines;
  assert.deepEqual(suggestWeeklyPlan({ weeklyGoal: 3, place: 'gimnasio' }, routines), ['upper-body', null, 'lower-body', null, 'full-body', null, null]);
  assert.deepEqual(suggestWeeklyPlan({ weeklyGoal: 4, place: 'gimnasio' }, routines), ['upper-body', 'lower-body', null, 'upper-body', 'lower-body', null, null]);
  assert.deepEqual(suggestWeeklyPlan({ weeklyGoal: 2, place: 'casa-sin-equipo' }, routines), ['at-home', null, null, 'at-home', null, null, null]);
  assert.deepEqual(suggestWeeklyPlan({ weeklyGoal: 1, place: 'gimnasio' }, [{ id: 'mine' }]), ['mine', null, null, null, null, null, null], 'falls back to existing routines');
});

test('progression: add load when every set hit the target, keep it otherwise, add a rep for bodyweight', () => {
  const set = (weight: number, reps: number) => ({ exerciseId: 'x', exerciseName: 'X', setNumber: 1, weight, reps, completed: true });
  assert.deepEqual(suggestProgression([set(40, 10), set(40, 10)], 10, 'Barra')?.value, 42.5);
  assert.deepEqual(suggestProgression([set(12, 10), set(12, 11)], 10, 'Mancuernas')?.value, 14);
  assert.deepEqual(suggestProgression([set(40, 10), set(40, 8)], 10, 'Barra'), { kind: 'mantener', value: 40, reason: 'La última vez no llegaste a 10 repeticiones en todas las series: repetí la carga.' });
  assert.deepEqual(suggestProgression([set(0, 12), set(0, 12)], 12, 'Peso corporal')?.kind, 'mas-reps');
  assert.equal(suggestProgression([], 10, 'Barra'), null);
});

test('store applies a suggested plan and suggested loads only to pending sets', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    assert.equal(store.applyWeeklyPlan(['upper-body', null, null, null, null, null, 'no-existe']), false);
    assert.equal(store.applyWeeklyPlan(['upper-body', null, 'lower-body', null, null, null, null]), true);
    assert.equal(store.weeklyPlan()[2], 'lower-body');
    store.startWorkout('upper-body');
    store.toggleSet(0);
    assert.equal(store.applyLoad('bench-press', 42.5), true);
    const bench = store.activeWorkout()!.sets.filter((s) => s.exerciseId === 'bench-press');
    assert.deepEqual(bench.map((s) => s.weight), [0, 42.5, 42.5], 'the completed set keeps its load');
    assert.equal(store.updateProfile({ focus: 'musculo', place: 'casa-pesas' }), true);
    assert.deepEqual([new WorkoutStore().profile().focus, new WorkoutStore().profile().place], ['musculo', 'casa-pesas']);
  });
});
