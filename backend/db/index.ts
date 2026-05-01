import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite, { schema });

// Initialize database (simplified migration for preview)
const initDb = () => {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'viewer',
      avatar_url TEXT,
      tier INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS mawbs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mawb_no TEXT NOT NULL UNIQUE,
      booking_id INTEGER,
      carrier TEXT,
      origin TEXT,
      destination TEXT,
      status TEXT DEFAULT 'pending',
      weight REAL,
      volume REAL,
      chargeable_weight REAL,
      pieces INTEGER,
      flight_date INTEGER,
      remarks TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       booking_no TEXT NOT NULL UNIQUE,
       status TEXT DEFAULT 'pending',
       created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
};

initDb();
