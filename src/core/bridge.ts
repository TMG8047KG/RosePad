import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

export async function startWatching(folders:string[]) { 
    await invoke('watch_physical_folders', { folders }) 
}

export async function stopWatching() {
    try { await invoke('stop_watching') } catch {}
}

export function onFsChanged(cb:(paths:string[])=>void):Promise<UnlistenFn> { 
    return listen<string[]>('fs:changed', e => cb(e.payload)) 
}
