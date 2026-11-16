import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'mysql2/promise';
import { dbConfig } from './config.ts';
import { createPool } from './db.ts';

const migrationsDir = fileURLToPath(new URL('../migrations/', import.meta.url));

/** Applies pending migrations/*.sql in name order and records them in schema_migrations. */
export async function migrate(pool: Pool, log: (message: string) => void = () => undefined): Promise<string[]> {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) NOT NULL PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB');
  const [rows] = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set((rows as { name: string }[]).map((row) => row.name));
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const done: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(migrationsDir + file, 'utf8');
    // DDL commits implicitly in MySQL, so statements run one by one; a failure stops before recording the file.
    const statements = sql.split(/;\s*(?:\r?\n|$)/).map((part) => part.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);
    for (const statement of statements) await pool.query(statement);
    await pool.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    log(`Migración aplicada: ${file}`);
    done.push(file);
  }
  return done;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const test = process.argv.includes('--test');
  const pool = createPool(dbConfig(test));
  migrate(pool, console.log)
    .then((done) => { if (!done.length) console.log('La base ya está al día.'); })
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(() => pool.end());
}
