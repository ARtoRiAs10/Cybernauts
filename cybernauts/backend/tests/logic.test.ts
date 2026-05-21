/**
 * Logic-specific unit tests
 * Tests: score computation, unlink-before-delete prevention, friendship conflict prevention
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ─── Test DB Setup ────────────────────────────────────────────────────────────
// Use an in-memory SQLite database for isolated tests

process.env.DB_PATH = ':memory:';
process.env.PORT = '3099';

// Must import AFTER setting env vars so config picks them up
import { computePopularityScore, persistScore } from '../src/services/score.service';
import * as userService from '../src/services/user.service';
import * as recommendationService from '../src/services/recommendation.service';

// ─── Helper ───────────────────────────────────────────────────────────────────
function createTestUser(username: string, hobbies: string[] = []) {
  return userService.createUser({ username, age: 20, hobbies });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Popularity Score Logic', () => {
  test('score = 0 for a user with no friends and no hobbies', () => {
    const user = createTestUser('solo_user');
    const score = computePopularityScore(user.id);
    expect(score).toBe(0);
  });

  test('score = friendCount + sharedHobbies * 0.5', () => {
    const alice = createTestUser('alice_score', ['reading', 'gaming']);
    const bob = createTestUser('bob_score', ['reading', 'cooking']);

    userService.linkUsers(alice.id, bob.id);

    // alice has 1 friend, shares 1 hobby with bob → 1 + 1*0.5 = 1.5
    const aliceScore = computePopularityScore(alice.id);
    expect(aliceScore).toBe(1.5);

    // bob has 1 friend, shares 1 hobby with alice → 1 + 1*0.5 = 1.5
    const bobScore = computePopularityScore(bob.id);
    expect(bobScore).toBe(1.5);
  });

  test('score updates when hobbies change', () => {
    const carol = createTestUser('carol_score', ['tennis']);
    const dave = createTestUser('dave_score', ['tennis', 'chess']);

    userService.linkUsers(carol.id, dave.id);

    const scoreBefore = computePopularityScore(carol.id);
    expect(scoreBefore).toBe(1.5); // 1 friend + 1 shared hobby * 0.5

    // Carol adds chess — now 2 shared hobbies
    userService.updateUser(carol.id, { hobbies: ['tennis', 'chess'] });
    const scoreAfter = computePopularityScore(carol.id);
    expect(scoreAfter).toBe(2); // 1 friend + 2 shared * 0.5
  });
});

describe('Deletion Rules', () => {
  test('cannot delete a user who still has friends', () => {
    const eve = createTestUser('eve_delete');
    const frank = createTestUser('frank_delete');

    userService.linkUsers(eve.id, frank.id);

    const result = userService.deleteUser(eve.id);
    expect(result).toBe('LINKED');

    // User should still exist
    const stillExists = userService.getUserById(eve.id);
    expect(stillExists).not.toBeNull();
  });

  test('can delete user after unlinking', () => {
    const grace = createTestUser('grace_delete');
    const hank = createTestUser('hank_delete');

    userService.linkUsers(grace.id, hank.id);
    userService.unlinkUsers(grace.id, hank.id);

    const result = userService.deleteUser(grace.id);
    expect(result).toBe('OK');

    const shouldBeGone = userService.getUserById(grace.id);
    expect(shouldBeGone).toBeNull();
  });
});

describe('Duplicate & Circular Friendship Prevention', () => {
  test('cannot link A→B if B→A already exists', () => {
    const ivan = createTestUser('ivan_link');
    const judy = createTestUser('judy_link');

    const first = userService.linkUsers(ivan.id, judy.id);
    expect(first).toBe('OK');

    // Try adding reverse
    const duplicate = userService.linkUsers(judy.id, ivan.id);
    expect(duplicate).toBe('ALREADY_LINKED');
  });

  test('cannot link A→A (self-link)', () => {
    const kevin = createTestUser('kevin_self');
    const result = userService.linkUsers(kevin.id, kevin.id);
    expect(result).toBe('SELF_LINK');
  });

  test('linking same pair twice is rejected', () => {
    const leo = createTestUser('leo_dup');
    const mia = createTestUser('mia_dup');

    userService.linkUsers(leo.id, mia.id);
    const second = userService.linkUsers(leo.id, mia.id);
    expect(second).toBe('ALREADY_LINKED');
  });
});

describe('Recommendation Engine', () => {
  test('friend recommendation excludes existing friends and self', () => {
    const nina = createTestUser('nina_rec', ['yoga']);
    const omar = createTestUser('omar_rec', ['yoga', 'chess']);
    const petra = createTestUser('petra_rec', ['yoga', 'chess']);

    userService.linkUsers(nina.id, omar.id);

    const recs = recommendationService.getFriendRecommendations(nina.id);
    const recIds = recs.map((r) => r.id);

    expect(recIds).not.toContain(nina.id);    // not self
    expect(recIds).not.toContain(omar.id);    // not existing friend
    expect(recIds).toContain(petra.id);       // candidate with shared hobbies
  });

  test('feedback rejection lowers recommendation score', () => {
    const quinn = createTestUser('quinn_fb', ['hiking']);
    const rose = createTestUser('rose_fb', ['hiking']);
    const sam = createTestUser('sam_fb', ['hiking']);

    // Without feedback
    const before = recommendationService.getFriendRecommendations(quinn.id);
    const roseBefore = before.find((r) => r.id === rose.id);

    // Reject rose
    recommendationService.saveRecommendationFeedback(quinn.id, {
      targetId: rose.id,
      type: 'friend',
      feedback: 'rejected',
    });

    const after = recommendationService.getFriendRecommendations(quinn.id);
    const roseAfter = after.find((r) => r.id === rose.id);

    if (roseBefore && roseAfter) {
      expect(roseAfter.score).toBeLessThan(roseBefore.score);
    }
  });
});
