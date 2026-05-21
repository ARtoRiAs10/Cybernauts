#  AI-Powered User Relationship & Hobby Network

A full-stack application to manage users, friendships, and hobbies — visualised as an interactive graph with a hybrid AI recommendation engine.

---

##  Folder Structure

```
cybernauts-assignment/
├── backend/
│   ├── src/
│   │   ├── config/         # env config
│   │   ├── db/             # SQLite setup & schema
│   │   ├── models/         # TypeScript interfaces & DTOs
│   │   ├── routes/         # Express route definitions
│   │   ├── controllers/    # Request/response handlers
│   │   ├── services/       # Business logic
│   │   │   ├── user.service.ts
│   │   │   ├── score.service.ts
│   │   │   └── recommendation.service.ts
│   │   ├── middleware/     # Error handling
│   │   ├── app.ts          # Express app
│   │   └── index.ts        # Server entry point
│   ├── tests/
│   │   └── logic.test.ts   # Unit tests
│   ├── ARCHITECTURE.md
│   ├── DEBUG_NOTES.md
│   ├── PROMPT_DISCLOSURE.md
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/               # React + TypeScript + React Flow
```

---

##  Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Backend Setup

```bash
cd backend

# Copy and configure environment
cp .env.example .env

# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev
```

The API will be available at `http://localhost:3001`

### 2. Run Tests

```bash
cd backend
npm test
```

### 3. Build for Production

```bash
cd backend
npm run build
npm start
```

---

##  API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Fetch all users |
| POST | `/api/users` | Create a new user |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user (must unlink first) |
| POST | `/api/users/:id/link` | Create friendship |
| DELETE | `/api/users/:id/unlink` | Remove friendship |
| GET | `/api/graph` | Get full graph data (nodes + edges) |
| GET | `/api/users/:id/recommendations` | Get top 5 friend & hobby recommendations |
| POST | `/api/users/:id/recommendations/feedback` | Submit accept/reject feedback |

---

##  Business Rules

- **Popularity Score** = `uniqueFriends + (totalSharedHobbiesWithFriends × 0.5)`
- **Deletion** — A user cannot be deleted while still connected to friends
- **Circular friendship** — A→B and B→A are treated as one mutual link (conflict is rejected as 409)
- **Score recomputation** — Triggered on: friendship change, hobby change, feedback submission

---

##  Recommendation Engine

Hybrid scoring using:

| Signal | Type | Weight |
|--------|------|--------|
| Mutual friends count | Graph topology | ×2 per mutual |
| Jaccard hobby similarity | Semantic | ×3 |
| BFS graph proximity | Graph proximity | `max(0, 4 - distance)` |
| User feedback | Behavioural | +2 accepted / -5 rejected |

Each recommendation returns a `score`, `reason`, and `sourceSignals` array.

---

## 🔧 Environment Variables

```env
PORT=3001
NODE_ENV=development
DB_PATH=./data/db.sqlite
```

---

##  Required Documents

- [ARCHITECTURE.md](./backend/ARCHITECTURE.md) — Design tradeoffs & rejected alternatives
- [DEBUG_NOTES.md](./backend/DEBUG_NOTES.md) — Real bugs & fixes
- [PROMPT_DISCLOSURE.md](./backend/PROMPT_DISCLOSURE.md) — AI tools used
