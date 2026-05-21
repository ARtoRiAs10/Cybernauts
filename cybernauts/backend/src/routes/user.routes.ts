import { Router } from 'express';
import * as userController from '../controllers/user.controller';

const router = Router();

// CRUD
router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Relationships
router.post('/:id/link', userController.linkUsers);
router.delete('/:id/unlink', userController.unlinkUsers);

// Recommendations
router.get('/:id/recommendations', userController.getRecommendations);
router.post('/:id/recommendations/feedback', userController.postRecommendationFeedback);

export default router;
