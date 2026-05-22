import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import type { User, UserRow, CreateUserDto, UpdateUserDto } from '../models/user.model';
import { recomputeConnectedScores, persistScore } from './score.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseUserRow(row: UserRow): User {
  return {
    ...row,
    // Neon returns JSONB columns already parsed; guard for string fallback
    hobbies: typeof row.hobbies === 'string' ? JSON.parse(row.hobbies) : row.hobbies,
    friends: typeof row.friends === 'string' ? JSON.parse(row.friends) : row.friends,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {

  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users ORDER BY "createdAt" DESC'
  );
  return rows.map(parseUserRow);
}

export async function getUserById(id: string): Promise<User | null> {

  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE "id" = $1',
    [id]
  );
  return rows[0] ? parseUserRow(rows[0]) : null;
}

export async function createUser(dto: CreateUserDto): Promise<User> {
  const id = uuidv4();
  const now = new Date().toISOString();


  await pool.query(
    `INSERT INTO users ("id", "username", "age", "hobbies", "friends", "createdAt", "popularityScore")
     VALUES ($1, $2, $3, $4::jsonb, '[]'::jsonb, $5, 0)`,
    [id, dto.username, dto.age, JSON.stringify(dto.hobbies ?? []), now]
  );

  return (await getUserById(id))!;
}

export async function updateUser(id: string, dto: UpdateUserDto): Promise<User | null> {
  const user = await getUserById(id);
  if (!user) return null;

  const updated = {
    username: dto.username ?? user.username,
    age: dto.age ?? user.age,
    hobbies: dto.hobbies ?? user.hobbies,
  };


  await pool.query(
    `UPDATE users SET "username" = $1, "age" = $2, "hobbies" = $3::jsonb WHERE "id" = $4`,
    [updated.username, updated.age, JSON.stringify(updated.hobbies), id]
  );

  // Hobbies changed → recompute scores for this user and their friends
  await recomputeConnectedScores(id);

  return getUserById(id);
}

export async function deleteUser(id: string): Promise<'OK' | 'NOT_FOUND' | 'LINKED'> {
  const user = await getUserById(id);
  if (!user) return 'NOT_FOUND';
  if (user.friends.length > 0) return 'LINKED';


  await pool.query('DELETE FROM users WHERE "id" = $1', [id]);
  return 'OK';
}

// ─── Relationships ────────────────────────────────────────────────────────────

export async function linkUsers(
  userId: string,
  targetId: string
): Promise<'OK' | 'NOT_FOUND' | 'SELF_LINK' | 'ALREADY_LINKED'> {
  const [user, target] = await Promise.all([getUserById(userId), getUserById(targetId)]);

  if (!user || !target) return 'NOT_FOUND';
  if (userId === targetId) return 'SELF_LINK';

  if (user.friends.includes(targetId) || target.friends.includes(userId)) {
    return 'ALREADY_LINKED';
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE users SET "friends" = "friends" || $1::jsonb WHERE "id" = $2`,
      [JSON.stringify([targetId]), userId]
    );
    await client.query(
      `UPDATE users SET "friends" = "friends" || $1::jsonb WHERE "id" = $2`,
      [JSON.stringify([userId]), targetId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await Promise.all([persistScore(userId), persistScore(targetId)]);

  return 'OK';
}

export async function unlinkUsers(
  userId: string,
  targetId: string
): Promise<'OK' | 'NOT_FOUND' | 'NOT_LINKED'> {
  const [user, target] = await Promise.all([getUserById(userId), getUserById(targetId)]);

  if (!user || !target) return 'NOT_FOUND';
  if (!user.friends.includes(targetId)) return 'NOT_LINKED';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');


    await client.query(
      `UPDATE users
       SET "friends" = COALESCE(
         (
           SELECT jsonb_agg(elem)
           FROM jsonb_array_elements("friends") AS elem
           WHERE elem #>> '{}' != $1
         ),
         '[]'::jsonb
       )
       WHERE "id" = $2`,
      [targetId, userId]
    );


    await client.query(
      `UPDATE users
       SET "friends" = COALESCE(
         (
           SELECT jsonb_agg(elem)
           FROM jsonb_array_elements("friends") AS elem
           WHERE elem #>> '{}' != $1
         ),
         '[]'::jsonb
       )
       WHERE "id" = $2`,
      [userId, targetId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await Promise.all([persistScore(userId), persistScore(targetId)]);

  return 'OK';
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphData {
  nodes: Array<{ id: string; username: string; age: number; popularityScore: number }>;
  edges: Array<{ source: string; target: string }>;
}

export async function getGraphData(): Promise<GraphData> {
  const users = await getAllUsers();

  const nodes = users.map((u) => ({
    id: u.id,
    username: u.username,
    age: u.age,
    popularityScore: u.popularityScore,
  }));

  const edgeSet = new Set<string>();
  const edges: GraphData['edges'] = [];

  for (const user of users) {
    if (!user.friends) continue;
    for (const friendId of user.friends) {
      const key = [user.id, friendId].sort().join('|');
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source: user.id, target: friendId });
      }
    }
  }

  return { nodes, edges };
}