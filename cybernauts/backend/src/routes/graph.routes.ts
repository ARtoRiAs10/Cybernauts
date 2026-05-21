import { Router } from 'express';
import * as graphController from '../controllers/graph.controller';

const router = Router();

router.get('/', graphController.getGraph);

export default router;
