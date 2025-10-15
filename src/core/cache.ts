import { get, set } from "tauri-plugin-cache-api";
import { readTextFile, writeTextFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs'
import { type as osType } from '@tauri-apps/plugin-os'
import { themes } from './themeManager';
import { setTheme } from "@tauri-apps/api/app";

type Settings = { projectPath: string | null; watched?: string[] }
const SETTINGS_FILE = 'settings.json'

async function baseDir() {
  const t = await osType()
  return ['android','ios'].includes(t) ? BaseDirectory.AppLocalData : BaseDirectory.AppConfig
}

async function readSettings(): Promise<Settings> {
  const b = await baseDir()
  const ok = await exists(SETTINGS_FILE, { baseDir: b })
  if (!ok) {
    const def: Settings = { projectPath: null, watched: [] }
    await writeTextFile(SETTINGS_FILE, JSON.stringify(def, null, 2), { baseDir: b })
    return def
  }
  try {
    const raw = await readTextFile(SETTINGS_FILE, { baseDir: b })
    const parsed = JSON.parse(raw) as Partial<Settings> | null
    return { projectPath: parsed?.projectPath ?? null, watched: parsed?.watched ?? [] }
  } catch {
    const def: Settings = { projectPath: null, watched: [] }
    await writeTextFile(SETTINGS_FILE, JSON.stringify(def, null, 2), { baseDir: b })
    return def
  }
}

async function writeSettings(s: Settings) {
  const b = await baseDir()
  await writeTextFile(SETTINGS_FILE, JSON.stringify(s, null, 2), { baseDir: b })
}

type AutoSave = {
    enabled: boolean;
    interval: number;
}

export async function setup(){
    const init = await get('initialized');
    if(init !== null || init) return;
    await set('theme', 'dark');
    await set('autosave', { enabled: true, interval: 2 } as AutoSave);
    await set('watchedFolders', { folders: [] });
    await set('initialized', true);
}

export async function getTheme(): Promise<themes> {
    return await get<themes>('theme');
}

export async function applyTheme(){
    await setTheme(await get<themes>('theme'));
}

export async function setThemeCache(theme:themes) {
    await set('theme', theme);
}

export async function getWorkspaceRoot(): Promise<string | null> {
  const s = await readSettings()
  return s.projectPath ?? null
}

export async function setWorkspaceRoot(path: string | null): Promise<void> {
  const s = await readSettings()
  s.projectPath = path
  await writeSettings(s)
}

export async function getWatchedFolders(): Promise<string[]> {
  const s = await readSettings()
  if (s.watched && s.watched.length) return s.watched
  return s.projectPath ? [s.projectPath] : []
}

export async function setWatchedFolders(folders: string[]): Promise<void> {
  const s = await readSettings()
  s.watched = folders
  await writeSettings(s)
}
