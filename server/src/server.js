import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`WYRMORA API listening on port ${config.port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down gracefully...`);

  server.close(async error => {
    if (error) {
      console.error('HTTP server shutdown failed:', error.message);
      process.exitCode = 1;
    }
    try {
      await pool.end();
    } catch (poolError) {
      console.error('Database pool shutdown failed:', poolError.message);
      process.exitCode = 1;
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
