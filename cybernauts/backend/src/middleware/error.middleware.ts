import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[${new Date().toISOString()}] ${statusCode} — ${message}`);

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: 'Route not found' });
}
