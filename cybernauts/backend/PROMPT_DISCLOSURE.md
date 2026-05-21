# PROMPT_DISCLOSURE.md

## AI Tools Used

**Tool:** Claude (Anthropic) — used for initial project scaffolding and code generation assistance.

---

## Prompts Used

1. *"Generate a modular Express + TypeScript backend with SQLite for a user relationship and hobby network API. The folder structure should mirror: src/config, src/db, src/models, src/routes, src/controllers, src/services, src/middleware."*

2. *"Implement a hybrid recommendation engine using: (1) mutual friend count as a graph topology signal, (2) Jaccard similarity on hobby arrays as a semantic signal, (3) BFS graph distance as a proximity signal. Each recommendation must return a score, a human-readable reason, and a sourceSignals array."*

3. *"Write logic-specific unit tests for: popularity score formula, deletion prevention when user still has friends, and duplicate/circular friendship prevention."*

---

## What Was Accepted vs Manually Changed

| Area | AI Output | Manual Action |
|---|---|---|
| Folder structure |  Accepted | — |
| `score.service.ts` formula |  Accepted | Verified formula matches spec exactly: `friends + sharedHobbies × 0.5` |
| Recommendation scoring weights | Partially used | Adjusted mutual-friend weight from 1 to 2 and proximity formula to `max(0, 4-dist)` after manual testing |
| `linkUsers` circular prevention | Initial version only checked one side | Manually rewrote guard to check both user and target friend lists |
| Score propagation in `updateUser` |  Missing | Added `recomputeConnectedScores` call manually after discovering stale score bug |
| Test file |  Accepted | Added one extra edge-case test (score-update-on-hobby-change) manually |
| `ARCHITECTURE.md` / `DEBUG_NOTES.md` |  Used as draft | Refined language to accurately reflect real decisions made during development |
