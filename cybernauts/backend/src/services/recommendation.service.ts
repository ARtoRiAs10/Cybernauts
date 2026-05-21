import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import type {
  User,
  UserRow,
  FriendRecommendation,
  HobbyRecommendation,
  RecommendationsResponse,
  FeedbackDto,
} from '../models/user.model';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseUserRow(row: UserRow): User {
  return {
    ...row,
    hobbies: JSON.parse(row.hobbies),
    friends: JSON.parse(row.friends),
  };
}

function getAllUsers(): User[] {
  const rows = db.prepare('SELECT * FROM users').all() as UserRow[];
  return rows.map(parseUserRow);
}

/** Jaccard similarity between two string sets — semantic signal for hobbies */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const intersection = b.filter((x) => setA.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

/** BFS shortest path between two nodes in the friendship graph */
function graphDistance(fromId: string, toId: string, userMap: Map<string, User>): number {
  if (fromId === toId) return 0;

  const visited = new Set<string>();
  const queue: Array<{ id: string; dist: number }> = [{ id: fromId, dist: 0 }];

  while (queue.length > 0) {
    const { id, dist } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = userMap.get(id);
    if (!node) continue;

    for (const neighborId of node.friends) {
      if (neighborId === toId) return dist + 1;
      if (!visited.has(neighborId)) {
        queue.push({ id: neighborId, dist: dist + 1 });
      }
    }
  }

  return Infinity; // no path found
}

type FeedbackMap = Map<string, 'accepted' | 'rejected'>;

function loadFeedbackMap(userId: string): FeedbackMap {
  const rows = db
    .prepare('SELECT targetId, feedback FROM recommendation_feedback WHERE userId = ?')
    .all(userId) as Array<{ targetId: string; feedback: string }>;

  const map: FeedbackMap = new Map();
  for (const r of rows) {
    map.set(r.targetId, r.feedback as 'accepted' | 'rejected');
  }
  return map;
}

// ─── Friend Recommendations ──────────────────────────────────────────────────

export function getFriendRecommendations(userId: string): FriendRecommendation[] {
  const allUsers = getAllUsers();
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const user = userMap.get(userId);
  if (!user) return [];

  const friendSet = new Set(user.friends);
  const feedbackMap = loadFeedbackMap(userId);

  const candidates = allUsers.filter((u) => u.id !== userId && !friendSet.has(u.id));

  const scored = candidates.map((candidate) => {
    // Signal 1 — mutual friends (graph topology signal)
    const mutualFriends = candidate.friends.filter(
      (fId) => friendSet.has(fId) && fId !== userId
    );
    const mutualScore = mutualFriends.length * 2;

    // Signal 2 — hobby similarity via Jaccard (semantic signal)
    const hobbyScore = jaccardSimilarity(user.hobbies, candidate.hobbies) * 3;

    // Signal 3 — graph proximity via BFS (graph proximity signal)
    const dist = graphDistance(userId, candidate.id, userMap);
    const proximityScore = dist === Infinity ? 0 : Math.max(0, 4 - dist);

    // Signal 4 — feedback adjustment
    const fb = feedbackMap.get(candidate.id);
    const feedbackAdj = fb === 'accepted' ? 2 : fb === 'rejected' ? -5 : 0;

    const totalScore = mutualScore + hobbyScore + proximityScore + feedbackAdj;

    // Human-readable reason
    const sharedHobbies = user.hobbies.filter((h) => candidate.hobbies.includes(h));
    const sourceSignals: string[] = [];

    if (mutualFriends.length > 0)
      sourceSignals.push(`${mutualFriends.length} mutual friend(s)`);
    if (sharedHobbies.length > 0)
      sourceSignals.push(`shares hobbies: ${sharedHobbies.join(', ')}`);
    if (dist < Infinity && dist > 0)
      sourceSignals.push(`${dist} degree(s) of separation in network`);
    if (fb === 'accepted') sourceSignals.push('you previously liked this suggestion');
    if (fb === 'rejected') sourceSignals.push('previously rejected (deprioritised)');

    const reason =
      sourceSignals.length > 0
        ? `Suggested because: ${sourceSignals.join('; ')}`
        : `Potential connection with ${candidate.username}`;

    return {
      id: candidate.id,
      username: candidate.username,
      score: Math.round(totalScore * 100) / 100,
      reason,
      sourceSignals,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ─── Hobby Recommendations ───────────────────────────────────────────────────

export function getHobbyRecommendations(userId: string): HobbyRecommendation[] {
  const allUsers = getAllUsers();
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const user = userMap.get(userId);
  if (!user) return [];

  const userHobbySet = new Set(user.hobbies);
  const feedbackMap = loadFeedbackMap(userId);

  // Accumulate hobby scores from direct friends (weight: 2) and friends-of-friends (weight: 0.5)
  const hobbyScores = new Map<string, { score: number; sources: Set<string> }>();

  const accumulateHobby = (hobby: string, weight: number, source: string) => {
    if (userHobbySet.has(hobby)) return;
    if (!hobbyScores.has(hobby)) hobbyScores.set(hobby, { score: 0, sources: new Set() });
    const entry = hobbyScores.get(hobby)!;
    entry.score += weight;
    entry.sources.add(source);
  };

  for (const friendId of user.friends) {
    const friend = userMap.get(friendId);
    if (!friend) continue;

    for (const hobby of friend.hobbies) {
      accumulateHobby(hobby, 2, `your friend ${friend.username} enjoys this`);
    }

    for (const fofId of friend.friends) {
      if (fofId === userId || user.friends.includes(fofId)) continue;
      const fof = userMap.get(fofId);
      if (!fof) continue;

      for (const hobby of fof.hobbies) {
        accumulateHobby(hobby, 0.5, 'popular among your extended network');
      }
    }
  }

  const results: HobbyRecommendation[] = [];

  for (const [hobby, { score, sources }] of hobbyScores.entries()) {
    // Feedback uses "hobby:<name>" as the targetId key
    const fb = feedbackMap.get(`hobby:${hobby}`);
    const feedbackAdj = fb === 'accepted' ? 1.5 : fb === 'rejected' ? -10 : 0;
    const finalScore = score + feedbackAdj;

    const sourceSignals = [...sources];
    if (fb === 'accepted') sourceSignals.push('you previously liked this');
    if (fb === 'rejected') sourceSignals.push('you previously dismissed this');

    results.push({
      hobby,
      score: Math.round(finalScore * 100) / 100,
      reason: `Try "${hobby}": ${sourceSignals.join('; ')}`,
      sourceSignals,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ─── Combined ────────────────────────────────────────────────────────────────

export function getRecommendations(userId: string): RecommendationsResponse {
  return {
    friends: getFriendRecommendations(userId),
    hobbies: getHobbyRecommendations(userId),
  };
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export function saveRecommendationFeedback(userId: string, dto: FeedbackDto): void {
  const id = uuidv4();
  const now = new Date().toISOString();

  // targetId for hobby feedback is "hobby:<hobbyName>" to avoid collision with user IDs
  const targetId = dto.type === 'hobby' ? `hobby:${dto.targetId}` : dto.targetId;

  // UPSERT — if the user changed their mind, update
  db.prepare(`
    INSERT INTO recommendation_feedback (id, userId, targetId, type, feedback, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId, targetId, type) DO UPDATE SET feedback = excluded.feedback, createdAt = excluded.createdAt
  `).run(id, userId, targetId, dto.type, dto.feedback, now);
}
