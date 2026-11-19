import assert from 'node:assert/strict';
import test from 'node:test';
import { isMuscleId, MUSCLE_IDS, MUSCLE_LABELS, muscleNames, muscleSentence } from '../src/app/core/muscles';
import { seedExercises } from '../src/app/core/seed';
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

test('los nombres salen en el orden de la lista y se leen de corrido', () => {
  assert.deepEqual(muscleNames(['triceps', 'chest', 'deltoids']), ['Deltoides', 'Pecho', 'Tríceps']);
  assert.equal(muscleSentence([]), '');
  assert.equal(muscleSentence(['chest']), 'Pecho');
  assert.equal(muscleSentence(['triceps', 'chest']), 'Pecho y tríceps');
  assert.equal(muscleSentence(['triceps', 'chest', 'deltoids']), 'Deltoides, pecho y tríceps');
  assert.equal(muscleSentence(['upper-back', 'biceps']), 'Dorsales y bíceps');
  assert.equal(muscleSentence(['gluteal', 'hamstring', 'lower-back']), 'Lumbares, glúteos e isquiotibiales');
});
