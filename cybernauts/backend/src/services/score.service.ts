import db from '../db';
import type { UserRow } from '../models/user.model';

/**
 * popularityScore = uniqueFriends + (totalSharedHobbiesWithFriends × 0.5)
 */
export function computePopularityScore(userId: string): number {
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
  if (!userRow) return 0;

  const userHobbies: string[] = JSON.parse(userRow.hobbies);
  const friendIds: string[] = JSON.parse(userRow.friends);

  let sharedHobbiesTotal = 0;

  for (const friendId of friendIds) {
    const friendRow = db
      .prepare('SELECT hobbies FROM users WHERE id = ?')
      .get(friendId) as Pick<UserRow, 'hobbies'> | undefined;

    if (!friendRow) continue;

    const friendHobbies: string[] = JSON.parse(friendRow.hobbies);
    const shared = userHobbies.filter((h) => friendHobbies.includes(h));
    sharedHobbiesTotal += shared.length;
  }

  return friendIds.length + sharedHobbiesTotal * 0.5;
}

export function persistScore(userId: string): void {
  const score = computePopularityScore(userId);
  db.prepare('UPDATE users SET popularityScore = ? WHERE id = ?').run(score, userId);
}

/**
 * Recompute scores for a user AND all their friends
 * (called after any friendship or hobby change)
 */
export function recomputeConnectedScores(userId: string): void {
  persistScore(userId);

  const row = db
    .prepare('SELECT friends FROM users WHERE id = ?')
    .get(userId) as Pick<UserRow, 'friends'> | undefined;

  if (!row) return;

  const friends: string[] = JSON.parse(row.friends);
  for (const friendId of friends) {
    persistScore(friendId);
  }
}
