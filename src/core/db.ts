import Database from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'

export type ProjectKind = 'rpad'|'doc'|'pdf'|'txt'|'unknown'

export type Project = {
  id: string
  kind: ProjectKind
  name: string
  path: string
  ext?: string|null
  title?: string|null
  lastModifiedMs: number
  size: number
  parentPhysicalFolder?: string|null
}

export type PhysicalFolder = { id:string; name:string; path:string; projectIds:string[]; collapsed:boolean; color?:string|null }
export type VirtualFolder = { id:string; name:string; projectIds:string[]; collapsed:boolean; color?:string|null }

export type WorkspaceTree = {
  rootProjects: string[]
  physicalFolders: PhysicalFolder[]
  virtualFolders: VirtualFolder[]
  projects: Project[]
}

export type AnalyzeResult = {
  projects: Project[]
  deleteProjectPaths: string[]
  physicalFolders: { path: string; name: string }[]
  deletePhysicalFolders: string[]
}

type ScanFolder = { path:string; name:string }
type ScanCamel = { rootProjects: any[]; physicalFolders: [ScanFolder, any[]][] }
type ScanSnake = { root_projects: any[]; physical_folders: [ScanFolder, any[]][] }

let dbPromise: Promise<any> | null = null
let tuned = false

export async function db() {
  if (!dbPromise) dbPromise = Database.load('sqlite:rosepad.db')
  const conn = await dbPromise
  if (!tuned) {
    await ensureSchema(conn)
    try {
      await conn.execute('PRAGMA foreign_keys=ON')
      await conn.execute('PRAGMA journal_mode=WAL')
      await conn.execute('PRAGMA synchronous=NORMAL')
    } catch {}
    tuned = true
  }
  return conn
}

async function ensureSchema(conn: any) {
  await conn.execute(`
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
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS physical_folders (
      path TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT
    );
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS virtual_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      collapsed INTEGER NOT NULL DEFAULT 0,
      color TEXT,
      root TEXT
    );
  `)
  // Add missing columns for forward compatibility
  try { await conn.execute(`ALTER TABLE virtual_folders ADD COLUMN root TEXT`) } catch {}
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS virtual_folder_projects (
      vf_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      PRIMARY KEY (vf_id, project_id)
    );
  `)
  await conn.execute(`CREATE TABLE IF NOT EXISTS tags (name TEXT PRIMARY KEY);`)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS project_tags (
      project_id TEXT NOT NULL,
      tag_name TEXT NOT NULL,
      PRIMARY KEY (project_id, tag_name)
    );
  `)
  await conn.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS project_fts USING fts5(
      name, title, tags, content='projects', content_rowid='rowid'
    );
  `)
  await conn.execute(`
    CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
      INSERT INTO project_fts(rowid,name,title,tags)
      VALUES (new.rowid,new.name,new.title,COALESCE((SELECT group_concat(tag_name,' ') FROM project_tags WHERE project_id=new.id),''));
    END;
  `)
  await conn.execute(`
    CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
      INSERT INTO project_fts(project_fts,rowid,name,title,tags) VALUES('delete',old.rowid,old.name,old.title,'');
      INSERT INTO project_fts(rowid,name,title,tags)
      VALUES (new.rowid,new.name,new.title,COALESCE((SELECT group_concat(tag_name,' ') FROM project_tags WHERE project_id=new.id),''));
    END;
  `)
  await conn.execute(`
    CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
      INSERT INTO project_fts(project_fts,rowid,name,title,tags) VALUES('delete',old.rowid,old.name,old.title,'');
    END;
  `)
  await conn.execute(`
    CREATE TRIGGER IF NOT EXISTS project_tags_ai AFTER INSERT ON project_tags BEGIN
      UPDATE project_fts SET tags=COALESCE((SELECT group_concat(tag_name,' ') FROM project_tags WHERE project_id=new.project_id),'')
      WHERE rowid=(SELECT rowid FROM projects WHERE id=new.project_id);
    END;
  `)
  await conn.execute(`
    CREATE TRIGGER IF NOT EXISTS project_tags_ad AFTER DELETE ON project_tags BEGIN
      UPDATE project_fts SET tags=COALESCE((SELECT group_concat(tag_name,' ') FROM project_tags WHERE project_id=old.project_id),'')
      WHERE rowid=(SELECT rowid FROM projects WHERE id=old.project_id);
    END;
  `)
  await conn.execute(`CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_physical_folder);`)
  await conn.execute(`CREATE INDEX IF NOT EXISTS idx_projects_mtime ON projects(last_modified_ms);`)
}

export async function scanWorkspace(root:string): Promise<ScanCamel> {
  const raw = await invoke<any>('scan_workspace', { root })
  return normalizeScan(raw)
}

export async function analyzePaths(root:string, paths:string[]): Promise<AnalyzeResult> {
  const raw = await invoke<any>('analyze_paths', { root, paths })
  const res: AnalyzeResult = {
    projects: Array.isArray(raw?.projects) ? raw.projects.map(coerceProject) : [],
    deleteProjectPaths: Array.isArray(raw?.delete_project_paths) ? raw.delete_project_paths : Array.isArray(raw?.deleteProjectPaths) ? raw.deleteProjectPaths : [],
    physicalFolders: Array.isArray(raw?.physical_folders) ? raw.physical_folders : Array.isArray(raw?.physicalFolders) ? raw.physicalFolders : [],
    deletePhysicalFolders: Array.isArray(raw?.delete_physical_folders) ? raw.delete_physical_folders : Array.isArray(raw?.deletePhysicalFolders) ? raw.deletePhysicalFolders : []
  }
  return res
}

function normalizeScan(raw: any): ScanCamel {
  if (!raw || typeof raw !== 'object') return { rootProjects: [], physicalFolders: [] }
  if (Array.isArray(raw.rootProjects) && Array.isArray(raw.physicalFolders)) {
    return {
      rootProjects: raw.rootProjects.map(coerceProject),
      physicalFolders: (raw.physicalFolders as any[]).map(pair => normalizePair(pair))
    }
  }
  if (Array.isArray(raw.root_projects) && Array.isArray(raw.physical_folders)) {
    return {
      rootProjects: (raw.root_projects as any[]).map(coerceProject),
      physicalFolders: (raw.physical_folders as any[]).map(pair => normalizePair(pair))
    }
  }
  return { rootProjects: [], physicalFolders: [] }
}

function normalizePair(pair:any): [ScanFolder, Project[]] {
  if (Array.isArray(pair)) {
    const [folder, items] = pair
    return [folder as ScanFolder, (items as any[]).map(coerceProject)]
  } else if (pair && typeof pair === 'object') {
    const folder = pair.folder ?? pair[0] ?? { path:'', name:'' }
    const items = pair.items ?? pair[1] ?? []
    return [folder as ScanFolder, (items as any[]).map(coerceProject)]
  }
  return [{ path:'', name:'' }, []]
}

function coerceProject(p: any): Project {
  return {
    id: p.id,
    kind: p.kind,
    name: p.name,
    path: p.path,
    ext: p.ext ?? null,
    title: p.title ?? null,
    lastModifiedMs: p.lastModifiedMs ?? p.last_modified_ms ?? 0,
    size: p.size ?? p.sizeBytes ?? 0,
    parentPhysicalFolder: p.parentPhysicalFolder ?? p.parent_physical_folder ?? null
  }
}

export async function renameProjectPath(oldPath:string, newName:string) {
  return await invoke<string>('rename_project', { oldPath, newName })
}

export async function deleteProjectPath(path:string) {
  await invoke('delete_project', { path })
}

export async function moveProjectPath(oldPath: string, destDir: string) {
  return await invoke<string>('move_project', { oldPath, destDir })
}

export async function renamePhysicalFolder(path: string, newName: string) {
  // Perform the physical rename via Tauri backend and receive the new path
  const newPath = await invoke<string>('rename_physical_folder', { path, newName })
  try {
    // Preserve folder color (and any other metadata) by moving the row to the new path
    const d = await db()
    await d.execute(`UPDATE physical_folders SET path=? WHERE path=?`, [newPath, path])
  } catch {}
  return newPath
}

export async function deletePhysicalFolder(path: string) {
  await invoke('delete_physical_folder', { path })
}

export async function createPhysicalFolder(root: string, name: string) {
  return await invoke<string>('create_physical_folder', { root, name })
}

export async function reconcileFromScan(root:string, scanIn: ScanCamel | ScanSnake | any) {
  const scan = normalizeScan(scanIn)
  const d = await db()
  await d.execute('BEGIN')
  try {
    const seenProj: string[] = []
    const seenFold: string[] = []

    for (const p of scan.rootProjects) {
      await d.execute(
        `INSERT INTO projects(id,path,name,kind,ext,title,last_modified_ms,size,parent_physical_folder)
         VALUES (?,?,?,?,?,?,?,?,NULL)
         ON CONFLICT(path) DO UPDATE SET name=excluded.name, kind=excluded.kind, ext=excluded.ext, title=excluded.title, last_modified_ms=excluded.last_modified_ms, size=excluded.size, parent_physical_folder=NULL`,
        [p.id, p.path, p.name, p.kind, p.ext ?? null, p.title ?? null, p.lastModifiedMs, p.size]
      )
      seenProj.push(p.path)
    }

    for (const [folder, items] of scan.physicalFolders) {
      await d.execute(
        `INSERT INTO physical_folders(path,name) VALUES(?,?)
         ON CONFLICT(path) DO UPDATE SET name=excluded.name`,
        [folder.path, folder.name]
      )
      seenFold.push(folder.path)
      for (const p of items) {
        await d.execute(
          `INSERT INTO projects(id,path,name,kind,ext,title,last_modified_ms,size,parent_physical_folder)
           VALUES (?,?,?,?,?,?,?,?,?)
           ON CONFLICT(path) DO UPDATE SET name=excluded.name, kind=excluded.kind, ext=excluded.ext, title=excluded.title, last_modified_ms=excluded.last_modified_ms, size=excluded.size, parent_physical_folder=excluded.parent_physical_folder`,
          [p.id, p.path, p.name, p.kind, p.ext ?? null, p.title ?? null, p.lastModifiedMs, p.size, folder.path]
        )
        seenProj.push(p.path)
      }
    }

    const normRoot = root.replace(/\\/g,'/').toLowerCase()
    const normRootWithSlash = normRoot.endsWith('/') ? normRoot : `${normRoot}/`
    const projPlace = seenProj.map(()=>'?').join(',')
    await d.execute(
      `DELETE FROM projects WHERE (REPLACE(LOWER(path),'\\','/') = ? OR REPLACE(LOWER(path),'\\','/') LIKE ?) ${seenProj.length ? `AND path NOT IN (${projPlace})` : ''}`,
      [normRoot, normRootWithSlash + '%', ...seenProj]
    )

    const foldPlace = seenFold.map(()=>'?').join(',')
    await d.execute(
      `DELETE FROM physical_folders WHERE (REPLACE(LOWER(path),'\\','/') = ? OR REPLACE(LOWER(path),'\\','/') LIKE ?) ${seenFold.length ? `AND path NOT IN (${foldPlace})` : ''}`,
      [normRoot, normRootWithSlash + '%', ...seenFold]
    )

    await d.execute('COMMIT')
  } catch (e) {
    await d.execute('ROLLBACK')
    throw e
  }
}

export async function getWorkspaceTree(root:string): Promise<WorkspaceTree> {
  const d = await db()
  const normRoot = root.replace(/\\/g,'/').toLowerCase()
  const normRootWithSlash = normRoot.endsWith('/') ? normRoot : `${normRoot}/`
  const projects = await d.select(
    `SELECT id,kind,name,path,ext,title,last_modified_ms as lastModifiedMs,parent_physical_folder as parentPhysicalFolder,size
     FROM projects WHERE REPLACE(LOWER(path),'\\','/') = ? OR REPLACE(LOWER(path),'\\','/') LIKE ?`,
    [normRoot, normRootWithSlash + '%']
  )

  // Exclude projects assigned to a virtual folder in this workspace from the root list
  const assignedRows = await d.select(
    `SELECT vfp.project_id as projectId
     FROM virtual_folder_projects vfp
     JOIN virtual_folders vf ON vf.id = vfp.vf_id
     WHERE vf.root = ? OR (vf.root IS NULL AND ? = '')`,
    [root, root]
  )
  const assignedSet = new Set<string>(assignedRows.map((r:any)=>r.projectId))
  const rootProjects = projects
    .filter((p:any)=>!p.parentPhysicalFolder && !assignedSet.has(p.id))
    .map((p:any)=>p.id)

  const pf = await d.select(`SELECT path,name,color FROM physical_folders WHERE REPLACE(LOWER(path),'\\','/') = ? OR REPLACE(LOWER(path),'\\','/') LIKE ?`, [normRoot, normRootWithSlash + '%'])
  const physicalFolders: PhysicalFolder[] = []
  for (const row of pf) {
    const ids = await d.select(`SELECT id FROM projects WHERE parent_physical_folder=? ORDER BY name COLLATE NOCASE`, [row.path])
    physicalFolders.push({
      id: row.path,
      name: row.name,
      path: row.path,
      projectIds: ids.map((x:any)=>x.id),
      collapsed: false,
      color: row.color ?? null
    })
  }

  const vf = await d.select(`SELECT id,name,collapsed,color FROM virtual_folders WHERE root IS NULL OR root = ?`, [root])
  const virtualFolders: VirtualFolder[] = []
  for (const row of vf) {
    const pids = await d.select(`SELECT project_id FROM virtual_folder_projects WHERE vf_id=?`, [row.id])
    virtualFolders.push({
      id: row.id,
      name: row.name,
      projectIds: pids.map((x:any)=>x.project_id),
      collapsed: !!row.collapsed,
      color: row.color ?? null
    })
  }

  return { rootProjects, physicalFolders, virtualFolders, projects }
}

export async function searchProjects(q:string, limit=50) {
  const d = await db()
  const rows = await d.select(
    `SELECT p.id,p.kind,p.name,p.path,p.ext,p.title,p.last_modified_ms as lastModifiedMs,p.parent_physical_folder as parentPhysicalFolder,p.size
     FROM project_fts f JOIN projects p ON f.rowid = p.rowid
     WHERE project_fts MATCH ? ORDER BY rank LIMIT ?`,
    [q, limit]
  )
  return rows as Project[]
}

export async function addVirtualFolder(name:string, root?:string) {
  const d = await db()
  const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  await d.execute(`INSERT INTO virtual_folders(id,name,collapsed,root) VALUES(?,?,0,?)`, [id, name, root ?? null])
  return id
}

export async function reconcileFromAnalyze(_root:string, diff: AnalyzeResult) {
  const d = await db()
  await d.execute('BEGIN')
  try {
    // Upsert physical folders
    for (const f of diff.physicalFolders) {
      await d.execute(
        `INSERT INTO physical_folders(path,name) VALUES(?,?)
         ON CONFLICT(path) DO UPDATE SET name=excluded.name`,
        [f.path, f.name]
      )
    }

    // Delete removed physical folders and their projects
    for (const p of diff.deletePhysicalFolders) {
      await d.execute(`DELETE FROM projects WHERE parent_physical_folder=?`, [p])
      await d.execute(`DELETE FROM physical_folders WHERE path=?`, [p])
    }

    // Upsert projects
    for (const p of diff.projects) {
      await d.execute(
        `INSERT INTO projects(id,path,name,kind,ext,title,last_modified_ms,size,parent_physical_folder)
         VALUES (?,?,?,?,?,?,?,?,?)
         ON CONFLICT(path) DO UPDATE SET name=excluded.name, kind=excluded.kind, ext=excluded.ext, title=excluded.title, last_modified_ms=excluded.last_modified_ms, size=excluded.size, parent_physical_folder=excluded.parent_physical_folder`,
        [p.id, p.path, p.name, p.kind, p.ext ?? null, p.title ?? null, p.lastModifiedMs, p.size, p.parentPhysicalFolder ?? null]
      )
    }

    // Delete removed projects by path
    if (diff.deleteProjectPaths.length) {
      const placeholders = diff.deleteProjectPaths.map(()=>'?').join(',')
      await d.execute(`DELETE FROM projects WHERE path IN (${placeholders})`, diff.deleteProjectPaths)
    }

    await d.execute('COMMIT')
  } catch (e) {
    await d.execute('ROLLBACK')
    throw e
  }
}

export async function assignProjectToVirtual(projectId:string, vfId:string) {
  const d = await db()
  await d.execute(`INSERT OR IGNORE INTO virtual_folder_projects(vf_id,project_id) VALUES(?,?)`, [vfId, projectId])
}

// Convenience: assign by file path after reconciliation
export async function assignProjectPathToVirtual(path:string, vfId:string) {
  const d = await db()
  await d.execute(
    `INSERT OR IGNORE INTO virtual_folder_projects(vf_id,project_id)
     SELECT ?, id FROM projects WHERE path = ?`,
    [vfId, path]
  )
}

export async function setPhysicalFolderColor(path:string, color?:string|null) {
  const d = await db()
  const name = (path.split(/[/\\]/).filter(Boolean).pop()) || path
  // Ensure row exists and set color atomically; preserve any existing name on conflict except update color
  await d.execute(
    `INSERT INTO physical_folders(path,name,color) VALUES(?,?,?)
     ON CONFLICT(path) DO UPDATE SET color=excluded.color`,
    [path, name, color ?? null]
  )
}

export async function setVirtualFolderColor(id:string, color?:string|null) {
  const d = await db()
  await d.execute(`UPDATE virtual_folders SET color=? WHERE id=?`, [color ?? null, id])
}

export async function renameVirtualFolder(id: string, newName: string) {
  const d = await db()
  await d.execute(`UPDATE virtual_folders SET name=? WHERE id=?`, [newName, id])
}

export async function deleteVirtualFolder(id: string) {
  const d = await db()
  await d.execute(`DELETE FROM virtual_folders WHERE id=?`, [id])
}

export async function clearVirtualFolders() {
  const d = await db()
  await d.execute(`DELETE FROM virtual_folder_projects`)
  await d.execute(`DELETE FROM virtual_folders`)
}
