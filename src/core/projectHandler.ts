import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists, BaseDirectory, mkdir } from '@tauri-apps/plugin-fs'
import { type as osType } from '@tauri-apps/plugin-os'
import { db } from './db'
import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'

export const settingsFile = 'settings.json'

type SettingsShape = {
  projectPath: string | null
  recent?: { name: string; path: string; ts: number }[]
}

async function baseDir() {
  const t = await osType()
  return ['android','ios'].includes(t) ? BaseDirectory.AppLocalData : BaseDirectory.AppConfig
}

async function ensureSettings(): Promise<SettingsShape> {
  const b = await baseDir()
  const ok = await exists(settingsFile, { baseDir: b })
  if (!ok) {
    const def: SettingsShape = { projectPath: null, recent: [] }
    await writeTextFile(settingsFile, JSON.stringify(def, null, 2), { baseDir: b })
    return def
  }
  const raw = await readTextFile(settingsFile, { baseDir: b })
  try {
    const parsed = JSON.parse(raw) as SettingsShape
    if (!Object.prototype.hasOwnProperty.call(parsed, 'projectPath')) parsed.projectPath = null
    if (!Object.prototype.hasOwnProperty.call(parsed, 'recent')) parsed.recent = []
    return parsed
  } catch {
    const def: SettingsShape = { projectPath: null, recent: [] }
    await writeTextFile(settingsFile, JSON.stringify(def, null, 2), { baseDir: b })
    return def
  }
}

async function saveSettings(s: SettingsShape) {
  const b = await baseDir()
  await writeTextFile(settingsFile, JSON.stringify(s, null, 2), { baseDir: b })
}

export async function settings() {
  await ensureSettings()
}

async function ensureWorkspaceFolder(baseDir: string): Promise<string> {
  const candidates = ['RosePad Workspace', '.rosepad', 'RosePadWorkspace']
  // If the selected folder already looks like a workspace folder, use it as-is
  const parts = baseDir.split(/\\|\//).filter(Boolean)
  const last = parts.length ? parts[parts.length - 1] : ''
  if (candidates.some(c => c.toLowerCase() === last.toLowerCase())) {
    return baseDir
  }
  // Otherwise, prefer an existing candidate within the selected folder; if none, create one
  for (const name of candidates) {
    const p = await join(baseDir, name)
    if (!(await exists(p))) {
      await mkdir(p, { recursive: true })
      return p
    }
  }
  return await join(baseDir, candidates[0])
}

export async function selectDir(): Promise<string | null> {
  const base = await open({ directory: true, multiple: false, title: 'Select a directory for the RosePad workspace' })
  if (!base || Array.isArray(base)) return null
  const workspace = await ensureWorkspaceFolder(base)
  const s = await ensureSettings()
  s.projectPath = workspace
  await saveSettings(s)
  return workspace
}

export async function projectExists(filePath: string): Promise<boolean> {
  try {
    const d = await db()
    const rows = await d.select('SELECT 1 AS x FROM projects WHERE path = ? LIMIT 1', [filePath])
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return false
  }
}

export async function addProject(name: string, filePath: string) {
  const s = await ensureSettings()
  const recent = s.recent || []
  const withoutDup = recent.filter(r => r.path !== filePath)
  withoutDup.unshift({ name, path: filePath, ts: Date.now() })
  s.recent = withoutDup.slice(0, 20)
  await saveSettings(s)
}

export async function pathFromOpenedFile(): Promise<string | null> {
  try {
    const paths = await invoke<string[]>('take_pending_open_paths')
    if (Array.isArray(paths) && paths.length > 0) return paths[0]
  } catch {}
  return null
}

