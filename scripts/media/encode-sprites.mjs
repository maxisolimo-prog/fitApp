import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';

const manifest = JSON.parse(await readFile(process.argv[2] ?? '.cache/remaining-media-ready.json', 'utf8'));
const ffmpegPath = process.env.FFMPEG_PATH ?? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright/ffmpeg-1011/ffmpeg-win64.exe');
const tableSize = packed => packed & 128 ? 3 * (1 << ((packed & 7) + 1)) : 0;
const endOfBlocks = (gif, from) => {
  let cursor = from;
  while (gif[cursor]) cursor += 1 + gif[cursor];
  assert.ok(cursor < gif.length);
  return cursor + 1;
};
for (const task of manifest.entries) {
  const count = task.columns * task.rows;
  const order = Array.from({ length: count }, (_, i) => i);
  if (task.cycle === 'reverse') order.push(...Array.from({ length: count - 2 }, (_, i) => count - 2 - i));
  // Strength loops last 3.6 seconds; walking and stairs complete a cycle in 1.8 seconds.
  const delays = task.delays ?? order.map(index => task.cycle === 'reverse' ? (index === 0 || index === count - 1 ? 60 : 30) : 180 / count);
  const base = 'public/exercise-demos/' + task.id;
  const gif = await readFile(base + '.gif');
  let start = 13 + tableSize(gif[10]);
  const header = Buffer.from(gif.subarray(0, start));
  header.write('GIF89a');
  const chunks = [header, Buffer.from([33,255,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0])];
  let frame = 0;
  while (start < gif.length) {
    const marker = gif[start];
    if (marker === 0x21) {
      const end = endOfBlocks(gif, start + 2);
      if (gif[start + 1] !== 0xf9) chunks.push(gif.subarray(start, end));
      start = end;
    } else if (marker === 0x2c) {
      const delay = delays[frame++];
      chunks.push(Buffer.from([0x21,0xf9,4,4,delay & 255,delay >> 8,0,0]));
      const end = endOfBlocks(gif, start + 10 + tableSize(gif[start + 9]) + 1);
      chunks.push(gif.subarray(start, end));
      start = end;
    } else {
      assert.equal(marker, 0x3b);
      chunks.push(gif.subarray(start));
      break;
    }
  }
  assert.equal(frame, order.length);
  await writeFile(base + '.gif', Buffer.concat(chunks));
  const ffmpeg = spawn(ffmpegPath, [
    '-y','-loglevel','error','-f','image2pipe','-framerate','20','-vcodec','mjpeg','-i','pipe:0',
    '-an','-c:v','libvpx','-b:v','240k','-crf','18','-pix_fmt','yuv420p','-threads','2',base + '.webm',
  ], { windowsHide: true, stdio: ['pipe', 'ignore', 'inherit'] });
  const done = once(ffmpeg, 'exit');
  for (let i = 0; i < order.length; i++) {
    const jpeg = await readFile('.cache/exercise-demo-frames/' + task.id + '-' + order[i] + '.jpg');
    for (let repeat = 0; repeat < delays[i] / 5; repeat++) {
      if (!ffmpeg.stdin.write(jpeg)) await once(ffmpeg.stdin, 'drain');
    }
  }
  ffmpeg.stdin.end();
  assert.equal((await done)[0], 0);
  task.files = { gif: task.id + '.gif', video: task.id + '.webm', poster: task.id + '.jpg' };
  task.frames = frame;
  task.seconds = delays.reduce((sum, value) => sum + value, 0) / 100;
  task.source = task.source.replaceAll('\\','/').split('/').at(-1);
  if (task.previousSource) task.previousSource = task.previousSource.replaceAll('\\','/').split('/').at(-1);
  delete task.detail;
  console.log(task.id + ' · ' + task.seconds + ' s');
}
await writeFile(process.argv[3] ?? 'docs/exercise-demo-prompts-completion.json', JSON.stringify(manifest, null, 2) + '\n');
