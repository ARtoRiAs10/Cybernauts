import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: process.env.DB_PATH || './data/db.sqlite',
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;
