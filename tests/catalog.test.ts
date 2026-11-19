import assert from 'node:assert/strict';
import test from 'node:test';
import { isMuscleId, MUSCLE_IDS, MUSCLE_LABELS, muscleNames, muscleSentence } from '../src/app/core/muscles';
import { seedExercises, seedRoutines } from '../src/app/core/seed';
import { estimateRoutineMinutes, SETUP_SECONDS_PER_EXERCISE, WORK_SECONDS_PER_SET } from '../src/app/core/workout-utils';
import { focusSide, thumbView } from '../src/app/features/muscle-focus';
import { BODY_BACK, BODY_FRONT, BODY_OUTLINE, BODY_VIEWBOX } from '../src/app/features/muscle-map.data';

test('el catálogo tiene 43 ejercicios con identificador propio', () => {
  assert.equal(seedExercises.length, 43);
  assert.equal(new Set(seedExercises.map((exercise) => exercise.id)).size, 43);
});

test('cada ejercicio declara músculos de la lista cerrada, sin repetir ni cruzar principales y secundarios', () => {
  for (const exercise of seedExercises) {
    const { id, primaryMuscles, secondaryMuscles } = exercise;
    assert.ok(Array.isArray(primaryMuscles) && primaryMuscles.length >= 1, `${id}: falta al menos un músculo principal`);
    assert.ok(Array.isArray(secondaryMuscles), `${id}: secondaryMuscles tiene que ser una lista`);
    for (const muscle of [...primaryMuscles, ...secondaryMuscles]) assert.ok(isMuscleId(muscle), `${id}: «${muscle}» no está en la lista cerrada`);
    assert.equal(new Set(primaryMuscles).size, primaryMuscles.length, `${id}: principal repetido`);
    assert.equal(new Set(secondaryMuscles).size, secondaryMuscles.length, `${id}: secundario repetido`);
    assert.deepEqual(secondaryMuscles.filter((muscle) => primaryMuscles.includes(muscle)), [], `${id}: un músculo no puede ser principal y secundario`);
  }
});

test('la lista cerrada tiene nombre para cada músculo y solo acepta los suyos', () => {
  assert.equal(new Set(MUSCLE_IDS).size, MUSCLE_IDS.length);
  assert.deepEqual([...MUSCLE_IDS].sort(), Object.keys(MUSCLE_LABELS).sort());
  for (const id of MUSCLE_IDS) assert.ok(MUSCLE_LABELS[id].trim().length > 0);
  for (const value of ['', 'hombros', 'constructor', '__proto__', 'toString', null, undefined, 7, {}]) assert.equal(isMuscleId(value), false);
});

test('todo músculo de la lista cerrada se puede dibujar en el mapa', () => {
  const drawable = new Set([...BODY_FRONT, ...BODY_BACK].map((part) => part.slug));
  for (const id of MUSCLE_IDS) assert.ok(drawable.has(id), `el dibujo no trae la zona «${id}»`);
});

test('el dibujo del cuerpo trae solo trazos SVG y sus dos vistas', () => {
  const safe = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s-]+$/;
  for (const [side, parts] of [['frente', BODY_FRONT], ['espalda', BODY_BACK]] as const) {
    assert.ok(parts.length >= 15, `${side}: faltan partes`);
    assert.equal(new Set(parts.map((part) => part.slug)).size, parts.length, `${side}: parte repetida`);
    for (const part of parts) {
      assert.match(part.slug, /^[a-z-]+$/);
      assert.ok(part.d.length > 0 && safe.test(part.d), `${side}: trazo inesperado en ${part.slug}`);
    }
  }
  assert.ok(safe.test(BODY_OUTLINE.front) && safe.test(BODY_OUTLINE.back));
  assert.deepEqual(BODY_VIEWBOX, { front: '0 0 724 1448', back: '724 0 724 1448' });
});

test('la miniatura mira cada músculo del lado donde el dibujo lo trae, con un recorte cuadrado dentro del dibujo', () => {
  const drawn = { front: new Set(BODY_FRONT.map((part) => part.slug)), back: new Set(BODY_BACK.map((part) => part.slug)) };
  for (const id of MUSCLE_IDS) {
    const view = thumbView([id]);
    assert.equal(view.side, focusSide(id));
    assert.ok(drawn[view.side].has(id), `el lado «${view.side}» del dibujo no trae «${id}»`);
    const [x, y, width, height] = view.viewBox.split(' ').map(Number);
    const [left, top, sideWidth, sideHeight] = BODY_VIEWBOX[view.side].split(' ').map(Number);
    assert.equal(width, height, `${id}: el recorte tiene que ser cuadrado`);
    assert.ok(x >= left && x + width <= left + sideWidth && y >= top && y + height <= top + sideHeight, `${id}: el recorte se sale del dibujo`);
  }
  // Un ejercicio se mira donde está su primer músculo principal; sin músculos no se rompe.
  assert.deepEqual(thumbView(['gluteal', 'chest']), thumbView(['gluteal']));
  assert.equal(thumbView(['quadriceps']).side, 'front');
  assert.equal(thumbView(['hamstring']).side, 'back');
  assert.equal(typeof thumbView([]).viewBox, 'string');
});

test('la duración estimada sale de series, descansos y armado, redondeada a 5 minutos', () => {
  const entry = (sets: number, restSeconds: number) => ({ exerciseId: 'bench-press', sets, reps: 10, weight: 0, restSeconds });
  // 4 series × (45 s de trabajo + 75 s de descanso) + 60 s de armado = 540 s = 9 min, que redondea a 10.
  assert.equal(SETUP_SECONDS_PER_EXERCISE + 4 * (WORK_SECONDS_PER_SET + 75), 540);
  assert.equal(estimateRoutineMinutes({ exercises: [entry(4, 75)] }), 10);
  assert.equal(estimateRoutineMinutes({ exercises: [entry(4, 75), entry(4, 75), entry(4, 75)] }), 25);
  // Nunca menos de 5 ni más de 600, que es lo que acepta la validación de rutinas.
  assert.equal(estimateRoutineMinutes({ exercises: [] }), 5);
  assert.equal(estimateRoutineMinutes({ exercises: [entry(30, 3600)] }), 600);
  // Un campo a medio escribir en el editor (vacío o fuera de rango) no rompe la cuenta: ese ejercicio no suma.
  const half = [entry(Number.NaN, 60), entry(3, 60), { ...entry(3, 60), sets: null as unknown as number }];
  assert.equal(estimateRoutineMinutes({ exercises: half }), estimateRoutineMinutes({ exercises: [entry(3, 60)] }));
});

test('las plantillas guardan la misma duración que se muestra', () => {
  for (const routine of seedRoutines) assert.equal(routine.duration, estimateRoutineMinutes(routine), routine.id);
});

test('los nombres salen en el orden de la lista y se leen de corrido', () => {
  assert.deepEqual(muscleNames(['triceps', 'chest', 'deltoids']), ['Deltoides', 'Pecho', 'Tríceps']);
  assert.equal(muscleSentence([]), '');
  assert.equal(muscleSentence(['chest']), 'Pecho');
  assert.equal(muscleSentence(['triceps', 'chest']), 'Pecho y tríceps');
  assert.equal(muscleSentence(['triceps', 'chest', 'deltoids']), 'Deltoides, pecho y tríceps');
  assert.equal(muscleSentence(['upper-back', 'biceps']), 'Dorsales y bíceps');
  assert.equal(muscleSentence(['gluteal', 'hamstring', 'lower-back']), 'Lumbares, glúteos e isquiotibiales');
});
