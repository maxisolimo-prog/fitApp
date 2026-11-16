import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import { SYNC_KEY, SyncService } from '../src/app/core/sync.service';
import { WorkoutStore } from '../src/app/core/workout-store';
import { createInitialState, type FitAppState } from '../src/app/core/workout-utils';

/** In-memory stand-in for the API: same contract as api/src/app.ts. */
class FakeServer {
  revision = 0;
  state: FitAppState | null = null;
  loggedIn = false;
  offline = false;
  puts = 0;
  fetch = async (path: string | URL | Request, init?: RequestInit): Promise<Response> => {
    if (this.offline) throw new TypeError('Failed to fetch');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const json = (status: number, data?: unknown) => new Response(data === undefined ? null : JSON.stringify(data), { status });
    const url = String(path);
    if (url === '/api/auth/login' || url === '/api/auth/register') { this.loggedIn = true; return json(url.endsWith('register') ? 201 : 200, { email: body.email, revision: this.revision }); }
    if (url === '/api/auth/logout') { this.loggedIn = false; return json(204); }
    if (!this.loggedIn) return json(401, { error: 'Iniciá sesión para continuar.' });
    if (url === '/api/auth/me') return json(200, { email: 'a@b.co', revision: this.revision });
    if (url === '/api/state' && method === 'GET') return json(200, { revision: this.revision, state: this.state });
    if (url === '/api/state' && method === 'PUT') {
      this.puts++;
      if (body.baseRevision !== this.revision) return json(409, { error: 'conflicto', revision: this.revision, state: this.state });
      this.state = structuredClone(body.state);
      this.revision++;
      return json(200, { revision: this.revision });
    }
    return json(404);
  };
}

function withStorage(run: () => Promise<void>): Promise<void> {
  const data = new Map<string, string>();
  const storage = {
    get length() { return data.size; }, clear() { data.clear(); }, key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null, removeItem: (k: string) => { data.delete(k); }, setItem: (k: string, v: string) => { data.set(k, v); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  return run().finally(() => Reflect.deleteProperty(globalThis, 'localStorage'));
}

function serverStateWithWorkout(): FitAppState {
  const state = createInitialState();
  state.profile.name = 'Desde la cuenta';
  return state;
}

test('registering on a device with data uploads it to the empty account', () => withStorage(async () => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  store.updateProfile({ name: 'Local' });
  assert.equal(await sync.register('a@b.co', 'una-clave-larga'), true);
  assert.equal(sync.status(), 'synced');
  assert.equal(server.revision, 1);
  assert.equal(server.state!.profile.name, 'Local');
  assert.deepEqual(JSON.parse(localStorage.getItem(SYNC_KEY)!), { email: 'a@b.co', revision: 1, dirty: false });
}));

test('logging in on a fresh device takes the account data without asking', () => withStorage(async () => {
  const server = new FakeServer();
  server.state = serverStateWithWorkout();
  server.revision = 4;
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.login('a@b.co', 'una-clave-larga');
  assert.equal(sync.status(), 'synced');
  assert.equal(store.profile().name, 'Desde la cuenta');
  assert.equal(server.puts, 0);
}));

test('logging in on a device with its own data asks which copy to keep', () => withStorage(async () => {
  const server = new FakeServer();
  server.state = serverStateWithWorkout();
  server.revision = 2;
  const store = new WorkoutStore();
  store.updateProfile({ name: 'Local' });
  const sync = new SyncService(store, server.fetch);
  await sync.login('a@b.co', 'una-clave-larga');
  assert.equal(sync.status(), 'conflict');
  assert.equal(store.profile().name, 'Local', 'nothing is replaced before the user decides');

  await sync.resolveConflict('local');
  assert.equal(sync.status(), 'synced');
  assert.equal(server.state!.profile.name, 'Local');
  assert.equal(server.revision, 3);
}));

test('choosing the account copy replaces local data and clears the pending flag', () => withStorage(async () => {
  const server = new FakeServer();
  server.state = serverStateWithWorkout();
  server.revision = 2;
  const store = new WorkoutStore();
  store.updateProfile({ name: 'Local' });
  const sync = new SyncService(store, server.fetch);
  await sync.login('a@b.co', 'una-clave-larga');
  await sync.resolveConflict('server');
  assert.equal(store.profile().name, 'Desde la cuenta');
  assert.equal(JSON.parse(localStorage.getItem(SYNC_KEY)!).dirty, false);
  assert.equal(server.revision, 2);
}));

test('offline changes stay pending and are sent on the next sync', () => withStorage(async () => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  server.offline = true;
  store.updateProfile({ name: 'Sin red' });
  sync.flush();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sync.status(), 'offline');
  assert.equal(JSON.parse(localStorage.getItem(SYNC_KEY)!).dirty, true);

  server.offline = false;
  await sync.syncNow();
  assert.equal(sync.status(), 'synced');
  assert.equal(server.state!.profile.name, 'Sin red');
}));

test('another device writing first is applied when this one has no pending changes', () => withStorage(async () => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  server.state = serverStateWithWorkout();
  server.revision++;
  await sync.syncNow();
  assert.equal(store.profile().name, 'Desde la cuenta');
  assert.equal(sync.status(), 'synced');
}));

test('an expired session signs out but keeps the local data', () => withStorage(async () => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  store.updateProfile({ name: 'Mío' });
  server.loggedIn = false;
  const restarted = new SyncService(store, server.fetch);
  await restarted.init();
  assert.equal(restarted.account(), null);
  assert.equal(restarted.status(), 'local');
  assert.ok(restarted.error());
  assert.equal(store.profile().name, 'Mío');
  assert.equal(localStorage.getItem(SYNC_KEY), null);
}));
