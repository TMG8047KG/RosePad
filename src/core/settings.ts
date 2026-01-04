import { Store } from '@tauri-apps/plugin-store'
import { themes } from './themeManager'

export type AppSettings = {
  projectPath: string | null
  watched: string[]
  theme: themes
  autosave: { enabled: boolean; interval: number }
  recent: { name: string; path: string; ts: number }[]
}

const SETTINGS_FILE = 'settings.json'
const SETTINGS_BACKUP = 'settings.json.bak'
const defaults: AppSettings = {
  projectPath: null,
  watched: [],
  theme: 'dark',
  autosave: { enabled: true, interval: 2 },
  recent: []
}

let storePromise: Promise<Store> | null = null
async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = Store.load(SETTINGS_FILE)
  }
  return storePromise
}

async function readRaw(): Promise<Record<string, any>> {
  const store = await getStore()
  try {
    const entries = await store.entries()
    return Object.fromEntries(entries)
  } catch {
    return {}
  }
}

function normalize(raw: Record<string, any>): AppSettings & Record<string, any> {
  return {
    ...defaults,
    ...raw,
    projectPath: raw.projectPath ?? null,
    watched: Array.isArray(raw.watched) ? raw.watched : [],
    theme: (raw.theme as themes) ?? defaults.theme,
    autosave: raw.autosave && typeof raw.autosave === 'object'
      ? { enabled: !!raw.autosave.enabled, interval: Number(raw.autosave.interval) || defaults.autosave.interval }
      : { ...defaults.autosave },
    recent: Array.isArray(raw.recent) ? raw.recent : []
  }
}

async function persist(next: AppSettings & Record<string, any>) {
  const store = await getStore()
  await store.clear()
  for (const [key, value] of Object.entries(next)) {
    await store.set(key, value)
  }
  await store.save()
}

export async function ensureSettingsPrimed() {
  const raw = await readRaw()
  if (raw.initialized === true) return
  const normalized = normalize(raw)
  await persist({ ...normalized, initialized: true })
}

export async function getSettings(): Promise<AppSettings & Record<string, any>> {
  const raw = await readRaw()
  return normalize(raw)
}

let writeChain: Promise<void> = Promise.resolve()
export async function updateSettings(
  patch: Partial<AppSettings> | ((s: AppSettings & Record<string, any>) => AppSettings & Record<string, any>)
) {
  writeChain = writeChain.then(async () => {
    const current = await getSettings()
    const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch }
    const normalized = normalize(next)
    await persist(normalized)
  }).catch(() => {})
  return writeChain
}

export { SETTINGS_FILE, SETTINGS_BACKUP, defaults as defaultSettings }
