import app from './app';
import { config } from './config';
import { initDb } from './db';

async function bootstrap() {
  await initDb();
  console.log('✅ Database schema ready (Neon PostgreSQL)');

  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port} [${config.nodeEnv}]`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
