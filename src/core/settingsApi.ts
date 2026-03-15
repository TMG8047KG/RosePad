import { invoke } from "@tauri-apps/api/core"

export type AutoSaveSettings = {
  enabled: boolean
  interval: number
}

export type DiscordCustomRpcSettings = {
  details: string | null
  state: string | null
}

export type AppSettings = {
  workspaceDir: string | null
  watched: string[]
  autosave: AutoSaveSettings
  theme: string
  discordRpc: boolean
  discordCtmRpc: DiscordCustomRpcSettings
  initialized: boolean
}

export type SettingsPatch = Partial<{
  workspaceDir: string | null
  watched: string[]
  autosave: Partial<AutoSaveSettings>
  theme: string | null
  discordRpc: boolean
  initialized: boolean
}>

export async function getSettings(): Promise<AppSettings> {
  return await invoke<AppSettings>("get_settings")
}

export async function updateSettings(patch: SettingsPatch): Promise<AppSettings> {
  return await invoke<AppSettings>("update_settings", { patch })
}
