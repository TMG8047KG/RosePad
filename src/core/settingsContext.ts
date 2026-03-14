//Settings bridge between the backend and the frontend
//Handles settings data and behaves like a global value
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

type AutoSaveSettings = {
  enabled: boolean
  interval: number
}

type DiscordCustomRpcSettings = {
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

type SettingsPatch = Partial<{
  workspaceDir: string | null
  watched: string[]
  autosave: Partial<AutoSaveSettings>
  theme: string
  discordRpc: boolean
  initialized: boolean
}>

type SettingsContextValue = {
  settings: AppSettings | null
  loading: boolean
  refresh: () => Promise<void>
  update: (patch: SettingsPatch) => Promise<AppSettings>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const next = await invoke<AppSettings>("get_settings")
    setSettings(next)
  }

  const update = async (patch: SettingsPatch) => {
    const next = await invoke<AppSettings>("update_settings", { patch })
    setSettings(next)
    return next
  }

  useEffect(() => {
    let isDisposed = false
    let unlisten: (() => void) | null = null

    const init = async () => {
      try {
        await refresh()
      } finally {
        if (!isDisposed) setLoading(false)
      }
    }

    void init()

    void listen<AppSettings>("settings:changed", (event) => {
      if (!isDisposed) setSettings(event.payload)
    }).then((fn) => {
      if (isDisposed) {
        fn()
        return
      }
      unlisten = fn
    })

    return () => {
      isDisposed = true
      unlisten?.()
    }
  }, [])

  const value = useMemo(() => ({ settings, loading, refresh, update }), [settings, loading])

  return createElement(SettingsContext.Provider, { value }, children)
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("SettingsProvider missing")
  return ctx
}