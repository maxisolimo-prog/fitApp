import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import { WorkoutStore } from '../src/app/core/workout-store';
import {
  buildWorkout, completeWorkout, createInitialState, deserializeState, lastSetsFor, localDate, personalRecords, plannedRoutineId, workoutSummaryText,
  parseLocalDate, removeRoutine, serializeState, startOfWeek, validateState,
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
  assert.equal(validateState({ ...createInitialState(), version: 3 }), null);
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

test('v1 data (before the weekly plan) upgrades to v2 with every day free', () => {
  const v1 = JSON.parse(serializeState(createInitialState()));
  v1.version = 1;
  delete v1.weeklyPlan;
  const upgraded = validateState(v1)!;
  assert.equal(upgraded.version, 2);
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
