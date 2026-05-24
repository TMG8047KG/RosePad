PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL UNIQUE,
  last_opened_at INTEGER,
  created_at INTEGER NOT NULL,
);

CREATE TABLE IF NOT EXISTS external_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  name TEXT,
  ext TEXT,
  last_opened INTEGER,
  verified_at INTEGER,
);
