import { neon, neonConfig } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from '../config';

// Required for Node.js environments (not needed in Edge runtimes)
neonConfig.webSocketConstructor = ws;

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Connection pool — reused across requests
export const pool = new Pool({ connectionString: config.databaseUrl });

// Also export a lightweight sql tag for one-off queries outside a pool
export const sql = neon(config.databaseUrl);

/**
 * Drops the old tables to clean up schema inconsistencies,
 * then builds out a structured, explicit quoted setup.
 */
export async function initDb(): Promise<void> {
  // 1. Force clear historical tables to clear type case collisions
  console.log('Resetting and migrating database tables...');
  
  await pool.query(`
    DROP TABLE IF EXISTS recommendation_feedback CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  // 2. Build explicit quoted column spaces matching service data structures
  await pool.query(`
    CREATE TABLE users (
      "id"              TEXT PRIMARY KEY,
      "username"        TEXT NOT NULL UNIQUE,
      "age"             INTEGER NOT NULL,
      "hobbies"         JSONB NOT NULL DEFAULT '[]',
      "friends"         JSONB NOT NULL DEFAULT '[]',
      "createdAt"       TEXT NOT NULL,
      "popularityScore" REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE recommendation_feedback (
      "id"        TEXT PRIMARY KEY,
      "userId"    TEXT NOT NULL,
      "targetId"  TEXT NOT NULL,
      "type"      TEXT NOT NULL CHECK("type" IN ('friend', 'hobby')),
      "feedback"  TEXT NOT NULL CHECK("feedback" IN ('accepted', 'rejected')),
      "createdAt" TEXT NOT NULL,
      UNIQUE("userId", "targetId", "type")
    );
  `);
  console.log('Database successfully initialized with matching case models.');
}

export default pool;