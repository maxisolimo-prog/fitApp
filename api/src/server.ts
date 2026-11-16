import { createApp } from './app.ts';
import { config, dbConfig } from './config.ts';
import { createPool } from './db.ts';
import { migrate } from './migrate.ts';

const pool = createPool(dbConfig());
await migrate(pool, console.log);
const server = createApp(pool).listen(config.port, '127.0.0.1', () => {
  console.log(`FitApp API: http://127.0.0.1:${config.port}/api/health`);
});

function shutdown() {
  server.close(() => { pool.end().finally(() => process.exit(0)); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
