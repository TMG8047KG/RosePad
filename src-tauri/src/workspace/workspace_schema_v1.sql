PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS nodes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id   INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  path        TEXT NOT NULL UNIQUE,
  node_type   TEXT NOT NULL CHECK(node_type IN ('file', 'folder')),
  extension   TEXT,
  size_bytes  INTEGER,
  modified_at INTEGER,
  indexed     INTEGER NOT NULL DEFAULT 0
)

CREATE INDEX idx_nodes_parent ON nodes(parent_id);
CREATE INDEX idx_nodes_path   ON nodes(path);
CREATE INDEX idx_nodes_type   ON nodes(node_type);
CREATE INDEX idx_nodes_ext    ON nodes(extension);

CREATE TABLE open_tabs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id       INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    external_path TEXT,
    tab_index     INTEGER NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 0,
    is_pinned     INTEGER NOT NULL DEFAULT 0,
    cursor_line   INTEGER DEFAULT 0,
    cursor_column INTEGER DEFAULT 0,
    scroll_y      REAL    DEFAULT 0,
    unsaved       INTEGER NOT NULL DEFAULT 0,
    CHECK(
        (node_id IS NOT NULL AND external_path IS NULL) OR
        (node_id IS NULL     AND external_path IS NOT NULL)
    )
);

CREATE VIRTUAL TABLE file_search USING fts5(path, name, content);
