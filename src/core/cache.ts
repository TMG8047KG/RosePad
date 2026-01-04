import { themes } from './themeManager';
import { setTheme } from "@tauri-apps/api/app";
import { ensureSettingsPrimed, getSettings, updateSettings } from "./settings";

type AutoSave = {
    enabled: boolean;
    interval: number;
}

export async function setup(){
    await ensureSettingsPrimed()
}

export async function getTheme(): Promise<themes> {
    return (await getSettings()).theme ?? 'dark';
}

export async function applyTheme(){
    await setTheme(await getTheme());
}

export async function setThemeCache(theme:themes) {
    await updateSettings(s => ({ ...s, theme }))
}

export async function getWorkspaceRoot(): Promise<string | null> {
  const s = await getSettings()
  return s.projectPath ?? null
}

export async function setWorkspaceRoot(path: string | null): Promise<void> {
  await updateSettings(s => ({ ...s, projectPath: path }))
}

export async function getWatchedFolders(): Promise<string[]> {
  const s = await getSettings()
  if (s.watched && s.watched.length) return s.watched
  return s.projectPath ? [s.projectPath] : []
}

export async function setWatchedFolders(folders: string[]): Promise<void> {
  await updateSettings(s => ({ ...s, watched: folders }))
}
