import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import { WorkoutStore } from '../src/app/core/workout-store';
import { copyRoutineDraft } from '../src/app/core/routine-library';
import {
  buildWorkout, cleanSetNote, completeWorkout, createInitialState, deserializeState, isFactoryState, lastSetsFor, localDate, personalRecords, plannedRoutineId, suggestProgression, suggestWeeklyPlan, workoutSummaryText,
  parseLocalDate, parseSessionSwaps, recordSwap, removeRoutine, serializeState, setPauses, startOfWeek, substituteExercise, swapOrigin, validateState,
  STORAGE_KEY, validSetValues, weekDates, workoutDurationMinutes, workoutVolume, estimateRoutineMinutes, workoutTimedSeconds, formatDuration,
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

test('favoritos migran vacíos desde v1–v5 y v6 valida ids únicos del catálogo', () => {
  const { favoriteExerciseIds, ...old } = createInitialState();
  for (const version of [1, 2, 3, 4, 5]) {
    assert.deepEqual(validateState({ ...old, version })?.favoriteExerciseIds, []);
  }
  assert.equal(validateState(old), null, 'v6 exige la lista');
  for (const favorites of [null, 'bench-press', [1], ['no-existe'], ['bench-press', 'bench-press']]) {
    assert.equal(validateState({ ...old, favoriteExerciseIds: favorites }), null);
  }
  assert.deepEqual(validateState({ ...old, favoriteExerciseIds: ['treadmill', 'bench-press'] })?.favoriteExerciseIds, ['bench-press', 'treadmill']);
});

test('favoritos sobreviven a recarga y respaldo; no cambian rutinas ni registros y dejan de ser estado vacío', () => withStorage(() => {
  const store = new WorkoutStore();
  const original = store.snapshot();
  assert.equal(store.toggleFavorite('no-existe'), false);
  assert.deepEqual(store.favoriteExerciseIds(), []);
  assert.equal(store.toggleFavorite('treadmill'), true);
  store.toggleFavorite('bench-press');
  assert.equal(store.isFavorite('bench-press'), true);
  assert.equal(isFactoryState(store.snapshot()), false);
  assert.deepEqual(store.routines(), original.routines);
  assert.deepEqual(store.history(), original.history);
  assert.equal(store.activeWorkout(), original.activeWorkout);
  const restored = new WorkoutStore();
  assert.deepEqual(restored.favoriteExerciseIds(), ['bench-press', 'treadmill']);
  const backup = store.exportJson();
  restored.toggleFavorite('bench-press');
  assert.equal(restored.isFavorite('bench-press'), false);
  assert.equal(restored.importJson(backup), true);
  assert.deepEqual(restored.favoriteExerciseIds(), ['bench-press', 'treadmill']);
  assert.equal(restored.importJson(serializeState(original)), true);
  assert.deepEqual(restored.favoriteExerciseIds(), []);
}));

test('v1 a v4 conservan series antiguas sin reinterpretarlas como tiempo; guarda una rutina mixta', () => {
  for (const version of [1, 2, 3, 4]) {
    const original = createInitialState();
    original.activeWorkout = buildWorkout(original.routines[0], `old-${version}`);
    const migrated = validateState({ ...original, version })!;
    assert.equal(migrated.version, 7);
    assert.deepEqual(migrated.activeWorkout, original.activeWorkout);
    assert.equal(migrated.activeWorkout!.sets[0].durationSeconds, undefined);
  }
  const state = createInitialState();
  const routine = { ...state.routines[0], id: 'timed', exercises: [
    { exerciseId: 'treadmill', sets: 1, reps: 0, weight: 0, restSeconds: 0, durationSeconds: 1200 },
    { exerciseId: 'bench-press', sets: 2, reps: 10, weight: 30, restSeconds: 60 },
    { exerciseId: 'stair-climber', sets: 1, reps: 0, weight: 0, restSeconds: 0, durationSeconds: 600 },
  ] };
  state.routines.push(routine);
  const active = buildWorkout(routine, 'mixed');
  active.sets.forEach(set => set.completed = true);
  state.history.push(completeWorkout(active)!);
  state.activeWorkout = buildWorkout(routine, 'next', undefined, state.history);
  assert.deepEqual(deserializeState(serializeState(state)), state);
  assert.equal(workoutVolume(active), 600);
  assert.equal(workoutTimedSeconds(active), 1800);
  assert.equal(estimateRoutineMinutes(routine), 35);
  assert.equal(formatDuration(1225), '20 min 25 s');
  assert.equal(personalRecords(active, []).length, 0);
  assert.match(workoutSummaryText(state.history[0], []), /30 min/);
  const changedMode = { ...routine, exercises: [{ exerciseId: 'bench-press', sets: 1, reps: 0, weight: 0, restSeconds: 0, durationSeconds: 45 }] };
  assert.equal(buildWorkout(changedMode, 'mode', undefined, state.history).sets[0].reps, 0);
});

test('tiempo rechaza valores inválidos y la combinación de duración con carga o repeticiones', () => {
  const initial = createInitialState();
  const timed = { exerciseId: 'treadmill', sets: 1, reps: 0, weight: 0, restSeconds: 0, durationSeconds: 1200 };
  for (const change of [{ durationSeconds: 0 }, { durationSeconds: 36001 }, { durationSeconds: 1.5 }, { durationSeconds: null }, { durationSeconds: '60' }, { durationSeconds: undefined }, { reps: 10 }, { weight: 20 }]) {
    const state = { ...initial, routines: [{ ...initial.routines[0], exercises: [{ ...timed, ...change }] }] };
    assert.equal(validateState(state), null, JSON.stringify(change));
  }
});

test('registro por tiempo sobrevive a edición, comentario, copia de serie, sustitución y recarga', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    const routine = { ...createInitialState().routines[0], id: 'timed', custom: true, exercises: [
      { exerciseId: 'treadmill', sets: 2, reps: 0, weight: 0, restSeconds: 0, durationSeconds: 1200 },
    ] };
    assert.equal(store.saveRoutine(routine), true);
    assert.equal(store.startWorkout(routine.id), true);
    assert.equal(store.updateSet(0, 10, 5), false);
    assert.equal(store.applyLoad('treadmill', 10), false);
    assert.equal(store.applyReps('treadmill', 10), false);
    assert.equal(store.updateDuration(0, 1225), true);
    assert.equal(store.updateDuration(0, 0), false);
    store.toggleSet(0);
    store.setSetNote(0, 'Ritmo cómodo');
    store.addSet('treadmill');
    assert.equal(store.activeWorkout()!.sets[2].durationSeconds, 1200);
    assert.equal(store.activeWorkout()!.sets[2].note, undefined);
    const copy = new WorkoutStore();
    assert.deepEqual(copy.activeWorkout(), store.activeWorkout());
    assert.equal(copy.substituteExercise('treadmill', 'stair-climber'), true);
    assert.equal(copy.activeWorkout()!.sets[0].durationSeconds, 1225);
    assert.equal(copy.activeWorkout()!.sets[1].exerciseId, 'stair-climber');
    assert.equal(copy.activeWorkout()!.sets[1].durationSeconds, 1200);
    copy.toggleSet(1);
    const completed = copy.finishWorkout()!;
    assert.equal(workoutTimedSeconds(completed), 2425);
    assert.equal(workoutVolume(completed), 0);
    assert.deepEqual(deserializeState(copy.exportJson()), copy.snapshot());
  });
});

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
  // Una versión más nueva que la que conoce esta app no se adivina: se rechaza.
  assert.equal(validateState({ ...createInitialState(), version: 8 }), null);
  assert.equal(validateState({ ...createInitialState(), version: 0 }), null);
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

test('v1 data (before the weekly plan) upgrades to the current version with every day free', () => {
  const v1 = JSON.parse(serializeState(createInitialState()));
  v1.version = 1;
  delete v1.weeklyPlan;
  const upgraded = validateState(v1)!;
  assert.equal(upgraded.version, 7);
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

test('v3 data (before set time and note) upgrades to v5 without inventing either; v4 round trips with both (B-10, B-11)', () => {
  const routine = createInitialState().routines[0];
  const done = buildWorkout(routine, 'w-done', '2026-11-18T10:00:00.000Z');
  done.sets[0] = { ...done.sets[0], completed: true, weight: 40 };
  const v3 = { ...JSON.parse(serializeState(createInitialState())), version: 3, history: [completeWorkout(done, '2026-11-18T10:30:00.000Z')] };
  const upgraded = validateState(v3)!;
  assert.equal(upgraded.version, 7);
  assert.deepEqual(Object.keys(upgraded.history[0].sets[0]).sort(), ['completed', 'exerciseId', 'exerciseName', 'reps', 'setNumber', 'weight']);

  const state = createInitialState();
  assert.equal(state.version, 7);
  const withFields = buildWorkout(routine, 'w-v4', '2026-11-19T10:00:00.000Z');
  withFields.sets[0] = { ...withFields.sets[0], completed: true, completedAt: '2026-11-19T10:05:00.000Z', note: 'Me costó la última' };
  withFields.sets[1] = { ...withFields.sets[1], completed: true };
  state.history = [completeWorkout(withFields, '2026-11-19T10:40:00.000Z')!];
  state.activeWorkout = buildWorkout(routine, 'w-active', '2026-11-19T12:00:00.000Z');
  state.activeWorkout.sets[2] = { ...state.activeWorkout.sets[2], completed: true, completedAt: '2026-11-19T12:03:00.000Z' };
  state.activeWorkout.sets[3] = { ...state.activeWorkout.sets[3], note: 'Probar agarre ancho' };
  assert.deepEqual(deserializeState(serializeState(state)), state, 'export and import give back exactly the same data');
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(validateState(state)))), state, 'validating twice changes nothing');
});

test('set time and note are validated strictly and kept in canonical form', () => {
  const withSet = (change: Record<string, unknown>) => {
    const state = createInitialState();
    state.activeWorkout = buildWorkout(state.routines[0], 'w', '2026-11-19T10:00:00.000Z');
    const raw = JSON.parse(serializeState(state));
    Object.assign(raw.activeWorkout.sets[0], change);
    return validateState(raw);
  };
  for (const bad of [{ completed: true, completedAt: 'ayer' }, { completed: true, completedAt: 1_700_000_000_000 }, { completed: true, completedAt: null },
    { completed: true, completedAt: '0900-01-01T00:00:00.000Z' }, { note: 'x'.repeat(201) }, { note: 7 }, { note: null }, { note: ['hola'] }]) {
    assert.equal(withSet(bad), null, JSON.stringify(bad).slice(0, 60));
  }
  const canonical = withSet({ completed: true, completedAt: '2026-11-19T07:05:00-03:00', note: '  Hombro bien  ' })!.activeWorkout!.sets[0];
  assert.equal(canonical.completedAt, '2026-11-19T10:05:00.000Z', 'UTC with milliseconds, like the API returns');
  assert.equal(canonical.note, 'Hombro bien');
  // Una hora en una serie pendiente y un comentario en blanco se descartan sin invalidar el resto.
  const cleaned = withSet({ completed: false, completedAt: '2026-11-19T10:05:00.000Z', note: '   ' })!.activeWorkout!.sets[0];
  assert.deepEqual(Object.keys(cleaned).sort(), ['completed', 'exerciseId', 'exerciseName', 'reps', 'setNumber', 'weight']);
  assert.equal(withSet({ note: 'x'.repeat(200) })!.activeWorkout!.sets[0].note!.length, 200);
});

test('the store stamps the time when a set is completed, clears it when unmarked and keeps short notes (B-10, B-11)', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    assert.equal(store.setSetNote(0, 'sin sesión'), false);
    store.startWorkout('upper-body');
    const before = Date.now();
    store.toggleSet(0);
    const stamped = store.activeWorkout()!.sets[0];
    assert.equal(stamped.completed, true);
    assert.ok(Date.parse(stamped.completedAt!) >= before && Date.parse(stamped.completedAt!) <= Date.now());
    assert.equal(store.setSetNote(0, '  Me costó la última  '), true);
    assert.equal(store.activeWorkout()!.sets[0].note, 'Me costó la última');
    assert.equal(store.setSetNote(0, 'x'.repeat(201)), false);
    assert.equal(store.setSetNote(99, 'hola'), false);
    assert.equal(store.setSetNote(0.5, 'hola'), false);
    assert.equal(store.activeWorkout()!.sets[0].note, 'Me costó la última', 'a rejected note changes nothing');

    // Agregar una serie copia carga y repeticiones, no la hora ni el comentario.
    store.addSet('bench-press');
    const bench = store.activeWorkout()!.sets.filter((s) => s.exerciseId === 'bench-press');
    assert.equal(bench.length, 4);
    store.toggleSet(3);
    store.setSetNote(3, 'Última con pausa');
    store.addSet('bench-press');
    const added = store.activeWorkout()!.sets.filter((s) => s.exerciseId === 'bench-press')[4];
    assert.deepEqual(Object.keys(added).sort(), ['completed', 'exerciseId', 'exerciseName', 'reps', 'setNumber', 'weight']);
    assert.equal(added.completed, false);

    const reloaded = new WorkoutStore().activeWorkout()!.sets[0];
    assert.deepEqual([reloaded.completedAt, reloaded.note], [stamped.completedAt, 'Me costó la última'], 'both survive a reload');

    // Desmarcar borra la hora y deja el comentario; un comentario en blanco lo borra.
    store.toggleSet(0);
    assert.equal('completedAt' in store.activeWorkout()!.sets[0], false);
    assert.equal(store.activeWorkout()!.sets[0].note, 'Me costó la última');
    assert.equal(store.setSetNote(0, '   '), true);
    assert.equal('note' in store.activeWorkout()!.sets[0], false);

    const saved = store.finishWorkout()!;
    assert.equal(saved.sets.length, 1, 'only the completed set is saved');
    assert.equal(saved.sets[0].note, 'Última con pausa');
    assert.ok(saved.sets[0].completedAt);
    assert.deepEqual(new WorkoutStore().history()[0].sets[0], saved.sets[0]);
  });
});

test('the store writes set keys in one fixed order, so equal data always serialises equally (review of v4)', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    store.startWorkout('upper-body');
    // Marcar, comentar, desmarcar y volver a marcar: el caso que dejaba la hora después del comentario.
    store.toggleSet(0);
    store.setSetNote(0, 'Primero el comentario');
    store.toggleSet(0);
    store.toggleSet(0);
    store.setSetNote(1, 'Comentario en una pendiente');
    store.toggleSet(1);
    store.updateSet(0, 9, 42.5);
    store.applyLoad('bench-press', 45);
    store.addSet('bench-press');
    store.removeSet(3);
    store.substituteExercise('seated-row', 'barbell-row');
    const snapshot = store.snapshot();
    assert.deepEqual(Object.keys(snapshot.activeWorkout!.sets[0]), ['exerciseId', 'exerciseName', 'setNumber', 'reps', 'weight', 'completed', 'completedAt', 'note']);
    assert.equal(serializeState(snapshot), serializeState(validateState(snapshot)!), 'same text as the validated (and the server) form');
    assert.ok(store.finishWorkout());
    assert.equal(serializeState(store.snapshot()), serializeState(validateState(store.snapshot())!));
  });
});

test('a note that did not change is not a change, and half an emoji is never stored (review of v4)', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    store.startWorkout('upper-body');
    store.toggleSet(0);
    let changes = 0;
    store.onChange = () => { changes++; };
    assert.equal(store.setSetNote(0, 'Bien'), true);
    assert.equal(changes, 1);
    assert.equal(store.setSetNote(0, '  Bien '), true);
    assert.equal(changes, 1, 'same text: nothing to save or to send');
    assert.equal(store.setSetNote(0, ''), true);
    assert.equal(store.setSetNote(0, '   '), true);
    assert.equal(changes, 2);
    // Un texto pegado y recortado en 200 puede terminar en medio emoji.
    store.setSetNote(0, 'Fuerte \uD83D');
    assert.equal(store.activeWorkout()!.sets[0].note, 'Fuerte');
    store.setSetNote(0, 'Fuerte \uD83D\uDCAA');
    assert.equal(store.activeWorkout()!.sets[0].note, 'Fuerte \uD83D\uDCAA');
    assert.equal(cleanSetNote('\uDCAA a \uD83D\uDCAA b \uD83D'), 'a \uD83D\uDCAA b');
    const raw = JSON.parse(serializeState(store.snapshot()));
    raw.activeWorkout.sets[0].note = 'a\uD800b';
    assert.equal(validateState(raw)!.activeWorkout!.sets[0].note, 'ab');
  });
});

test('data saved by a newer version of the app is never overwritten (review of v4)', () => {
  // Al abrir: lo guardado es de una versión que esta app no conoce.
  withStorage((storage) => {
    const newer = JSON.stringify({ ...createInitialState(), version: 8, algoNuevo: true });
    storage.setItem(STORAGE_KEY, newer);
    const store = new WorkoutStore();
    assert.match(store.storageError()!, /versión más nueva/);
    let changes = 0;
    store.onChange = () => { changes++; };
    store.updateProfile({ name: 'Otro' });
    store.startWorkout('upper-body');
    assert.equal(storage.getItem(STORAGE_KEY), newer, 'the stored data is untouched');
    assert.equal(changes, 0, 'and nothing is announced to the account sync');
    assert.match(store.storageError()!, /versión más nueva/);
  });
  // Con la app abierta: otra pestaña, ya actualizada, guarda datos de una versión más nueva.
  withStorage((storage) => {
    type Listener = (event: { key: string; newValue: string | null }) => void;
    const listeners: Listener[] = [];
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener: (_type: string, listener: Listener) => { listeners.push(listener); } } });
    try {
      const store = new WorkoutStore();
      assert.equal(store.updateProfile({ name: 'Pestaña vieja' }), true);
      const newer = JSON.stringify({ ...createInitialState(), version: 8 });
      storage.setItem(STORAGE_KEY, newer);
      listeners.forEach((listener) => listener({ key: STORAGE_KEY, newValue: newer }));
      assert.match(store.storageError()!, /versión más nueva/);
      store.updateProfile({ name: 'No se guarda' });
      assert.equal(storage.getItem(STORAGE_KEY), newer);
    } finally { Reflect.deleteProperty(globalThis, 'window'); }
  });
  // Datos ilegibles que no son de una versión más nueva siguen dando el aviso de siempre.
  withStorage((storage) => {
    storage.setItem(STORAGE_KEY, '{"version":4,"roto":true}');
    assert.match(new WorkoutStore().storageError()!, /no es válido/);
  });
});

test('pauses between sets follow the order they were done in and skip sets without a time', () => {
  const set = (completedAt?: string) => ({ exerciseId: 'bench-press', exerciseName: 'Press de banca', setNumber: 1, reps: 10, weight: 0, completed: true, ...(completedAt ? { completedAt } : {}) });
  assert.deepEqual(setPauses({ sets: [set('2026-11-19T10:00:00.000Z'), set('2026-11-19T10:02:10.000Z'), set(), set('2026-11-19T10:01:00.000Z')] }), [null, 70, null, 60]);
  assert.deepEqual(setPauses({ sets: [set(), set()] }), [null, null]);
  assert.deepEqual(setPauses({ sets: [] }), []);
});

test('the factory state is recognised whatever the template contents, and anything the user added is not', () => {
  assert.equal(isFactoryState(createInitialState()), true);
  // Plantillas de otra versión: otra duración, otros ejercicios, alguna borrada.
  const older = createInitialState();
  older.routines[0].duration = 45;
  older.routines[1].exercises = older.routines[1].exercises.slice(0, 2);
  older.routines.pop();
  assert.equal(isFactoryState(older), true);
  const changed: [string, (state: ReturnType<typeof createInitialState>) => void][] = [
    ['profile', (state) => { state.profile.name = 'Maxi'; }],
    ['profile weight', (state) => { state.profile.weight = 70; }],
    ['custom routine', (state) => { state.routines.push({ ...state.routines[0], id: 'custom-1', custom: true }); }],
    ['unknown routine id', (state) => { state.routines.push({ ...state.routines[0], id: 'otra' }); }],
    ['history', (state) => { state.history = [completeWorkout({ ...buildWorkout(state.routines[0], 'w'), sets: buildWorkout(state.routines[0], 'w').sets.map((set) => ({ ...set, completed: true })) })!]; }],
    ['active workout', (state) => { state.activeWorkout = buildWorkout(state.routines[0], 'w'); }],
    ['weekly plan', (state) => { state.weeklyPlan[2] = 'upper-body'; }],
    ['one-off rest day', (state) => { state.schedule = [{ id: 'p', date: '2026-11-20', routineId: null }]; }],
    ['weight record', (state) => { state.weights = [{ id: 'k', date: '2026-11-19', weight: 70 }]; }],
  ];
  for (const [label, change] of changed) {
    const state = createInitialState();
    change(state);
    assert.equal(isFactoryState(state), false, label);
  }
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

test('undoing a substitution restores that same session exactly, and nothing else', () => {
  withStorage(() => {
    const store = new WorkoutStore();
    store.startWorkout('upper-body');
    store.updateSet(0, 9, 40);
    store.toggleSet(0);
    store.setSetNote(0, 'Bien');
    const before = store.activeWorkout()!;
    assert.equal(store.substituteExercise('bench-press', 'incline-press'), true);
    const after = store.activeWorkout()!;
    // Otra pestaña que vuelve a cargar los mismos datos deja otro objeto con el mismo contenido: deshacer sigue valiendo.
    assert.equal(store.restoreSession(before, JSON.parse(JSON.stringify(after))), true);
    assert.equal(serializeState(store.snapshot()), serializeState({ ...store.snapshot(), activeWorkout: before }), 'back to exactly what it was');
    assert.deepEqual(new WorkoutStore().activeWorkout(), before, 'and it is what gets stored');

    // Si el alumno hizo algo después del cambio, deshacer no lo pisa.
    assert.equal(store.substituteExercise('bench-press', 'incline-press'), true);
    const changed = store.activeWorkout()!;
    store.toggleSet(1);
    const later = store.activeWorkout()!;
    assert.equal(store.restoreSession(before, changed), false);
    assert.equal(store.actionError(), 'Ya hubo otros cambios en la sesión: no se pudo deshacer.');
    assert.equal(store.activeWorkout(), later, 'a refused undo changes nothing');

    // Tampoco acepta una sesión que no sea la que está en curso, ni datos inválidos.
    assert.equal(store.restoreSession({ ...before, id: 'otra-sesion' }, later), false);
    assert.equal(store.restoreSession({ ...before, startedAt: '2020-01-01T00:00:00.000Z' }, later), false);
    assert.equal(store.restoreSession({ ...before, sets: [] }, later), false);
    assert.equal(store.restoreSession({ ...before, sets: [{ ...before.sets[0], exerciseId: 'no-existe' }] }, later), false);
    assert.equal(store.activeWorkout(), later);
    store.discardWorkout();
    assert.equal(store.restoreSession(before, later), false, 'there has to be a session in progress');
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

test('guardar una variante conserva el programa, calendario, sesión activa e historial del original al recargar', () => {
  withStorage(() => {
    const store = new WorkoutStore(), sourceId = store.routines()[0].id;
    assert.ok(store.saveProgram('Mi programa', [sourceId, sourceId]));
    assert.ok(store.startProgramWorkout());store.toggleSet(0);assert.ok(store.finishWorkout());
    assert.ok(store.startProgramWorkout());store.toggleSet(0);
    store.scheduleRoutine('2026-11-23', sourceId);
    const before = store.snapshot(), source = before.routines.find(r => r.id === sourceId)!;
    const draft = copyRoutineDraft(source, before.routines, 'custom-copy');
    draft.exercises[0].weight = 17.5;
    assert.deepEqual(store.snapshot(), before, 'el borrador todavía no modifica ningún dato');
    assert.ok(store.saveRoutine(draft));
    const after = new WorkoutStore().snapshot();
    assert.equal(after.routines.length, before.routines.length + 1);
    assert.deepEqual(after.routines.find(r => r.id === sourceId), source);
    assert.equal(after.routines.find(r => r.id === draft.id)!.exercises[0].weight, 17.5);
    for (const key of ['program', 'schedule', 'weeklyPlan', 'activeWorkout', 'history'] as const) assert.deepEqual(after[key], before[key], key);
    const exerciseId = draft.exercises[0].exerciseId;
    assert.ok(lastSetsFor(after.history, exerciseId).length, 'la variante consulta el historial del mismo ejercicio');
  });
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
  assert.deepEqual([upgraded.version, upgraded.profile.focus, upgraded.profile.place], [7, 'fuerza', 'gimnasio']);
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
