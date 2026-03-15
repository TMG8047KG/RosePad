import { open } from '@tauri-apps/plugin-dialog'
import { db } from './db'
import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { exists } from '@tauri-apps/plugin-fs'
import { updateSettings } from './settingsApi'


async function ensureWorkspaceFolder(baseDir: string): Promise<string> {
  const candidates = ['RosePad Workspace', 'rosepad_workspace', 'RosePadWorkspace', 'rosepadworkspace']
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
  // Otherwise, create a new workspace subfolder inside the selected folder
  const newWorkspace = await join(baseDir, candidates[0])
  await invoke('create_physical_folder', { root: baseDir, name: candidates[0] })
  return newWorkspace
}

export async function selectDir(): Promise<string | null> {
    const base = await open({ directory: true, multiple: false, title: 'Select workspace directory' })
    if (!base || Array.isArray(base)) return null
    const workspace = await ensureWorkspaceFolder(base)
    await updateSettings({ workspaceDir: workspace })
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

export async function pathFromOpenedFile(): Promise<string | null> {
  try {
    const paths = await invoke<string[]>('take_pending_open_paths')
    if (Array.isArray(paths) && paths.length > 0) return paths[0]
  } catch {}
  return null
}
