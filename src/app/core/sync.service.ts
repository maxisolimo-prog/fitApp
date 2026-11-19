import { Injectable, computed, inject, signal } from '@angular/core';
import { WorkoutStore, type SyncMeta } from './workout-store';
import { createInitialState, isFactoryState, isNewerVersion, serializeState, validateState, type FitAppState } from './workout-utils';

export type SyncStatus = 'local' | 'checking' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict';

export interface SyncConflict {
  revision: number;
  server: FitAppState;
  serverWorkouts: number;
  localWorkouts: number;
}

type Fetch = typeof fetch;
interface ApiResult { status: number; data: Record<string, unknown> | null }

const DEBOUNCE_MS = 1500;
const EXPIRED = 'Tu sesión venció. Ingresá de nuevo para sincronizar.';
const NEWER_ACCOUNT = 'Tu cuenta tiene datos de una versión más nueva de la app. Actualizá la app para sincronizar; tus cambios quedan en este dispositivo.';

/** Same data must give the same text whatever order its keys were written in: both copies go through the validator. */
function canonical(state: FitAppState): string {
  return serializeState(validateState(state) ?? state);
}

/**
 * Optional account sync. The device keeps working with localStorage; when signed in, every local
 * change is pushed as a full snapshot with the revision it was based on. A different revision on
 * the server means another device wrote first: if this device has unsent changes the user chooses
 * which copy to keep, otherwise the server copy is applied.
 *
 * Invariants:
 * - Data and sync metadata are persisted together by WorkoutStore (one localStorage write).
 * - Pulls and pushes never overlap (one queue), so a pull cannot judge a conflict mid-push.
 * - Nothing replaces local data while it has unsent changes, except an explicit user choice.
 */
@Injectable({ providedIn: 'root', useFactory: () => new SyncService(inject(WorkoutStore)) })
export class SyncService {
  readonly account = signal<string | null>(null);
  readonly status = signal<SyncStatus>('local');
  readonly error = signal<string | null>(null);
  readonly conflict = signal<SyncConflict | null>(null);
  readonly busy = computed(() => this.status() === 'checking' || this.status() === 'syncing');

  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  /** Bumped on every local change, so a change made while a push is in flight is pushed again. */
  private changeCounter = 0;

  constructor(private readonly store: WorkoutStore, private readonly http: Fetch = (...args) => fetch(...args)) {
    store.onChange = () => this.localChanged();
    store.onExternalChange = () => this.refreshAccount();
    this.refreshAccount();
  }

  private get meta(): SyncMeta | null { return this.store.syncMeta(); }
  private set meta(value: SyncMeta | null) { this.store.setSyncMeta(value); this.refreshAccount(); }

  /** On startup: confirm the session and catch up with the server. */
  init(): Promise<void> {
    return this.exclusive(async () => {
      if (!this.meta?.signedIn) return;
      this.status.set('checking');
      const me = await this.request('GET', '/api/auth/me');
      if (!me) return;
      if (me.status === 401) { this.expired(); return; }
      if (me.status !== 200) { this.fail(me); return; }
      await this.pull();
    });
  }

  login(email: string, password: string): Promise<boolean> { return this.authenticate('/api/auth/login', email, password); }
  register(email: string, password: string): Promise<boolean> { return this.authenticate('/api/auth/register', email, password); }

  /**
   * Signing out sends pending changes first and then clears this device: the data stays in the
   * account, and the next person to use the device does not inherit it.
   */
  logout(): Promise<boolean> {
    return this.exclusive(async () => {
      clearTimeout(this.timer);
      const meta = this.meta;
      // Without an active session nothing can be sent, so nothing is erased.
      if (!meta?.signedIn) { this.reset(null); return true; }
      if (this.status() === 'conflict') { this.error.set('Elegí qué datos conservar antes de cerrar sesión.'); return false; }
      if (meta.dirty || meta.revision === null) {
        await this.pushNow();
        if (this.meta?.dirty || this.meta?.revision === null || !this.meta?.signedIn) {
          this.error.set('Todavía hay cambios sin guardar en tu cuenta. Conectate a internet y volvé a intentar.');
          return false;
        }
      }
      await this.request('POST', '/api/auth/logout', {});
      this.store.replaceState(createInitialState(), null);
      this.reset(null);
      return true;
    });
  }

  /** The account is removed on the server; this device keeps its data, unlinked from any account. */
  deleteAccount(password: string): Promise<boolean> {
    return this.exclusive(async () => {
      const result = await this.request('DELETE', '/api/account', { password });
      if (!result) return false;
      if (result.status !== 204) { this.error.set(this.message(result, 'No pudimos eliminar la cuenta.')); return false; }
      clearTimeout(this.timer);
      this.meta = null;
      this.reset(null);
      return true;
    });
  }

  /** Manual "Sincronizar ahora" and the browser coming back online. */
  syncNow(): Promise<void> {
    clearTimeout(this.timer);
    return this.exclusive(() => this.pull());
  }

  /** The user decided which copy wins after a conflict. */
  resolveConflict(keep: 'server' | 'local'): Promise<void> {
    return this.exclusive(async () => {
      const conflict = this.conflict();
      const meta = this.meta;
      if (!conflict || !meta) return;
      this.conflict.set(null);
      this.status.set('checking');
      if (keep === 'server') {
        if (this.store.replaceState(conflict.server, { ...meta, revision: conflict.revision, dirty: false })) this.status.set('synced');
        else this.fail({ status: 0, data: { error: this.store.actionError() } });
        return;
      }
      this.meta = { ...meta, revision: conflict.revision, dirty: true };
      await this.pushNow();
    });
  }

  /** Sends pending changes right away; the app calls it when the page is being hidden. */
  flush(): void {
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    void this.exclusive(() => this.pushNow());
  }

  private localChanged(): void {
    this.changeCounter++;
    if (!this.meta?.signedIn || this.status() === 'conflict') return;
    this.schedulePush();
  }

  private schedulePush(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; void this.exclusive(() => this.pushNow()); }, DEBOUNCE_MS);
  }

  private authenticate(path: string, email: string, password: string): Promise<boolean> {
    return this.exclusive(async () => {
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
      const previous = this.meta;
      this.meta = previous && previous.email === serverEmail
        // Same account again (e.g. after the session expired): keep where we were, no false conflict.
        ? { ...previous, signedIn: true }
        // Data on this device that is not from this account must not be silently merged or replaced.
        : { email: serverEmail, revision: null, dirty: !this.isPristine(), signedIn: true };
      await this.pull();
      return true;
    });
  }

  /** Must run inside exclusive(). */
  private async pull(): Promise<void> {
    const meta = this.meta;
    if (!meta?.signedIn) return;
    this.status.set('checking');
    const result = await this.request('GET', '/api/state');
    if (!result) return;
    if (result.status === 401) { this.expired(); return; }
    if (result.status !== 200 || !result.data) { this.fail(result); return; }
    const revision = Number(result.data['revision']);
    const server = result.data['state'] as FitAppState | null;
    if (server === null) {
      // Empty account: this device's data becomes the account's data.
      this.meta = { ...meta, revision: 0, dirty: true };
      await this.pushNow();
      return;
    }
    if (revision === meta.revision) {
      if (meta.dirty) await this.pushNow(); else this.status.set('synced');
      return;
    }
    this.serverIsNewer(revision, server);
  }

  private serverIsNewer(revision: number, server: FitAppState): void {
    const meta = this.meta;
    if (!meta) return;
    // Data this app cannot read is never offered as a choice: "use the account" would fail and "keep this device"
    // would overwrite newer data. Updating the app is the only way forward.
    if (isNewerVersion(server)) { this.status.set('error'); this.error.set(NEWER_ACCOUNT); return; }
    if (meta.dirty && canonical(server) !== canonical(this.store.snapshot())) {
      this.conflict.set({ revision, server, serverWorkouts: server.history.length, localWorkouts: this.store.history().length });
      this.status.set('conflict');
      return;
    }
    if (this.store.replaceState(server, { ...meta, revision, dirty: false })) this.status.set('synced');
    else this.fail({ status: 0, data: { error: this.store.actionError() } });
  }

  /** Must run inside exclusive(). */
  private async pushNow(): Promise<void> {
    const meta = this.meta;
    if (!meta?.signedIn || meta.revision === null || this.status() === 'conflict') return;
    this.status.set('syncing');
    const sentAt = this.changeCounter;
    const result = await this.request('PUT', '/api/state', { baseRevision: meta.revision, state: this.store.snapshot() });
    if (!result) return;
    const current = this.meta;
    if (!current) return;
    if (result.status === 200 && result.data) {
      const changedMeanwhile = this.changeCounter !== sentAt;
      this.meta = { ...current, revision: Number(result.data['revision']), dirty: changedMeanwhile };
      this.status.set('synced');
      if (changedMeanwhile) this.schedulePush();
    } else if (result.status === 409 && result.data) {
      this.serverIsNewer(Number(result.data['revision']), result.data['state'] as FitAppState);
    } else if (result.status === 401) {
      this.expired();
    } else {
      this.fail(result);
    }
  }

  /** Runs tasks one after another; a failing task does not block the next. */
  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
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

  /** Session expired: keep revision and pending flag so signing in again resumes without a conflict. */
  private expired(): void {
    clearTimeout(this.timer);
    const meta = this.meta;
    if (meta) this.meta = { ...meta, signedIn: false };
    this.reset(EXPIRED);
  }

  private reset(message: string | null): void {
    this.refreshAccount();
    this.conflict.set(null);
    this.status.set('local');
    this.error.set(message);
  }

  private refreshAccount(): void {
    const meta = this.store.syncMeta();
    this.account.set(meta?.signedIn ? meta.email : null);
  }

  /** Nothing of the user's on this device. Not a text comparison with today's templates: see isFactoryState. */
  private isPristine(): boolean {
    return isFactoryState(this.store.snapshot());
  }
}
