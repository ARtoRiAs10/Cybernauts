import type { Request, Response } from 'express';
import { getGraphData } from '../services/user.service';

export function getGraph(_req: Request, res: Response): void {
  const graph = getGraphData();
  res.json({ success: true, data: graph });
}
