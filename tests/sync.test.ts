import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import { SyncService } from '../src/app/core/sync.service';
import { WorkoutStore } from '../src/app/core/workout-store';
import { buildWorkout, completeWorkout, createInitialState, STORAGE_KEY, type FitAppState } from '../src/app/core/workout-utils';

/** In-memory stand-in for the API: same contract as api/src/app.ts. */
class FakeServer {
  revision = 0;
  state: FitAppState | null = null;
  loggedIn = false;
  offline = false;
  puts = 0;
  /** When set, PUT waits for this promise before answering (to test overlapping requests). */
  holdPut: Promise<void> | null = null;
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
      const base = this.revision;
      if (this.holdPut) await this.holdPut;
      if (body.baseRevision !== base || body.baseRevision !== this.revision) return json(409, { error: 'conflicto', revision: this.revision, state: this.state });
      this.state = structuredClone(body.state);
      this.revision++;
      return json(200, { revision: this.revision });
    }
    return json(404);
  };
}

class MemoryStorage {
  data = new Map<string, string>();
  failWrites = false;
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; }
  removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) { if (this.failWrites) throw new Error('QuotaExceededError'); this.data.set(k, v); }
}

function withStorage(run: (storage: MemoryStorage) => Promise<void>): Promise<void> {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  return run(storage).finally(() => Reflect.deleteProperty(globalThis, 'localStorage'));
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function accountState(): FitAppState {
  const state = createInitialState();
  state.profile.name = 'Desde la cuenta';
  return state;
}

function finishOneWorkout(store: WorkoutStore): void {
  assert.equal(store.startWorkout('upper-body'), true);
  assert.equal(store.toggleSet(0), true);
  assert.ok(store.finishWorkout());
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
  assert.deepEqual(store.syncMeta(), { email: 'a@b.co', revision: 1, dirty: false, signedIn: true });
}));

test('data and sync metadata are stored in one localStorage entry', () => withStorage(async (storage) => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  const stored = JSON.parse(storage.getItem(STORAGE_KEY)!);
  assert.deepEqual(stored.sync, { email: 'a@b.co', revision: 1, dirty: false, signedIn: true });
  assert.equal(JSON.parse(store.exportJson()).sync, undefined, 'backups never include account data');
  assert.equal(storage.length, 1);
}));

test('logging in on a fresh device takes the account data without asking', () => withStorage(async () => {
  const server = new FakeServer();
  server.state = accountState();
  server.revision = 4;
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.login('a@b.co', 'una-clave-larga');
  assert.equal(sync.status(), 'synced');
  assert.equal(store.profile().name, 'Desde la cuenta');
  assert.equal(server.puts, 0);
}));

test('a device left empty by an earlier version (other template durations) still takes the account data without asking', () => withStorage(async (storage) => {
  // Hasta B-07 las plantillas guardaban 45, 40, 35 y 25 minutos. Cerrar sesión deja guardado el estado de fábrica
  // de la versión que corría en ese momento.
  const old = createInitialState();
  old.routines.forEach((routine, index) => { routine.duration = [45, 40, 35, 25][index]; });
  storage.setItem(STORAGE_KEY, JSON.stringify(old));
  const server = new FakeServer();
  const account = accountState();
  const done = buildWorkout(account.routines[0], 'w-account', '2026-11-10T10:00:00.000Z');
  done.sets[0].completed = true;
  account.history = [completeWorkout(done, '2026-11-10T10:40:00.000Z')!];
  server.state = account;
  server.revision = 4;
  const store = new WorkoutStore();
  assert.equal(store.routines()[0].duration, 45);
  const sync = new SyncService(store, server.fetch);
  await sync.login('a@b.co', 'una-clave-larga');
  assert.equal(sync.status(), 'synced', 'no false conflict');
  assert.equal(sync.conflict(), null);
  assert.equal(store.profile().name, 'Desde la cuenta');
  assert.equal(store.history().length, 1);
  assert.equal(server.puts, 0, 'the account is not overwritten');
}));

test('logging in on a device with its own data asks which copy to keep', () => withStorage(async () => {
  const server = new FakeServer();
  server.state = accountState();
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
  server.state = accountState();
  server.revision = 2;
  const store = new WorkoutStore();
  store.updateProfile({ name: 'Local' });
  const sync = new SyncService(store, server.fetch);
  await sync.login('a@b.co', 'una-clave-larga');
  await sync.resolveConflict('server');
  assert.equal(store.profile().name, 'Desde la cuenta');
  assert.equal(store.syncMeta()!.dirty, false);
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
  await tick();
  assert.equal(sync.status(), 'offline');
  assert.equal(store.syncMeta()!.dirty, true);
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
  server.state = accountState();
  server.revision++;
  await sync.syncNow();
  assert.equal(store.profile().name, 'Desde la cuenta');
  assert.equal(sync.status(), 'synced');
}));

test('a quota error cannot make an old local copy overwrite the account (review #1)', () => withStorage(async (storage) => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  storage.failWrites = true;
  finishOneWorkout(store);
  sync.flush();
  await sync.syncNow();
  assert.equal(server.state!.history.length, 1, 'the workout reached the server');
  // Reload: storage still holds the old data *and* the old revision, together.
  storage.failWrites = false;
  const reloaded = new WorkoutStore();
  const reloadedSync = new SyncService(reloaded, server.fetch);
  assert.equal(reloaded.history().length, 0);
  await reloadedSync.init();
  assert.equal(reloaded.history().length, 1, 'the newer account copy is applied');
  reloaded.updateProfile({ name: 'Después' });
  reloadedSync.flush();
  await reloadedSync.syncNow();
  assert.equal(server.state!.history.length, 1, 'the workout is still on the server');
}));

test('unreadable local data never overwrites the account (review #2)', () => withStorage(async (storage) => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  finishOneWorkout(store);
  sync.flush();
  await sync.syncNow();
  const stored = JSON.parse(storage.getItem(STORAGE_KEY)!);
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, version: 99 }));
  const reloaded = new WorkoutStore();
  assert.ok(reloaded.storageError());
  const reloadedSync = new SyncService(reloaded, server.fetch);
  assert.equal(reloadedSync.account(), null, 'the account link is not trusted without valid data');
  await reloadedSync.init();
  reloaded.updateProfile({ name: 'Edición' });
  await tick();
  assert.equal(server.state!.history.length, 1);
  await reloadedSync.login('a@b.co', 'una-clave-larga');
  assert.equal(reloadedSync.status(), 'conflict', 'this device has its own edits, so the user is asked');
  assert.equal(server.state!.history.length, 1, 'signing in again does not erase the account');
}));

test('a sync requested while a push is in flight waits for it instead of raising a false conflict (review #4)', () => withStorage(async () => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  let release!: () => void;
  server.holdPut = new Promise((resolve) => { release = resolve; });
  store.updateProfile({ name: 'Uno' });
  sync.flush();
  await tick();
  store.updateProfile({ name: 'Dos' });
  const manual = sync.syncNow();
  release();
  server.holdPut = null;
  await manual;
  assert.notEqual(sync.status(), 'conflict');
  assert.equal(sync.conflict(), null);
  sync.flush();
  await sync.syncNow();
  assert.equal(server.state!.profile.name, 'Dos');
  assert.equal(store.profile().name, 'Dos');
}));

test('signing out sends pending changes and then clears the device (review #8, #13)', () => withStorage(async () => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  finishOneWorkout(store);
  assert.equal(await sync.logout(), true);
  assert.equal(server.state!.history.length, 1, 'pending work was sent before signing out');
  assert.equal(store.history().length, 0, 'the next person does not inherit the data');
  assert.equal(store.syncMeta(), null);
  assert.equal(sync.account(), null);
}));

test('signing out offline with pending changes is refused and erases nothing', () => withStorage(async () => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  server.offline = true;
  finishOneWorkout(store);
  assert.equal(await sync.logout(), false);
  assert.equal(store.history().length, 1);
  assert.ok(sync.error());
}));

test('after an expired session, signing in to the same account resumes without a conflict (review #8)', () => withStorage(async () => {
  const server = new FakeServer();
  const store = new WorkoutStore();
  const sync = new SyncService(store, server.fetch);
  await sync.register('a@b.co', 'una-clave-larga');
  server.loggedIn = false;
  store.updateProfile({ name: 'Mío' });
  await sync.syncNow();
  assert.equal(sync.account(), null);
  assert.ok(sync.error());
  assert.equal(store.profile().name, 'Mío', 'local data kept');
  await sync.login('a@b.co', 'una-clave-larga');
  assert.equal(sync.status(), 'synced');
  assert.equal(server.state!.profile.name, 'Mío');
}));

test('imports are canonicalised so equal data compares equal with the server copy (review #9, #10)', () => withStorage(async () => {
  const store = new WorkoutStore();
  const state = createInitialState();
  const workout = buildWorkout(state.routines[0], 'w1', '2026-11-15T09:00:00-03:00');
  workout.sets[0].completed = true;
  state.history = [completeWorkout(workout, '2026-11-15T09:30:00-03:00')!];
  state.weights = [{ id: 'b', date: '2026-11-16', weight: 70 }, { id: 'a', date: '2026-11-15', weight: 71 }];
  assert.equal(store.importJson(JSON.stringify(state)), true);
  assert.equal(store.history()[0].startedAt, '2026-11-15T12:00:00.000Z');
  assert.deepEqual(store.weights().map((w) => w.id), ['a', 'b']);
  const old = structuredClone(state);
  old.history[0].startedAt = '1969-12-31T23:00:00.000Z';
  assert.equal(store.importJson(JSON.stringify(old)), false, 'pre-1970 sessions are rejected like the API does');
}));
