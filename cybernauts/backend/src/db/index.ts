import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

const resolvedPath = config.dbPath;

if (resolvedPath !== ':memory:') {
  const dbDir = path.dirname(path.resolve(resolvedPath));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

export const db: DatabaseType = new Database(resolvedPath);

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    username    TEXT NOT NULL UNIQUE,
    age         INTEGER NOT NULL,
    hobbies     TEXT NOT NULL DEFAULT '[]',
    friends     TEXT NOT NULL DEFAULT '[]',
    createdAt   TEXT NOT NULL,
    popularityScore REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id        TEXT PRIMARY KEY,
    userId    TEXT NOT NULL,
    targetId  TEXT NOT NULL,
    type      TEXT NOT NULL CHECK(type IN ('friend', 'hobby')),
    feedback  TEXT NOT NULL CHECK(feedback IN ('accepted', 'rejected')),
    createdAt TEXT NOT NULL,
    UNIQUE(userId, targetId, type)
  );
`);

export default db;
