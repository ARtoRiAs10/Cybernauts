import type { Request, Response, NextFunction } from 'express';
import { getGraphData } from '../services/user.service';

export async function getGraph(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const graph = await getGraphData();
    res.json({ success: true, data: graph });
  } catch (err) {
    next(err);
  }
}
