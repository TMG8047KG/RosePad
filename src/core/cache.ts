import { themes } from './themeManager';
import { setTheme } from "@tauri-apps/api/app";
import { getSettings, updateSettings } from "./settingsApi";

export async function getTheme(): Promise<themes> {
    const theme = (await getSettings()).theme
    return theme === 'light' || theme === 'dark' ? theme : null;
}

export async function applyTheme() {
    const theme = await getTheme();
    await setTheme(theme);
    applyThemeToDocument(theme);
}

export function applyThemeToDocument(theme: themes) {
    if (theme === null) {
        delete document.documentElement.dataset.theme;
    } else {
        document.documentElement.dataset.theme = theme;
    }
}

export async function setThemeCache(theme:themes) {
    await updateSettings({ theme })
}

export async function getWorkspaceRoot(): Promise<string | null> {
  const s = await getSettings()
  return s.workspaceDir ?? null
}

export async function setWorkspaceRoot(path: string | null): Promise<void> {
  await updateSettings({ workspaceDir: path })
}

export async function getWatchedFolders(): Promise<string[]> {
  const s = await getSettings()
  if (s.watched && s.watched.length) return s.watched
  return s.workspaceDir ? [s.workspaceDir] : []
}

export async function setWatchedFolders(folders: string[]): Promise<void> {
  await updateSettings({ watched: folders })
}
