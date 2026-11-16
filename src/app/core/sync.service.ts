import { Injectable, computed, inject, signal } from '@angular/core';
import { WorkoutStore } from './workout-store';
import { createInitialState, serializeState, type FitAppState } from './workout-utils';

export const SYNC_KEY = 'fitapp-sync-v1';

export type SyncStatus = 'local' | 'checking' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict';

/** Persisted beside the data: which account this device follows and whether it has unsent changes. */
interface SyncMeta {
  email: string;
  /** Server revision the local data is based on; null until the first pull after login. */
  revision: number | null;
  dirty: boolean;
}

export interface SyncConflict {
  revision: number;
  server: FitAppState;
  serverWorkouts: number;
  localWorkouts: number;
}

type Fetch = typeof fetch;
interface ApiResult { status: number; data: Record<string, unknown> | null }

const DEBOUNCE_MS = 1500;

/**
 * Optional account sync. The device keeps working with localStorage; when signed in, every local
 * change is pushed as a full snapshot with the revision it was based on. A different revision on
 * the server means another device wrote first: if this device has unsent changes the user chooses
 * which copy to keep, otherwise the server copy is applied.
 */
@Injectable({ providedIn: 'root', useFactory: () => new SyncService(inject(WorkoutStore)) })
export class SyncService {
  readonly account = signal<string | null>(null);
  readonly status = signal<SyncStatus>('local');
  readonly error = signal<string | null>(null);
  readonly conflict = signal<SyncConflict | null>(null);
  readonly busy = computed(() => this.status() === 'checking' || this.status() === 'syncing');

  private meta: SyncMeta | null = this.readMeta();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pushing = false;
  private pushAgain = false;
  /** Bumped on every local change, so a change made while a push is in flight stays dirty. */
  private changeCounter = 0;

  constructor(private readonly store: WorkoutStore, private readonly http: Fetch = (...args) => fetch(...args)) {
    store.onChange = () => this.localChanged();
    if (this.meta) this.account.set(this.meta.email);
  }

  /** On startup: confirm the session and catch up with the server. */
  async init(): Promise<void> {
    if (!this.meta) return;
    this.status.set('checking');
    const me = await this.request('GET', '/api/auth/me');
    if (!me) return;
    if (me.status === 401) { this.signedOut('Tu sesión venció. Ingresá de nuevo para sincronizar.'); return; }
    if (me.status !== 200) { this.fail(me); return; }
    await this.pull();
  }

  login(email: string, password: string): Promise<boolean> { return this.authenticate('/api/auth/login', email, password); }
  register(email: string, password: string): Promise<boolean> { return this.authenticate('/api/auth/register', email, password); }

  async logout(): Promise<void> {
    clearTimeout(this.timer);
    await this.request('POST', '/api/auth/logout', {});
    this.signedOut(null);
  }

  async deleteAccount(password: string): Promise<boolean> {
    const result = await this.request('DELETE', '/api/account', { password });
    if (!result) return false;
    if (result.status !== 204) { this.error.set(this.message(result, 'No pudimos eliminar la cuenta.')); return false; }
    this.signedOut(null);
    return true;
  }

  /** Manual "Sincronizar ahora". */
  async syncNow(): Promise<void> {
    if (!this.meta) return;
    clearTimeout(this.timer);
    await this.pull();
  }

  /** The user decided which copy wins after a conflict. */
  async resolveConflict(keep: 'server' | 'local'): Promise<void> {
    const conflict = this.conflict();
    if (!conflict || !this.meta) return;
    this.conflict.set(null);
    if (keep === 'server') {
      if (this.store.replaceState(conflict.server)) this.saveMeta({ ...this.meta, revision: conflict.revision, dirty: false });
      this.status.set('synced');
      return;
    }
    this.saveMeta({ ...this.meta, revision: conflict.revision, dirty: true });
    await this.push();
  }

  /** Immediately sends pending changes; the app calls it when the page is about to be hidden. */
  flush(): void {
    if (this.meta?.dirty && this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined; void this.push(); }
  }

  private localChanged(): void {
    this.changeCounter++;
    if (!this.meta) return;
    if (!this.meta.dirty) this.saveMeta({ ...this.meta, dirty: true });
    if (this.status() === 'conflict') return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; void this.push(); }, DEBOUNCE_MS);
  }

  private async authenticate(path: string, email: string, password: string): Promise<boolean> {
    this.error.set(null);
    this.status.set('checking');
    const result = await this.request('POST', path, { email, password });
    if (!result) return false;
    if (result.status !== 200 && result.status !== 201) {
      this.status.set('local');
      this.error.set(this.message(result, 'No pudimos ingresar. Probá de nuevo.'));
      return false;
    }
    const serverEmail = typeof result.data?.['email'] === 'string' ? result.data['email'] as string : email.trim().toLowerCase();
    // A device with its own data must not be silently replaced by the account's copy.
    this.saveMeta({ email: serverEmail, revision: null, dirty: !this.isPristine() });
    this.account.set(serverEmail);
    await this.pull();
    return true;
  }

  private async pull(): Promise<void> {
    if (!this.meta) return;
    this.status.set('checking');
    const result = await this.request('GET', '/api/state');
    if (!result) return;
    if (result.status === 401) { this.signedOut('Tu sesión venció. Ingresá de nuevo para sincronizar.'); return; }
    if (result.status !== 200 || !result.data) { this.fail(result); return; }
    const revision = Number(result.data['revision']);
    const server = result.data['state'] as FitAppState | null;
    if (server === null) {
      // Empty account: this device's data becomes the account's data.
      this.saveMeta({ ...this.meta, revision: 0, dirty: true });
      await this.push();
      return;
    }
    if (revision === this.meta.revision) {
      if (this.meta.dirty) await this.push(); else this.status.set('synced');
      return;
    }
    this.serverIsNewer(revision, server);
  }

  private serverIsNewer(revision: number, server: FitAppState): void {
    if (!this.meta) return;
    if (this.meta.dirty && serializeState(server) !== serializeState(this.store.snapshot())) {
      this.conflict.set({ revision, server, serverWorkouts: server.history.length, localWorkouts: this.store.history().length });
      this.status.set('conflict');
      return;
    }
    if (this.store.replaceState(server)) {
      this.saveMeta({ ...this.meta, revision, dirty: false });
      this.status.set('synced');
    } else {
      this.status.set('error');
      this.error.set(this.store.actionError());
    }
  }

  private async push(): Promise<void> {
    if (!this.meta || this.meta.revision === null) return;
    if (this.pushing) { this.pushAgain = true; return; }
    this.pushing = true;
    this.status.set('syncing');
    const sentAt = this.changeCounter;
    try {
      const result = await this.request('PUT', '/api/state', { baseRevision: this.meta.revision, state: this.store.snapshot() });
      if (!result || !this.meta) return;
      if (result.status === 200 && result.data) {
        const dirty = this.changeCounter !== sentAt;
        this.saveMeta({ ...this.meta, revision: Number(result.data['revision']), dirty });
        this.status.set('synced');
        if (dirty) this.pushAgain = true;
      } else if (result.status === 409 && result.data) {
        this.serverIsNewer(Number(result.data['revision']), result.data['state'] as FitAppState);
      } else if (result.status === 401) {
        this.signedOut('Tu sesión venció. Ingresá de nuevo para sincronizar.');
      } else {
        this.fail(result);
      }
    } finally {
      this.pushing = false;
      if (this.pushAgain && this.status() === 'synced') { this.pushAgain = false; void this.push(); }
      this.pushAgain = false;
    }
  }

  /** null means the request never reached the server; status is then 'offline'. */
  private async request(method: string, path: string, body?: unknown): Promise<ApiResult | null> {
    try {
      const response = await this.http(path, {
        method, credentials: 'same-origin',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      let data: Record<string, unknown> | null = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      return { status: response.status, data };
    } catch {
      this.status.set('offline');
      this.error.set('No hay conexión con el servidor. Tus cambios quedan en este dispositivo y se envían al volver.');
      return null;
    }
  }

  private fail(result: ApiResult): void {
    this.status.set('error');
    this.error.set(this.message(result, 'No pudimos sincronizar. Tus datos siguen guardados en este dispositivo.'));
  }

  private message(result: ApiResult, fallback: string): string {
    return typeof result.data?.['error'] === 'string' ? result.data['error'] as string : fallback;
  }

  private signedOut(message: string | null): void {
    clearTimeout(this.timer);
    this.saveMeta(null);
    this.account.set(null);
    this.conflict.set(null);
    this.status.set('local');
    this.error.set(message);
  }

  private isPristine(): boolean {
    return serializeState(this.store.snapshot()) === serializeState(createInitialState());
  }

  private readMeta(): SyncMeta | null {
    try {
      const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(SYNC_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw) as Partial<SyncMeta>;
      if (typeof value.email !== 'string' || typeof value.dirty !== 'boolean'
        || !(value.revision === null || (typeof value.revision === 'number' && Number.isInteger(value.revision) && value.revision >= 0))) return null;
      return { email: value.email, revision: value.revision, dirty: value.dirty };
    } catch { return null; }
  }

  private saveMeta(meta: SyncMeta | null): void {
    this.meta = meta;
    try {
      if (meta) localStorage.setItem(SYNC_KEY, JSON.stringify(meta));
      else localStorage.removeItem(SYNC_KEY);
    } catch { /* storage errors are already surfaced by WorkoutStore */ }
  }
}
