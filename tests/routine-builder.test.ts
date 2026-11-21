import assert from 'node:assert/strict';
import test from 'node:test';
import type { FitnessLevel, MovementId, RoutineExercise, TrainingFocus, TrainingPlace } from '../src/app/core/models';
import { MOVEMENT_LABELS } from '../src/app/core/movements';
import {
  MAX_PROPOSED_EXERCISES, PREFERENCE_ORDERS, PROPOSAL_MINUTES, ROUTINE_TARGETS, ROUTINE_TARGET_LABELS, TRAINING_PLACE_LABELS,
  availableAt, buildRoutineProposal, defaultPrescription, routineMuscles,
} from '../src/app/core/routine-builder';
import { seedExercises } from '../src/app/core/seed';
import {
  SETUP_SECONDS_PER_EXERCISE, WORK_SECONDS_PER_SET, estimateRoutineMinutes, focuses, places, validateRoutine,
} from '../src/app/core/workout-utils';

const levels: FitnessLevel[] = ['Principiante', 'Intermedio', 'Avanzado'];
const byId = new Map(seedExercises.map((exercise) => [exercise.id, exercise]));
const ids = (entries: RoutineExercise[]) => entries.map((entry) => entry.exerciseId);
const seconds = (entries: RoutineExercise[]) => entries.reduce((total, entry) => total + SETUP_SECONDS_PER_EXERCISE + entry.sets * (WORK_SECONDS_PER_SET + entry.restSeconds), 0);

test('las listas de preferencia nombran ejercicios del catálogo con el movimiento que dicen', () => {
  const [starter, experienced] = PREFERENCE_ORDERS;
  assert.deepEqual(Object.keys(starter).sort(), Object.keys(MOVEMENT_LABELS).sort(), 'falta o sobra un movimiento en la lista de quien recién empieza');
  for (const order of PREFERENCE_ORDERS) {
    for (const [movement, list] of Object.entries(order)) {
      assert.equal(new Set(list).size, list.length, `${movement}: ejercicio repetido`);
      for (const id of list) assert.equal(byId.get(id)?.movement, movement, `${id} no es un ejercicio de «${movement}»`);
    }
  }
  // Con experiencia solo cambia el orden: los ejercicios de cada movimiento son los mismos.
  for (const [movement, list] of Object.entries(experienced)) {
    assert.deepEqual([...list].sort(), [...(starter[movement as MovementId] ?? [])].sort(), `${movement}: las dos listas no tienen los mismos ejercicios`);
  }
});

test('todo ejercicio del catálogo figura en la preferencia de su movimiento', () => {
  const [starter] = PREFERENCE_ORDERS;
  for (const exercise of seedExercises) assert.ok(starter[exercise.movement]?.includes(exercise.id), `${exercise.id} no tiene lugar en la preferencia de «${exercise.movement}»`);
});

test('el equipo del catálogo es el que la propuesta sabe ubicar en cada lugar', () => {
  const known = ['Barra', 'Mancuernas', 'Mancuerna', 'Polea', 'Máquina', 'Peso corporal', 'Banco', 'Paralelas'];
  for (const exercise of seedExercises) assert.ok(known.includes(exercise.equipment), `${exercise.id}: equipo «${exercise.equipment}» sin lugar asignado`);
});

test('en casa solo se propone lo que se puede hacer con ese equipo', () => {
  const at = (place: TrainingPlace, id: string) => availableAt(place, byId.get(id)!);
  for (const exercise of seedExercises) assert.equal(availableAt('gimnasio', exercise), true);
  assert.equal(at('casa-pesas', 'goblet-squat'), true);
  assert.equal(at('casa-pesas', 'push-up'), true);
  assert.equal(at('casa-pesas', 'bench-press'), false);
  assert.equal(at('casa-pesas', 'seated-row'), false);
  assert.equal(at('casa-sin-equipo', 'push-up'), true);
  assert.equal(at('casa-sin-equipo', 'goblet-squat'), false);
  // Las dominadas son con el peso del cuerpo, pero piden una barra fija.
  assert.equal(at('casa-pesas', 'pull-up'), false);
  assert.equal(at('casa-sin-equipo', 'pull-up'), false);
});

test('cualquier combinación da una rutina válida, sin cargas inventadas y dentro del tiempo', () => {
  let combinations = 0;
  for (const target of ROUTINE_TARGETS) for (const minutes of PROPOSAL_MINUTES) for (const place of places) for (const level of levels) for (const focus of focuses) {
    combinations++;
    const where = `${target}, ${minutes} min, ${place}, ${level}, ${focus}`;
    const proposal = buildRoutineProposal({ target, minutes, place, level, focus }, seedExercises);
    assert.ok(proposal.name.trim().length > 0 && proposal.name.length <= 80, `${where}: nombre fuera de rango`);
    if (!proposal.exercises.length) { assert.equal(proposal.minutes, 0, where); continue; }
    assert.ok(proposal.exercises.length <= MAX_PROPOSED_EXERCISES, `${where}: demasiados ejercicios`);
    assert.equal(new Set(ids(proposal.exercises)).size, proposal.exercises.length, `${where}: ejercicio repetido`);
    assert.ok(seconds(proposal.exercises) <= minutes * 60, `${where}: se pasa del tiempo`);
    assert.equal(proposal.minutes, estimateRoutineMinutes(proposal), `${where}: la duración no coincide con la que muestra la app`);
    for (const entry of proposal.exercises) {
      assert.equal(entry.weight, 0, `${where}: ${entry.exerciseId} trae una carga inventada`);
      assert.ok(availableAt(place, byId.get(entry.exerciseId)!), `${where}: ${entry.exerciseId} no se puede hacer ahí`);
    }
    const routine = { id: 'custom-test', name: proposal.name, description: '', category: 'Fuerza', duration: proposal.minutes, level, exercises: proposal.exercises, custom: true };
    assert.ok(validateRoutine(routine), `${where}: la validación la rechaza`);
  }
  assert.equal(combinations, ROUTINE_TARGETS.length * PROPOSAL_MINUTES.length * 3 * 3 * 4);
});

test('cuerpo completo en el gimnasio para quien recién empieza', () => {
  const request = { target: 'cuerpo-completo', place: 'gimnasio', level: 'Principiante', focus: 'fuerza' } as const;
  const long = buildRoutineProposal({ ...request, minutes: 45 }, seedExercises);
  assert.deepEqual(ids(long.exercises), ['goblet-squat', 'incline-press', 'seated-row', 'romanian-deadlift', 'shoulder-press', 'lat-pulldown', 'bird-dog']);
  assert.equal(long.minutes, 45);
  assert.equal(long.name, 'Rutina de cuerpo completo');
  // Con poco tiempo quedan los tres movimientos principales y no se reserva lugar para el cierre.
  const short = buildRoutineProposal({ ...request, minutes: 20 }, seedExercises);
  assert.deepEqual(ids(short.exercises), ['goblet-squat', 'incline-press', 'seated-row']);
  assert.equal(short.minutes, 20);
});

test('con experiencia la propuesta pasa a los ejercicios de barra', () => {
  const proposal = buildRoutineProposal({ target: 'tren-superior', minutes: 45, place: 'gimnasio', level: 'Intermedio', focus: 'musculo' }, seedExercises);
  assert.deepEqual(ids(proposal.exercises), ['bench-press', 'barbell-row', 'overhead-press', 'lat-pulldown', 'barbell-curl', 'triceps-pushdown', 'lateral-raise']);
  assert.deepEqual(proposal.exercises[0], { exerciseId: 'bench-press', sets: 3, reps: 10, weight: 0, restSeconds: 90 });
});

test('si la zona tiene pocos movimientos, suma un segundo ejercicio de cada uno y los deja juntos', () => {
  const proposal = buildRoutineProposal({ target: 'traccion', minutes: 60, place: 'gimnasio', level: 'Intermedio', focus: 'musculo' }, seedExercises);
  assert.deepEqual(ids(proposal.exercises), ['lat-pulldown', 'assisted-pull-up', 'barbell-row', 'seated-row', 'face-pull', 'rear-delt-fly', 'barbell-curl', 'biceps-curl']);
  // Con el tope de ejercicios alcanzado, el tiempo que sobra suma una serie a los primeros.
  assert.deepEqual(proposal.exercises.map((entry) => entry.sets), [4, 4, 4, 4, 3, 2, 2, 2]);
  assert.equal(proposal.minutes, 60);
});

test('en casa sin equipo propone solo ejercicios con el peso del cuerpo', () => {
  const proposal = buildRoutineProposal({ target: 'cuerpo-completo', minutes: 30, place: 'casa-sin-equipo', level: 'Principiante', focus: 'salud' }, seedExercises);
  assert.deepEqual(ids(proposal.exercises), ['push-up', 'reverse-lunge', 'glute-bridge', 'bench-dip', 'bird-dog']);
  for (const entry of proposal.exercises) assert.equal(byId.get(entry.exerciseId)!.equipment, 'Peso corporal');
});

test('si el catálogo no tiene ejercicios de esa zona para ese lugar, la propuesta queda vacía', () => {
  const proposal = buildRoutineProposal({ target: 'traccion', minutes: 45, place: 'casa-sin-equipo', level: 'Principiante', focus: 'fuerza' }, seedExercises);
  assert.deepEqual(proposal.exercises, []);
  assert.equal(proposal.minutes, 0);
});

test('si el catálogo no da para llenar el tiempo, la propuesta dice cuánto dura de verdad', () => {
  const proposal = buildRoutineProposal({ target: 'zona-media', minutes: 60, place: 'gimnasio', level: 'Principiante', focus: 'fuerza' }, seedExercises);
  assert.deepEqual(ids(proposal.exercises), ['bird-dog', 'dead-bug', 'pallof-press', 'crunch', 'leg-raise']);
  assert.ok(proposal.minutes < 60);
});

test('series, repeticiones y descanso salen del objetivo y del nivel', () => {
  const press = byId.get('bench-press')!;
  const curl = byId.get('biceps-curl')!;
  const core = byId.get('bird-dog')!;
  assert.deepEqual(defaultPrescription(press, 'fuerza', 'Avanzado'), { sets: 4, reps: 6, restSeconds: 120 });
  // Quien recién empieza no baja de 8 repeticiones aunque busque fuerza.
  assert.deepEqual(defaultPrescription(press, 'fuerza', 'Principiante'), { sets: 2, reps: 8, restSeconds: 120 });
  assert.deepEqual(defaultPrescription(press, 'musculo', 'Intermedio'), { sets: 3, reps: 10, restSeconds: 90 });
  assert.deepEqual(defaultPrescription(curl, 'grasa', 'Intermedio'), { sets: 2, reps: 15, restSeconds: 45 });
  for (const focus of focuses) assert.deepEqual(defaultPrescription(core, focus, 'Principiante'), { sets: 2, reps: 8, restSeconds: 45 });
  for (const exercise of seedExercises) for (const focus of focuses as TrainingFocus[]) for (const level of levels) {
    const { sets, reps, restSeconds, durationSeconds } = defaultPrescription(exercise, focus, level);
    if (exercise.tracking === 'duration') {
      assert.deepEqual({ sets, reps, restSeconds, durationSeconds }, { sets: 1, reps: 0, restSeconds: 0, durationSeconds: 1200 });
      continue;
    }
    assert.ok(Number.isInteger(sets) && sets >= 1 && sets <= 5, `${exercise.id}: series`);
    assert.ok(Number.isInteger(reps) && reps >= 6 && reps <= 15, `${exercise.id}: repeticiones`);
    assert.ok(Number.isInteger(restSeconds) && restSeconds >= 45 && restSeconds <= 120, `${exercise.id}: descanso`);
  }
});

test('los músculos de una rutina: principales de sus ejercicios y, aparte, los que solo ayudan', () => {
  const catalog = [
    { id: 'a', primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'deltoids'] },
    { id: 'b', primaryMuscles: ['triceps'], secondaryMuscles: ['chest', 'forearm'] },
  ] as const;
  assert.deepEqual(routineMuscles([{ exerciseId: 'b' }, { exerciseId: 'a' }, { exerciseId: 'no-existe' }], catalog), { primary: ['chest', 'triceps'], secondary: ['deltoids', 'forearm'] });
  assert.deepEqual(routineMuscles([], catalog), { primary: [], secondary: [] });
});

test('cada zona y cada lugar tienen su nombre', () => {
  for (const target of ROUTINE_TARGETS) assert.ok(ROUTINE_TARGET_LABELS[target].trim().length > 0);
  assert.deepEqual(Object.keys(TRAINING_PLACE_LABELS).sort(), [...places].sort());
});
