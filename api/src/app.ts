import express, { type NextFunction, type Request, type Response } from 'express';
import type { Pool } from 'mysql2/promise';
import { defaultProfile } from '../../src/app/core/seed.ts';
import {
  createSession, destroySession, dummyPasswordHash, hashPassword, rateLimit, requireAuth,
  verifyPassword, type AuthedRequest,
} from './auth.ts';
import { config } from './config.ts';
import { loadState, saveState } from './state-repo.ts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function body(req: Request): Record<string, unknown> {
  return req.body !== null && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
}

function credentials(req: Request): { email: string; password: string } | null {
  const { email, password } = body(req);
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL.test(normalized) || password.length > 200) return null;
  return { email: normalized, password };
}

/** Express 5 forwards rejected promises to the error handler; this keeps handlers typed. */
const handle = (fn: (req: AuthedRequest, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

export interface AppOptions {
  /** Multiplies every rate limit; tests that create many accounts raise it. */
  limitScale?: number;
}

export function createApp(pool: Pool, options: AppOptions = {}) {
  const scale = options.limitScale ?? 1;
  const app = express();
  app.disable('x-powered-by');
  // The preview server and ngrok forward requests from loopback.
  app.set('trust proxy', 'loopback');

  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // CSRF: browsers cannot send application/json cross-site without a CORS preflight, which this API never allows.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.is('application/json')) {
      res.status(415).json({ error: 'Formato no soportado.' });
      return;
    }
    next();
  });
  // Only the state snapshot may be large; everything else is a few fields.
  app.use('/api/state', express.json({ limit: config.maxStateBytes }));
  app.use(express.json({ limit: '16kb' }));

  const auth = requireAuth(pool);
  const byIp = (req: Request) => req.ip ?? 'unknown';
  const byUser = (req: Request) => `user:${(req as AuthedRequest).userId}`;
  const loginLimit = rateLimit(10 * scale, 15 * 60_000, (req) => `${byIp(req)}|${credentials(req)?.email ?? 'invalid'}`);
  const loginIpLimit = rateLimit(50 * scale, 15 * 60_000, byIp);
  const registerLimit = rateLimit(5 * scale, 60 * 60_000, byIp);
  // A real session pushes at most every 1.5 s of inactivity; this only stops loops.
  const stateLimit = rateLimit(120 * scale, 10 * 60_000, byUser);
  const accountLimit = rateLimit(5 * scale, 15 * 60_000, byUser);

  app.get('/api/health', handle(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  }));

  app.post('/api/auth/register', registerLimit, handle(async (req, res) => {
    const input = credentials(req);
    if (!input) { res.status(400).json({ error: 'Ingresá un email válido y una contraseña.' }); return; }
    if (input.password.length < 10) { res.status(400).json({ error: 'Usá una contraseña de al menos 10 caracteres.' }); return; }
    const hash = await hashPassword(input.password);
    const profile = defaultProfile;
    try {
      const [result] = await pool.query('INSERT INTO users (email, password_hash, name, goal, level, weekly_goal, weight) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [input.email, hash, profile.name, profile.goal, profile.level, profile.weeklyGoal, profile.weight]);
      const userId = Number((result as { insertId: number }).insertId);
      await createSession(pool, res, userId);
      res.status(201).json({ email: input.email, revision: 0 });
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') { res.status(409).json({ error: 'Ya existe una cuenta con ese email. Ingresá con tu contraseña.' }); return; }
      throw error;
    }
  }));

  app.post('/api/auth/login', loginIpLimit, loginLimit, handle(async (req, res) => {
    const input = credentials(req);
    if (!input) { res.status(400).json({ error: 'Ingresá tu email y tu contraseña.' }); return; }
    const [rows] = await pool.query('SELECT id, email, password_hash, revision FROM users WHERE email = ?', [input.email]);
    const user = (rows as { id: number; email: string; password_hash: string; revision: number }[])[0];
    const valid = await verifyPassword(input.password, user?.password_hash ?? dummyPasswordHash);
    if (!user || !valid) { res.status(401).json({ error: 'El email o la contraseña no coinciden.' }); return; }
    await createSession(pool, res, Number(user.id));
    res.json({ email: user.email, revision: Number(user.revision) });
  }));

  app.post('/api/auth/logout', handle(async (req, res) => {
    await destroySession(pool, req, res);
    res.status(204).end();
  }));

  app.get('/api/auth/me', auth, handle(async (req, res) => {
    const [rows] = await pool.query('SELECT email, revision FROM users WHERE id = ?', [req.userId]);
    const user = (rows as { email: string; revision: number }[])[0];
    res.json({ email: user.email, revision: Number(user.revision) });
  }));

  app.get('/api/state', auth, handle(async (req, res) => {
    res.json(await loadState(pool, req.userId!));
  }));

  app.put('/api/state', auth, stateLimit, handle(async (req, res) => {
    const { baseRevision, state } = body(req);
    if (typeof baseRevision !== 'number' || !Number.isInteger(baseRevision) || baseRevision < 0) {
      res.status(400).json({ error: 'Falta la revisión de los datos.' });
      return;
    }
    const result = await saveState(pool, req.userId!, baseRevision, state);
    if (result.ok) res.json({ revision: result.revision });
    else if ('conflict' in result) res.status(409).json({ error: 'Tus datos cambiaron en otro dispositivo.', ...result.conflict });
    else res.status(422).json({ error: 'Los datos no tienen un formato FitApp válido.' });
  }));

  app.delete('/api/account', auth, accountLimit, handle(async (req, res) => {
    const { password } = body(req);
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
    const user = (rows as { password_hash: string }[])[0];
    if (typeof password !== 'string' || !(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: 'La contraseña no coincide.' });
      return;
    }
    await pool.query('DELETE FROM users WHERE id = ?', [req.userId]);
    await destroySession(pool, req, res);
    res.status(204).end();
  }));

  app.use('/api', (_req, res) => { res.status(404).json({ error: 'No encontrado.' }); });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (error as { status?: number; type?: string }).status;
    if (status === 413) { res.status(413).json({ error: 'Los datos superan el tamaño máximo.' }); return; }
    if (status === 400) { res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido.' }); return; }
    if (typeof status === 'number' && status >= 400 && status < 500) { res.status(status).json({ error: 'La solicitud no es válida.' }); return; }
    console.error(error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor. Probá de nuevo en un rato.' });
  });

  return app;
}
