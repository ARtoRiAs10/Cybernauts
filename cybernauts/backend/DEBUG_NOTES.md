# DEBUG_NOTES.md

## Bug 1 — Circular Friendship Stored as Two Separate Entries

**Symptom:** After linking Alice → Bob, calling `POST /api/users/bob-id/link` with `{ targetUserId: alice-id }` succeeded with a 200 response. The graph then showed two directed edges between them, breaking graph visualisation and inflating popularity scores (both users double-counted each other).

**Root Cause:** The initial `linkUsers` check was:
```typescript
if (user.friends.includes(targetId)) return 'ALREADY_LINKED';
```
This only checked whether `targetId` appeared in the *requesting user's* friend list — not whether the *target user* already had the requester as a friend. Since the link was only stored one-way in the first implementation, the reverse link wasn't found.

**Fix:** Changed the guard to check both sides:
```typescript
if (user.friends.includes(targetId) || target.friends.includes(userId)) {
  return 'ALREADY_LINKED';
}
```
And updated the transaction to write both sides atomically:
```typescript
const runTransaction = db.transaction(() => {
  updateFriends.run(JSON.stringify([...user.friends, targetId]), userId);
  updateFriends.run(JSON.stringify([...target.friends, userId]), targetId);
});
runTransaction();
```

---

## Bug 2 — Popularity Score Not Recomputing After Hobby Update

**Symptom:** After calling `PUT /api/users/:id` to add a new hobby to a user, the `popularityScore` field returned in subsequent `GET /api/users` responses was stale — it reflected the old hobby set.

**Root Cause:** The `updateUser` service function was saving the new hobbies to SQLite correctly, but was not calling any score recomputation function afterward. The score was only ever computed at link/unlink time.

**Fix:** Added a call to `recomputeConnectedScores(id)` at the end of `updateUser` in `user.service.ts`:
```typescript
export function updateUser(id: string, dto: UpdateUserDto): User | null {
  // ... update fields ...
  db.prepare('UPDATE users SET username = ?, age = ?, hobbies = ? WHERE id = ?')
    .run(updated.username, updated.age, JSON.stringify(updated.hobbies), id);

  // NEW: hobbies changed → all friends' shared-hobby counts are affected too
  recomputeConnectedScores(id);

  return getUserById(id)!;
}
```
The fix also correctly propagates score updates to the user's friends, since a friend gaining a new hobby that matches yours increases *your* score too.
