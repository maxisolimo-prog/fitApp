import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`Falta la variable de entorno ${name} (ver api/.env.example).`);
  return value;
}

export interface DbConfig { host: string; port: number; user: string; password: string; database: string }

export function dbConfig(test = false): DbConfig {
  return {
    host: process.env['DB_HOST'] ?? '127.0.0.1',
    port: Number(process.env['DB_PORT'] ?? 3306),
    user: required('DB_USER'),
    password: process.env['DB_PASSWORD'] ?? '',
    database: test ? required('DB_NAME_TEST') : required('DB_NAME'),
  };
}

export const config = {
  port: Number(process.env['PORT'] ?? 3401),
  cookieSecure: process.env['COOKIE_SECURE'] === 'true',
  sessionDays: 30,
  /** Same upper bound the frontend applies to backups. */
  maxBodyBytes: 20_000_000,
};
