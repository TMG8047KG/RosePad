CREATE TABLE IF NOT EXISTS projects {
  rowid INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  ext TEXT,
  title TEXT,
  last_modified_ms INTEGER NOT NULL,
  size INTEGER NOT NULL,
  parent_physical_foldear TEXT
}

CREATE TABLE IF NOT EXISTS project_details {
  rowid
}
