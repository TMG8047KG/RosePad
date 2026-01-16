CREATE TABLE IF NOT EXISTS projects (
  rowid INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  ext TEXT,
  title TEXT,
  last_modified_ms INTEGER NOT NULL,
  size INTEGER NOT NULL,
  parent_physical_folder TEXT
);

CREATE TABLE IF NOT EXISTS physical_folders (
  path TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT
);

CREATE TABLE IF NOT EXISTS tags ( name TEXT PRIMARY KEY );

CREATE TABLE IF NOT EXISTS project_tags (
  project_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  PRIMARY KEY (project_id, tag_name),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_name) REFERENCES tags(name) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS project_fts USING fts5(
  name, title, tags, content='projects', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
  INSERT INTO project_fts(rowid,name,title,tags)
  VALUES (new.rowid,new.name,new.title,COALESCE((SELECT group_concat(tag_name,' ') FROM project_tags WHERE project_id=new.id),''));
END;

CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
  INSERT INTO project_fts(project_fts,rowid,name,title,tags) VALUES('delete',old.rowid,old.name,old.title,'');
  INSERT INTO project_fts(rowid,name,title,tags)
  VALUES (new.rowid,new.name,new.title,COALESCE((SELECT group_concat(tag_name,' ') FROM project_tags WHERE project_id=new.id),''));
END;

CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
  INSERT INTO project_fts(project_fts,rowid,name,title,tags) VALUES('delete',old.rowid,old.name,old.title,'');
END;

CREATE TRIGGER IF NOT EXISTS project_tags_ai AFTER INSERT ON project_tags BEGIN
  UPDATE project_fts SET tags=COALESCE((SELECT group_concat(tag_name,' ') FROM project_tags WHERE project_id=new.project_id),'') WHERE rowid=(SELECT rowid FROM projects WHERE id=new.project_id);
END;

CREATE TRIGGER IF NOT EXISTS project_tags_ad AFTER DELETE ON project_tags BEGIN
  UPDATE project_fts SET tags=COALESCE((SELECT group_concat(tag_name,' ') FROM project_tags WHERE project_id=old.project_id),'') WHERE rowid=(SELECT rowid FROM projects WHERE id=old.project_id);
END;

CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_physical_folder);
CREATE INDEX IF NOT EXISTS idx_projects_mtime ON projects(last_modified_ms);
