# ARCHITECTURE.md

## Overview

This backend is a modular Express + TypeScript REST API with a SQLite database and a hybrid recommendation engine.

---

## Key Design Tradeoffs

### 1. SQLite vs PostgreSQL
**Chosen:** SQLite via `better-sqlite3`  
**Tradeoff:** SQLite is synchronous and zero-config, making local development and testing trivially easy. The synchronous API eliminates a category of async bugs that plague production Node.js backends. The cost is that SQLite does not support true concurrent writes — but for this assignment's scale (1,000 users, 5,000 edges), this is irrelevant. A switch to PostgreSQL (via `pg` or `drizzle-orm`) would require only changes to `src/db/index.ts` and the SQL dialect.

### 2. Graph stored as JSON arrays vs a dedicated edges table
**Chosen:** Friends stored as a JSON array inside the `users` row  
**Tradeoff:** Simple reads — no JOIN needed to get a user's full friend list. Writes are slightly more expensive (read-modify-write the JSON) but SQLite transactions keep this safe. The downside is that queries like "find all users who are friends of user X" require scanning all users. For 1,000 users this is fast enough. At 100k+ users, a dedicated `friendships(user_a, user_b)` table with indexes would be required. The duplicate/circular friendship prevention rule (A→B equals B→A) is enforced in the service layer, not at the DB level.

### 3. Jaccard similarity vs vector embeddings for semantic signals
**Chosen:** Jaccard similarity (string set overlap) for the semantic recommendation signal  
**Tradeoff:** Jaccard is zero-dependency, deterministic, and explainable — critical since the assignment requires `reason` and `sourceSignals` in every recommendation. It works well when hobbies are normalized strings ("gaming", "yoga"). The weakness is that "video games" and "gaming" are treated as completely different. A vector embedding approach (OpenAI `text-embedding-3-small`) would catch semantic neighbours but adds API latency, cost, and a non-deterministic element to tests. An `.env` key (`OPENAI_API_KEY`) is wired up for a future upgrade path.

---

## Two Rejected Alternatives

### ❌ Rejected: Neo4j as the database
Using a native graph database (Neo4j) would make BFS, mutual-friend queries, and proximity scoring extremely efficient with Cypher queries. However, it requires a running Neo4j instance (Docker), adds operational complexity, and requires learning a non-standard query language. For this assignment, the graph fits entirely in memory and SQLite + in-process BFS is more than sufficient.

### ❌ Rejected: Real-time WebSocket updates for score propagation
When a user links two friends, the popularity scores of both users change. WebSockets would push these updates live to connected frontend clients. However, the React Flow frontend already polls or re-fetches on user action, so WebSocket infrastructure (socket.io, state synchronisation across workers) would add significant complexity with marginal UX gain given the assignment's scope and 2-day timeline.
