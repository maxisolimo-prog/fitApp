import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'mysql2/promise';
import { config } from './config.ts';

export const SESSION_COOKIE = 'fitapp_session';
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, keylen, options, (error, key) => error ? reject(error) : resolve(key)));
}

/** Format: scrypt$N$r$p$salt$hash (base64url). Parameters are stored so they can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize('NFKC'), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scryptAsync(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A hash to compare against when the email does not exist, so both paths cost the same. */
export const dummyPasswordHash = await hashPassword(randomBytes(16).toString('hex'));

function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export async function createSession(pool: Pool, res: Response, userId: number): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + config.sessionDays * 86_400_000);
  await pool.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [tokenHash(token), userId, expires]);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', path: '/api', expires,
  });
}

export async function destroySession(pool: Pool, req: Request, res: Response): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash(token)]);
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', path: '/api' });
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

export interface AuthedRequest extends Request { userId?: number }

export function requireAuth(pool: Pool) {
  return async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token || token.length > 100) { res.status(401).json({ error: 'Iniciá sesión para continuar.' }); return; }
    const [rows] = await pool.query('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP(3)', [tokenHash(token)]);
    const row = (rows as { user_id: number }[])[0];
    if (!row) { res.status(401).json({ error: 'Tu sesión venció. Volvé a ingresar.' }); return; }
    req.userId = Number(row.user_id);
    next();
  };
}

/** Small fixed-window limiter in memory: enough for one API process. */
export function rateLimit(limit: number, windowMs: number, key: (req: Request) => string) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (hits.size > 10_000) for (const [entry, value] of hits) if (value.reset <= now) hits.delete(entry);
    const id = key(req);
    const current = hits.get(id);
    if (!current || current.reset <= now) hits.set(id, { count: 1, reset: now + windowMs });
    else if (++current.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((current.reset - now) / 1000)));
      res.status(429).json({ error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' });
      return;
    }
    next();
  };
}
