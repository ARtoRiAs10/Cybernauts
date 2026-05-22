import express, { Request, Response, NextFunction } from 'express';
import userRoutes from './routes/user.routes';
import graphRoutes from './routes/graph.routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app = express();

// ─── CORS — raw headers, runs before everything, no package config ────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://cybernauts-theta.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // OPTIONS preflight — must return here, never reach route handlers
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/graph', graphRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;