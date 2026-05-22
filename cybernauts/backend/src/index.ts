import app from './app';
import { config } from './config';
import { initDb } from './db';

// ─── Local Dev ────────────────────────────────────────────────────────────────
if (process.env.VERCEL !== '1') {
  initDb()
    .then(() => {
      console.log('✅ Database schema ready');
      app.listen(config.port, () => {
        console.log(`🚀 Server running on http://localhost:${config.port} [${config.nodeEnv}]`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

// ─── Vercel Serverless ────────────────────────────────────────────────────────
// On Vercel, app.listen() is ignored. Export a handler instead.
// We wrap the app so initDb() is awaited before the very first request.
let ready = false;

const handler = async (req: any, res: any) => {
  if (!ready) {
    await initDb();
    console.log('✅ Database schema ready (Vercel cold start)');
    ready = true;
  }
  return app(req, res);
};

export default handler;