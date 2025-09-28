import { get, set } from "tauri-plugin-cache-api";
import { themes } from "./themeManager";
import { setTheme } from "@tauri-apps/api/app";

export async function setup(){
    const init = await get('initialized');
    if(init !== null || init) return;
    await set('theme', 'dark');
    await set('autosave', { enabled: true, interval: 2 });
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

export async function getAutosave() {
    return await get('autosave');
}