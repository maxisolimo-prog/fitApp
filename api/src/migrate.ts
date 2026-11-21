import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'mysql2/promise';
import { dbConfig } from './config.ts';
import { createPool } from './db.ts';

const migrationsDir = fileURLToPath(new URL('../migrations/', import.meta.url));

/** Applies pending migrations/*.sql in name order and records them in schema_migrations. */
export async function migrate(pool: Pool, log: (message: string) => void = () => undefined): Promise<string[]> {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) NOT NULL PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  const [rows] = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set((rows as { name: string }[]).map((row) => row.name));
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const done: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(migrationsDir + file, 'utf8');
    // DDL commits implicitly in MySQL, so statements run one by one; a failure stops before recording the file.
    // One connection per file, so session settings such as FOREIGN_KEY_CHECKS apply to every statement.
    const statements = sql.split(/;\s*(?:\r?\n|$)/).map((part) => part.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);
    const connection = await pool.getConnection();
    try {
      for (const statement of statements) {
        // Los CREATE históricos sin charset no deben heredar la collation arbitraria de una base nueva:
        // sus claves VARCHAR referencian tablas explícitamente utf8mb4_unicode_ci. No modifica tablas existentes.
        const createTable = /^CREATE\s+TABLE\b/i.test(statement);
        const hasCharset = /\b(?:CHARSET|CHARACTER\s+SET)\s*=?\s*\w+/i.test(statement);
        await connection.query(createTable && !hasCharset ? statement + ' DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci' : statement);
      }
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => undefined);
      connection.release();
    }
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
