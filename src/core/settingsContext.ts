import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { getSettings, updateSettings, type AppSettings, type SettingsPatch } from "./settingsApi"
import { listen } from "@tauri-apps/api/event"

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
    const next = await getSettings()
    setSettings(next)
  }

  const update = async (patch: SettingsPatch) => {
    const next = await updateSettings(patch)
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
