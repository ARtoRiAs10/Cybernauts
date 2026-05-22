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


if (process.env.VERCEL !== '1') {
  bootstrap().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
} else {
  
  initDb().catch(console.error);
}


export default app;