PRAGMA foreign_keys = ON;

-- =========================================
-- WORKSPACES
-- =========================================

CREATE TABLE workspaces (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    root_path       TEXT NOT NULL UNIQUE,

    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    last_opened_at  INTEGER,

    settings_json   TEXT
);

CREATE INDEX idx_workspaces_root_path
ON workspaces(root_path);

-- =========================================
-- PROJECTS
-- =========================================

CREATE TABLE projects (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    workspace_id        INTEGER NOT NULL,

    name                TEXT NOT NULL,
    path                TEXT NOT NULL UNIQUE,

    description         TEXT,

    is_open             INTEGER NOT NULL DEFAULT 0,
    is_pinned           INTEGER NOT NULL DEFAULT 0,

    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    last_opened_at      INTEGER,

    git_branch          TEXT,
    git_remote          TEXT,

    metadata_json       TEXT,

    FOREIGN KEY(workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_projects_workspace
ON projects(workspace_id);

CREATE INDEX idx_projects_path
ON projects(path);

-- =========================================
-- FILE TREE
-- =========================================

CREATE TABLE nodes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    workspace_id        INTEGER NOT NULL,
    project_id          INTEGER,

    parent_id           INTEGER,

    name                TEXT NOT NULL,
    path                TEXT NOT NULL UNIQUE,

    node_type           TEXT NOT NULL
                        CHECK(node_type IN ('file', 'folder')),

    extension           TEXT,

    size_bytes          INTEGER,

    created_at          INTEGER,
    modified_at         INTEGER,

    is_hidden           INTEGER NOT NULL DEFAULT 0,
    is_symlink          INTEGER NOT NULL DEFAULT 0,

    checksum            TEXT,

    indexed             INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY(workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    FOREIGN KEY(project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    FOREIGN KEY(parent_id)
        REFERENCES nodes(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_nodes_workspace
ON nodes(workspace_id);

CREATE INDEX idx_nodes_project
ON nodes(project_id);

CREATE INDEX idx_nodes_parent
ON nodes(parent_id);

CREATE INDEX idx_nodes_path
ON nodes(path);

CREATE INDEX idx_nodes_type
ON nodes(node_type);

CREATE INDEX idx_nodes_extension
ON nodes(extension);

-- =========================================
-- FILE CONTENT CACHE
-- =========================================

CREATE TABLE file_cache (
    node_id             INTEGER PRIMARY KEY,

    encoding            TEXT,
    line_count          INTEGER,

    last_read_at        INTEGER,

    cached_content      TEXT,

    FOREIGN KEY(node_id)
        REFERENCES nodes(id)
        ON DELETE CASCADE
);

-- =========================================
-- OPEN TABS
-- =========================================

CREATE TABLE open_tabs (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    workspace_id        INTEGER NOT NULL,

    node_id             INTEGER NOT NULL,

    tab_index           INTEGER NOT NULL,

    is_active           INTEGER NOT NULL DEFAULT 0,
    is_pinned           INTEGER NOT NULL DEFAULT 0,

    cursor_line         INTEGER DEFAULT 0,
    cursor_column       INTEGER DEFAULT 0,

    scroll_x            REAL DEFAULT 0,
    scroll_y            REAL DEFAULT 0,

    unsaved             INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY(workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    FOREIGN KEY(node_id)
        REFERENCES nodes(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_tabs_workspace
ON open_tabs(workspace_id);

-- =========================================
-- FILE WATCH EVENTS
-- =========================================

CREATE TABLE filesystem_events (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    workspace_id        INTEGER NOT NULL,

    node_path           TEXT NOT NULL,

    event_type          TEXT NOT NULL
                        CHECK(event_type IN (
                            'created',
                            'modified',
                            'deleted',
                            'renamed'
                        )),

    timestamp           INTEGER NOT NULL,

    processed           INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY(workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_fs_events_processed
ON filesystem_events(processed);

-- =========================================
-- SEARCH INDEX
-- =========================================

CREATE VIRTUAL TABLE file_search
USING fts5(
    path,
    content
);

-- =========================================
-- UI STATE
-- =========================================

CREATE TABLE ui_state (
    workspace_id        INTEGER PRIMARY KEY,

    sidebar_width       INTEGER,
    explorer_expanded   TEXT,
    panel_state_json    TEXT,

    FOREIGN KEY(workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE
);
