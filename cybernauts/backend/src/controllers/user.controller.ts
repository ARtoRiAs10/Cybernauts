import type { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import * as recommendationService from '../services/recommendation.service';
import type { CreateUserDto, UpdateUserDto, LinkDto, FeedbackDto } from '../models/user.model';

// ─── Users CRUD ───────────────────────────────────────────────────────────────

export function getUsers(_req: Request, res: Response): void {
  const users = userService.getAllUsers();
  res.json({ success: true, data: users });
}

export function getUser(req: Request, res: Response, next: NextFunction): void {
  const user = userService.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  res.json({ success: true, data: user });
}

export function createUser(req: Request, res: Response, next: NextFunction): void {
  const { username, age, hobbies } = req.body as CreateUserDto;

  if (!username || typeof username !== 'string') {
    res.status(400).json({ success: false, error: 'username is required and must be a string' });
    return;
  }
  if (age == null || typeof age !== 'number' || age < 0) {
    res.status(400).json({ success: false, error: 'age is required and must be a non-negative number' });
    return;
  }
  if (!Array.isArray(hobbies)) {
    res.status(400).json({ success: false, error: 'hobbies must be an array of strings' });
    return;
  }

  try {
    const user = userService.createUser({ username, age, hobbies });
    res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ success: false, error: 'Username already taken' });
      return;
    }
    next(err);
  }
}

export function updateUser(req: Request, res: Response, next: NextFunction): void {
  const dto = req.body as UpdateUserDto;

  if (dto.age !== undefined && (typeof dto.age !== 'number' || dto.age < 0)) {
    res.status(400).json({ success: false, error: 'age must be a non-negative number' });
    return;
  }
  if (dto.hobbies !== undefined && !Array.isArray(dto.hobbies)) {
    res.status(400).json({ success: false, error: 'hobbies must be an array' });
    return;
  }

  const updated = userService.updateUser(req.params.id, dto);
  if (!updated) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: updated });
}

export function deleteUser(req: Request, res: Response, next: NextFunction): void {
  const result = userService.deleteUser(req.params.id);

  if (result === 'NOT_FOUND') {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  if (result === 'LINKED') {
    res.status(409).json({
      success: false,
      error: 'Cannot delete user while they are still connected to friends. Unlink first.',
    });
    return;
  }

  res.json({ success: true, message: 'User deleted' });
}

// ─── Relationships ────────────────────────────────────────────────────────────

export function linkUsers(req: Request, res: Response, next: NextFunction): void {
  const { targetUserId } = req.body as LinkDto;

  if (!targetUserId) {
    res.status(400).json({ success: false, error: 'targetUserId is required' });
    return;
  }

  const result = userService.linkUsers(req.params.id, targetUserId);

  if (result === 'NOT_FOUND') {
    res.status(404).json({ success: false, error: 'One or both users not found' });
    return;
  }
  if (result === 'SELF_LINK') {
    res.status(400).json({ success: false, error: 'Cannot link a user to themselves' });
    return;
  }
  if (result === 'ALREADY_LINKED') {
    res.status(409).json({ success: false, error: 'Users are already friends' });
    return;
  }

  res.json({ success: true, message: 'Friendship created' });
}

export function unlinkUsers(req: Request, res: Response, next: NextFunction): void {
  const { targetUserId } = req.body as LinkDto;

  if (!targetUserId) {
    res.status(400).json({ success: false, error: 'targetUserId is required' });
    return;
  }

  const result = userService.unlinkUsers(req.params.id, targetUserId);

  if (result === 'NOT_FOUND') {
    res.status(404).json({ success: false, error: 'One or both users not found' });
    return;
  }
  if (result === 'NOT_LINKED') {
    res.status(409).json({ success: false, error: 'Users are not friends' });
    return;
  }

  res.json({ success: true, message: 'Friendship removed' });
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export function getRecommendations(req: Request, res: Response, next: NextFunction): void {
  const user = userService.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const recommendations = recommendationService.getRecommendations(req.params.id);
  res.json({ success: true, data: recommendations });
}

export function postRecommendationFeedback(req: Request, res: Response, next: NextFunction): void {
  const user = userService.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const { targetId, type, feedback } = req.body as FeedbackDto;

  if (!targetId) {
    res.status(400).json({ success: false, error: 'targetId is required' });
    return;
  }
  if (!['friend', 'hobby'].includes(type)) {
    res.status(400).json({ success: false, error: 'type must be "friend" or "hobby"' });
    return;
  }
  if (!['accepted', 'rejected'].includes(feedback)) {
    res.status(400).json({ success: false, error: 'feedback must be "accepted" or "rejected"' });
    return;
  }

  recommendationService.saveRecommendationFeedback(req.params.id, { targetId, type, feedback });
  res.json({ success: true, message: 'Feedback recorded. Future recommendations updated.' });
}
