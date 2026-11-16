import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import type { Pool } from 'mysql2/promise';
import { createApp } from '../src/app.ts';
import { dbConfig } from '../src/config.ts';
import { createPool } from '../src/db.ts';
import { migrate } from '../src/migrate.ts';
import { buildWorkout, completeWorkout, createInitialState } from '../../src/app/core/workout-utils.ts';

let pool: Pool;
let server: Server;
let base = '';

before(async () => {
  pool = createPool(dbConfig(true));
  // Clean slate in the test database only.
  const [tables] = await pool.query('SHOW TABLES');
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const row of tables as Record<string, string>[]) await pool.query(`DROP TABLE \`${Object.values(row)[0]}\``);
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  await migrate(pool);
  server = createApp(pool, { limitScale: 100 }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

class Client {
  cookie = '';
  async call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const response = await fetch(base + path, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0].endsWith('=') ? '' : setCookie.split(';')[0];
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null, setCookie };
  }
}

let emailCounter = 0;
const email = () => `alumno${++emailCounter}-${Date.now()}@example.com`;

function sampleState() {
  const state = createInitialState();
  state.profile.name = 'María';
  state.profile.weight = 68.5;
  const done = buildWorkout(state.routines[0], 'workout-done', '2026-11-15T12:00:00.000Z');
  done.sets[0].completed = true;
  done.sets[0].weight = 22.5;
  state.history = [completeWorkout(done, '2026-11-15T12:40:00.000Z')!];
  state.activeWorkout = buildWorkout(state.routines[1], 'workout-active', '2026-11-16T13:00:00.000Z');
  state.activeWorkout.sets[1].completed = true;
  state.schedule = [{ id: 'plan-1', date: '2026-11-17', routineId: 'lower-body' }];
  state.weeklyPlan = ['upper-body', null, 'lower-body', null, 'full-body', null, null];
  state.weights = [{ id: 'weight-1', date: '2026-11-16', weight: 68.5 }];
  state.routines.push({ ...state.routines[0], id: 'custom-1', name: 'Mi rutina', custom: true, exercises: state.routines[0].exercises.map((e) => ({ ...e, weight: 12.5 })) });
  return state;
}

test('register, session cookie, me and logout', async () => {
  const client = new Client();
  const address = email();
  const registered = await client.call('POST', '/api/auth/register', { email: address, password: 'una-clave-larga' });
  assert.equal(registered.status, 201);
  assert.match(registered.setCookie ?? '', /HttpOnly/i);
  assert.match(registered.setCookie ?? '', /SameSite=Lax/i);
  assert.match(registered.setCookie ?? '', /Path=\/api/i);
  const me = await client.call('GET', '/api/auth/me');
  assert.deepEqual(me.data, { email: address, revision: 0 });
  assert.equal((await client.call('POST', '/api/auth/logout', {})).status, 204);
  assert.equal((await client.call('GET', '/api/auth/me')).status, 401);
});

test('register rejects duplicates, short passwords and bad emails; login checks the password', async () => {
  const client = new Client();
  const address = email();
  assert.equal((await client.call('POST', '/api/auth/register', { email: address, password: 'corta' })).status, 400);
  assert.equal((await client.call('POST', '/api/auth/register', { email: 'no-es-email', password: 'una-clave-larga' })).status, 400);
  assert.equal((await client.call('POST', '/api/auth/register', { email: address, password: 'una-clave-larga' })).status, 201);
  assert.equal((await new Client().call('POST', '/api/auth/register', { email: address.toUpperCase(), password: 'otra-clave-larga' })).status, 409);
  assert.equal((await new Client().call('POST', '/api/auth/login', { email: address, password: 'incorrecta-123' })).status, 401);
  assert.equal((await new Client().call('POST', '/api/auth/login', { email: 'nadie@example.com', password: 'incorrecta-123' })).status, 401);
  const login = await new Client().call('POST', '/api/auth/login', { email: ` ${address.toUpperCase()} `, password: 'una-clave-larga' });
  assert.equal(login.status, 200);
});

test('state requires a session and non-JSON writes are refused', async () => {
  assert.equal((await new Client().call('GET', '/api/state')).status, 401);
  const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'email=a@b.co&password=x' });
  assert.equal(response.status, 415);
});

test('a full state round trips through the relational tables exactly', async () => {
  const client = new Client();
  await client.call('POST', '/api/auth/register', { email: email(), password: 'una-clave-larga' });
  assert.deepEqual((await client.call('GET', '/api/state')).data, { revision: 0, state: null });
  const state = sampleState();
  const saved = await client.call('PUT', '/api/state', { baseRevision: 0, state });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.revision, 1);
  const loaded = await client.call('GET', '/api/state');
  assert.equal(loaded.data.revision, 1);
  assert.deepEqual(loaded.data.state, state);
});

test('stale revisions get 409 with the current server data; invalid states get 422 and change nothing', async () => {
  const client = new Client();
  await client.call('POST', '/api/auth/register', { email: email(), password: 'una-clave-larga' });
  const state = sampleState();
  await client.call('PUT', '/api/state', { baseRevision: 0, state });
  const stale = await client.call('PUT', '/api/state', { baseRevision: 0, state: createInitialState() });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.revision, 1);
  assert.deepEqual(stale.data.state, state);

  const invalid = structuredClone(state) as unknown as { routines: { exercises: { exerciseId: string }[] }[] };
  invalid.routines[0].exercises[0].exerciseId = 'inexistente';
  assert.equal((await client.call('PUT', '/api/state', { baseRevision: 1, state: invalid })).status, 422);
  assert.equal((await client.call('PUT', '/api/state', { baseRevision: 1 })).status, 422);
  assert.equal((await client.call('PUT', '/api/state', { state })).status, 400);
  assert.deepEqual((await client.call('GET', '/api/state')).data, { revision: 1, state });
});

test('users only ever see their own data', async () => {
  const alice = new Client();
  const bob = new Client();
  await alice.call('POST', '/api/auth/register', { email: email(), password: 'una-clave-larga' });
  await bob.call('POST', '/api/auth/register', { email: email(), password: 'una-clave-larga' });
  const state = sampleState();
  await alice.call('PUT', '/api/state', { baseRevision: 0, state });
  // Same client-generated ids in another account must not collide.
  assert.equal((await bob.call('PUT', '/api/state', { baseRevision: 0, state: createInitialState() })).status, 200);
  assert.deepEqual((await bob.call('GET', '/api/state')).data.state, createInitialState());
  assert.deepEqual((await alice.call('GET', '/api/state')).data.state, state);
});

test('deleting the account requires the password and removes every row', async () => {
  const client = new Client();
  const address = email();
  await client.call('POST', '/api/auth/register', { email: address, password: 'una-clave-larga' });
  await client.call('PUT', '/api/state', { baseRevision: 0, state: sampleState() });
  assert.equal((await client.call('DELETE', '/api/account', { password: 'otra-cosa-123' })).status, 401);
  assert.equal((await client.call('DELETE', '/api/account', { password: 'una-clave-larga' })).status, 204);
  const [rows] = await pool.query('SELECT COUNT(*) AS n FROM users WHERE email = ?', [address]);
  assert.equal(Number((rows as { n: number }[])[0].n), 0);
  const [orphans] = await pool.query('SELECT (SELECT COUNT(*) FROM workouts w LEFT JOIN users u ON u.id = w.user_id WHERE u.id IS NULL) AS n');
  assert.equal(Number((orphans as { n: number }[])[0].n), 0);
});

test('login attempts are rate limited per email and IP', async () => {
  const limited = createApp(pool).listen(0, '127.0.0.1');
  await new Promise((resolve) => limited.once('listening', resolve));
  const url = `http://127.0.0.1:${(limited.address() as AddressInfo).port}/api/auth/login`;
  const attempt = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'objetivo@example.com', password: 'probando-123' }) });
  const statuses: number[] = [];
  for (let i = 0; i < 11; i++) statuses.push((await attempt()).status);
  await new Promise((resolve) => limited.close(resolve));
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
  assert.equal(statuses[10], 429);
});

test('ids that differ only in case, accents or trailing spaces are distinct rows', async () => {
  const client = new Client();
  await client.call('POST', '/api/auth/register', { email: email(), password: 'una-clave-larga' });
  const state = createInitialState();
  const base = state.routines[0];
  state.routines.push({ ...base, id: base.id.toUpperCase(), name: 'Mayúsculas' }, { ...base, id: base.id + ' ', name: 'Con espacio' });
  state.weights = [{ id: 'ss', date: '2026-11-15', weight: 70 }, { id: 'ß', date: '2026-11-16', weight: 71 }];
  state.schedule = [{ id: 'p', date: '2026-11-17', routineId: base.id }, { id: 'P', date: '2026-11-18', routineId: base.id }];
  assert.equal((await client.call('PUT', '/api/state', { baseRevision: 0, state })).status, 200);
  assert.deepEqual((await client.call('GET', '/api/state')).data.state, state);
});

test('emails compare exactly after lowercase normalisation; login returns the stored email', async () => {
  const address = `acento-${Date.now()}@example.com`;
  assert.equal((await new Client().call('POST', '/api/auth/register', { email: address, password: 'una-clave-larga' })).status, 201);
  assert.equal((await new Client().call('POST', '/api/auth/register', { email: address.replace('acento', 'acentó'), password: 'una-clave-larga' })).status, 201);
  const login = await new Client().call('POST', '/api/auth/login', { email: address.toUpperCase(), password: 'una-clave-larga' });
  assert.equal(login.data.email, address);
});

test('bodies are size-limited per route and parser errors keep their 4xx status', async () => {
  const huge = 'x'.repeat(20_000);
  assert.equal((await new Client().call('POST', '/api/auth/login', { email: huge, password: 'x' })).status, 413);
  const client = new Client();
  await client.call('POST', '/api/auth/register', { email: email(), password: 'una-clave-larga' });
  const big = createInitialState();
  big.routines[0].description = 'y'.repeat(2000);
  const tooBig = { baseRevision: 0, state: big, padding: 'z'.repeat(6_100_000) };
  assert.equal((await client.call('PUT', '/api/state', tooBig)).status, 413);
  const charset = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-16' }, body: '{}' });
  assert.ok(charset.status >= 400 && charset.status < 500, `status ${charset.status}`);
});

test('weekly plan and one-off rest days are stored', async () => {
  const client = new Client();
  await client.call('POST', '/api/auth/register', { email: email(), password: 'una-clave-larga' });
  const state = createInitialState();
  state.weeklyPlan = ['upper-body', null, null, 'lower-body', null, null, 'at-home'];
  state.schedule = [{ id: 'rest', date: '2026-11-16', routineId: null }, { id: 'extra', date: '2026-11-18', routineId: 'full-body' }];
  assert.equal((await client.call('PUT', '/api/state', { baseRevision: 0, state })).status, 200);
  assert.deepEqual((await client.call('GET', '/api/state')).data.state, state);
});
