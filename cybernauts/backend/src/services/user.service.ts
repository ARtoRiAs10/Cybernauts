import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import type { User, UserRow, CreateUserDto, UpdateUserDto } from '../models/user.model';
import { recomputeConnectedScores, persistScore } from './score.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseUserRow(row: UserRow): User {
  return {
    ...row,
    hobbies: JSON.parse(row.hobbies),
    friends: JSON.parse(row.friends),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function getAllUsers(): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all() as UserRow[];
  return rows.map(parseUserRow);
}

export function getUserById(id: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? parseUserRow(row) : null;
}

export function createUser(dto: CreateUserDto): User {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, username, age, hobbies, friends, createdAt, popularityScore)
    VALUES (?, ?, ?, ?, '[]', ?, 0)
  `).run(id, dto.username, dto.age, JSON.stringify(dto.hobbies ?? []), now);

  return getUserById(id)!;
}

export function updateUser(id: string, dto: UpdateUserDto): User | null {
  const user = getUserById(id);
  if (!user) return null;

  const updated = {
    username: dto.username ?? user.username,
    age: dto.age ?? user.age,
    hobbies: dto.hobbies ?? user.hobbies,
  };

  db.prepare(`
    UPDATE users SET username = ?, age = ?, hobbies = ? WHERE id = ?
  `).run(updated.username, updated.age, JSON.stringify(updated.hobbies), id);

  // Hobbies changed → recompute scores for this user and their friends
  recomputeConnectedScores(id);

  return getUserById(id)!;
}

export function deleteUser(id: string): 'OK' | 'NOT_FOUND' | 'LINKED' {
  const user = getUserById(id);
  if (!user) return 'NOT_FOUND';

  if (user.friends.length > 0) return 'LINKED';

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return 'OK';
}

// ─── Relationships ────────────────────────────────────────────────────────────

export function linkUsers(
  userId: string,
  targetId: string
): 'OK' | 'NOT_FOUND' | 'SELF_LINK' | 'ALREADY_LINKED' {
  const user = getUserById(userId);
  const target = getUserById(targetId);

  if (!user || !target) return 'NOT_FOUND';
  if (userId === targetId) return 'SELF_LINK';

  // Prevent A→B and B→A being stored as separate links (mutual)
  if (user.friends.includes(targetId) || target.friends.includes(userId)) {
    return 'ALREADY_LINKED';
  }

  const updateFriends = db.prepare('UPDATE users SET friends = ? WHERE id = ?');

  const runTransaction = db.transaction(() => {
    updateFriends.run(JSON.stringify([...user.friends, targetId]), userId);
    updateFriends.run(JSON.stringify([...target.friends, userId]), targetId);
  });

  runTransaction();

  persistScore(userId);
  persistScore(targetId);

  return 'OK';
}

export function unlinkUsers(
  userId: string,
  targetId: string
): 'OK' | 'NOT_FOUND' | 'NOT_LINKED' {
  const user = getUserById(userId);
  const target = getUserById(targetId);

  if (!user || !target) return 'NOT_FOUND';
  if (!user.friends.includes(targetId)) return 'NOT_LINKED';

  const updateFriends = db.prepare('UPDATE users SET friends = ? WHERE id = ?');

  const runTransaction = db.transaction(() => {
    updateFriends.run(JSON.stringify(user.friends.filter((id) => id !== targetId)), userId);
    updateFriends.run(JSON.stringify(target.friends.filter((id) => id !== userId)), targetId);
  });

  runTransaction();

  persistScore(userId);
  persistScore(targetId);

  return 'OK';
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphData {
  nodes: Array<{ id: string; username: string; age: number; popularityScore: number }>;
  edges: Array<{ source: string; target: string }>;
}

export function getGraphData(): GraphData {
  const users = getAllUsers();

  const nodes = users.map((u) => ({
    id: u.id,
    username: u.username,
    age: u.age,
    popularityScore: u.popularityScore,
  }));

  // De-duplicate edges: only store A→B where A < B (lexicographic)
  const edgeSet = new Set<string>();
  const edges: GraphData['edges'] = [];

  for (const user of users) {
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
