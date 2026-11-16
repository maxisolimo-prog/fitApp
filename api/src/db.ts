import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import type { DbConfig } from './config.ts';

/**
 * All DATETIME columns hold UTC. dateStrings keeps DATE values as 'YYYY-MM-DD' so calendar
 * dates never shift through the server's time zone.
 */
export function createPool(db: DbConfig): Pool {
  return mysql.createPool({
    ...db,
    connectionLimit: 5,
    timezone: 'Z',
    dateStrings: true,
    charset: 'utf8mb4_unicode_ci',
    multipleStatements: false,
  });
}

export async function transaction<T>(pool: Pool, run: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await run(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

/** ISO 8601 → 'YYYY-MM-DD HH:MM:SS.mmm' in UTC for DATETIME(3). */
export function toSqlDateTime(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').replace('Z', '');
}

/** DATETIME(3) string in UTC → ISO 8601 with milliseconds and Z. */
export function fromSqlDateTime(value: string): string {
  return new Date(value.replace(' ', 'T') + 'Z').toISOString();
}
