import pool from '../db';
import type { UserRow } from '../models/user.model';

/**
 * popularityScore = uniqueFriends + (totalSharedHobbiesWithFriends × 0.5)
 */
export async function computePopularityScore(userId: string): Promise<number> {
  
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE "id" = $1',
    [userId]
  );
  const userRow = rows[0];
  if (!userRow) return 0;

  const userHobbies: string[] =
    typeof userRow.hobbies === 'string' ? JSON.parse(userRow.hobbies) : userRow.hobbies;
  const friendIds: string[] =
    typeof userRow.friends === 'string' ? JSON.parse(userRow.friends) : userRow.friends;

  if (friendIds.length === 0) return 0;


  const placeholders = friendIds.map((_, i) => `$${i + 1}`).join(', ');

  const { rows: friendRows } = await pool.query<Pick<UserRow, 'hobbies'>>(
    `SELECT "hobbies" FROM users WHERE "id" IN (${placeholders})`,
    friendIds
  );

  let sharedHobbiesTotal = 0;
  for (const friendRow of friendRows) {
    const friendHobbies: string[] =
      typeof friendRow.hobbies === 'string'
        ? JSON.parse(friendRow.hobbies)
        : (friendRow.hobbies as unknown as string[]);
    const shared = userHobbies.filter((h) => friendHobbies.includes(h));
    sharedHobbiesTotal += shared.length;
  }

  return friendIds.length + sharedHobbiesTotal * 0.5;
}

export async function persistScore(userId: string): Promise<void> {
  const score = await computePopularityScore(userId);

  await pool.query(
    `UPDATE users SET "popularityScore" = $1 WHERE "id" = $2`,
    [score, userId]
  );
}

/**
 * Recompute scores for a user AND all their friends
 * (called after any friendship or hobby change)
 */
export async function recomputeConnectedScores(userId: string): Promise<void> {
  await persistScore(userId);


  const { rows } = await pool.query<Pick<UserRow, 'friends'>>(
    'SELECT "friends" FROM users WHERE "id" = $1',
    [userId]
  );
  if (!rows[0]) return;

  const friends: string[] =
    typeof rows[0].friends === 'string'
      ? JSON.parse(rows[0].friends)
      : (rows[0].friends as unknown as string[]);

  await Promise.all(friends.map((friendId) => persistScore(friendId)));
}