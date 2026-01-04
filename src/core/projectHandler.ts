import { open } from '@tauri-apps/plugin-dialog'
import { db } from './db'
import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { exists } from '@tauri-apps/plugin-fs'
import { getSettings, updateSettings } from './settings'

export const settingsFile = 'settings.json'

type SettingsShape = {
  projectPath: string | null
  recent?: { name: string; path: string; ts: number }[]
}

async function ensureSettings(): Promise<SettingsShape> {
  const base = await getSettings()
  return {
    projectPath: base.projectPath ?? null,
    recent: Array.isArray(base.recent) ? base.recent : []
  }
}

let writeChain: Promise<void> = Promise.resolve()
async function saveSettings(s: SettingsShape) {
  // Serialize writes and merge with other settings consumers
  writeChain = writeChain.then(async () => {
    await updateSettings(curr => ({
      ...curr,
      projectPath: s.projectPath,
      recent: s.recent ?? curr.recent ?? []
    }))
  }).catch(() => {}) // Swallow to keep chain alive
  return writeChain
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
  // If there is already a known workspace-style folder inside, use it; otherwise, use the chosen folder directly
  for (const name of candidates) {
    const p = await join(baseDir, name)
    if (await exists(p)) {
      return p
    }
  }
  return baseDir
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
