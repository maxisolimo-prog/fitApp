import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { EXERCISE_MEDIA } from '../src/app/core/exercise-media';
import { seedExercises } from '../src/app/core/seed';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const completed = json('docs/exercise-demo-prompts-completion.json');
const original = json('docs/exercise-demo-prompts.json');

test('los 48 ejercicios tienen archivos locales de video y poster correspondientes a su variante', () => {
  assert.deepEqual(Object.keys(EXERCISE_MEDIA).sort(), seedExercises.map(e => e.id).sort());
  for (const exercise of seedExercises) {
    const media = EXERCISE_MEDIA[exercise.id]!;
    assert.equal(media.video, `exercise-demos/${exercise.id}.webm`);
    assert.ok(media.poster.startsWith(`exercise-demos/${exercise.id}.`));
    assert.ok(media.description.length > 15);
    for (const path of [media.video, media.poster, ...(media.gif ? [media.gif] : [])]) {
      assert.ok(statSync('public/' + path).size > 1000, path);
    }
    assert.equal(readFileSync('public/' + media.video).readUInt32BE(0), 0x1a45dfa3, exercise.id);
  }
});

test('la galería permite revisar exactamente los mismos medios que las fichas', () => {
  const catalog = json('public/exercise-demos/catalog.json');
  assert.deepEqual(catalog.map((e: {id: string}) => e.id).sort(), Object.keys(EXERCISE_MEDIA).sort());
  for (const entry of catalog) {
    const {id, title, equipment, muscle, ...media} = entry;
    assert.equal(title, seedExercises.find(e => e.id === id)?.name);
    assert.deepEqual(media, EXERCISE_MEDIA[id], id);
  }
});

function gifMetadata(gif: Buffer) {
  assert.equal(gif.toString('ascii', 0, 6), 'GIF89a');
  const palette = (packed: number) => packed & 128 ? 3 * (1 << ((packed & 7) + 1)) : 0;
  let cursor = 13 + palette(gif[10]), frames = 0, ticks = 0, loop = false;
  const skipBlocks = () => {
    while (gif[cursor]) { cursor += 1 + gif[cursor]; assert.ok(cursor < gif.length); }
    cursor++;
  };
  while (cursor < gif.length && gif[cursor] !== 0x3b) {
    if (gif[cursor] === 0x21) {
      const type = gif[cursor + 1];
      if (type === 0xf9) {
        const delay = gif.readUInt16LE(cursor + 4);
        assert.ok(delay > 0); ticks += delay;
      }
      if (type === 0xff && gif.toString('ascii', cursor + 3, cursor + 14) === 'NETSCAPE2.0') {
        assert.equal(gif.readUInt16LE(cursor + 16), 0); loop = true;
      }
      cursor += 2; skipBlocks();
    } else {
      assert.equal(gif[cursor], 0x2c);
      cursor += 10 + palette(gif[cursor + 9]) + 1; skipBlocks(); frames++;
    }
  }
  assert.equal(gif[cursor], 0x3b);
  return {frames, seconds: ticks / 100, loop, width: gif.readUInt16LE(6), height: gif.readUInt16LE(8)};
}

test('los 41 GIF nuevos y los seis anteriores contienen múltiples cuadros con duración y bucle válidos', () => {
  assert.equal(completed.entries.length, 41);
  const entries = [...original.entries, ...completed.entries];
  assert.equal(new Set(entries.map(e => e.id)).size, 47);
  assert.equal(Object.values(EXERCISE_MEDIA).filter(e => e?.gif).length, 47);
  for (const entry of entries) {
    const meta = gifMetadata(readFileSync('public/' + EXERCISE_MEDIA[entry.id]!.gif));
    assert.ok(meta.frames > 1, entry.id);
    assert.equal(meta.frames, entry.frames, entry.id);
    assert.equal(meta.seconds, entry.seconds, entry.id);
    assert.deepEqual([meta.width, meta.height, meta.loop], [512, 512, true], entry.id);
    assert.ok(entry.prompt && entry.source, entry.id);
  }
});
