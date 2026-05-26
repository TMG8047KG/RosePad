import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { getWorkspaceRoot, setWatchedFolders, setWorkspaceRoot as persistWorkspaceRoot } from "./cache"
import { startWatching, stopWatching } from "./bridge"
import { getWorkspaceTree, reconcileFromScan, scanWorkspace, analyzePaths, reconcileFromAnalyze } from "./db"
import { setWorkspaceRoot as clearPersistedRoot } from "./cache"
import type { WorkspaceTree } from "./db"
import { invoke } from "@tauri-apps/api/core"

type Ctx = {
  rootPath: string|null
  tree: WorkspaceTree|null
  loading: boolean
  init: () => Promise<void>
  setRoot: (root: string) => Promise<void>
  reload: (rootOverride?: string) => Promise<void>
  reindex: (rootOverride?: string) => Promise<void>
  applyFsChanges: (paths: string[]) => Promise<void>
}

const WorkspaceCtx = createContext<Ctx | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [rootPath, setRootPath] = useState<string|null>(null)
  const [tree, setTree] = useState<WorkspaceTree|null>(null)
  const [loading, setLoading] = useState(false)
  const busy = useRef(false)
  const pending = useRef(false)
  const pendingPaths = useRef<Set<string>>(new Set())
  const didAutoInit = useRef(false)
  const rootRef = useRef<string|null>(null)

  useEffect(() => { rootRef.current = rootPath }, [rootPath])

  const resolveRoot = useCallback(async (rootOverride?: string) => {
    let effectiveRoot = rootOverride ?? rootRef.current
    if (!effectiveRoot) {
      effectiveRoot = await getWorkspaceRoot()
      if (effectiveRoot && rootRef.current !== effectiveRoot) setRootPath(effectiveRoot)
    }
    return effectiveRoot
  }, [])

  const reload = useCallback(async (rootOverride?: string) => {
    const effectiveRoot = await resolveRoot(rootOverride)
    if (!effectiveRoot) return
    setLoading(true)
    const t = await getWorkspaceTree(effectiveRoot)
    setTree(t)
    setLoading(false)
  }, [resolveRoot])

  const reindex = useCallback(async (rootOverride?: string) => {
    const effectiveRoot = await resolveRoot(rootOverride)
    if (!effectiveRoot) return
    if (busy.current) { pending.current = true; return }
    busy.current = true
    setLoading(true)
    try {
      do {
        pending.current = false
        const scan = await scanWorkspace(effectiveRoot)
        await reconcileFromScan(effectiveRoot, scan)
        const t = await getWorkspaceTree(effectiveRoot)
        setTree(t)
      } while (pending.current)
    } catch (e) {
      console.error('reindex failed', e)
      const msg = String(e || '')
      // If the persisted root is invalid, clear it to recover the UI
      if (msg.includes('not a directory') || msg.includes('cannot read workspace root')) {
        try {
          await clearPersistedRoot(null)
        } catch {}
        setRootPath(null)
        setTree(null)
      }
    } finally {
      setLoading(false)
      busy.current = false
    }
  }, [resolveRoot])

  const init = useCallback(async () => {
    let root = await getWorkspaceRoot()
    if (!root) {
        // First launch — use the folder Rust already created in Documents
        try {
            root = await invoke<string | null>('get_default_workspace')
            if (root) await persistWorkspaceRoot(root)  // save so next launch skips this
        } catch {}
    }
    if (root) {
        setRootPath(root)
        await reindex(root)
    }
  }, [reindex])

  const setRoot = useCallback(async (root: string) => {
    setRootPath(root)
    // Persist selection for future sessions and watcher config
    await persistWorkspaceRoot(root)
    await setWatchedFolders([root])
    // Watcher will be (re)started by the rootPath effect
    await reindex(root)
  }, [reindex])

  useEffect(() => {
    if (didAutoInit.current) return
    didAutoInit.current = true
    init()
  }, [init])

  useEffect(() => {
    if (!rootPath) return
    stopWatching().catch(()=>{})
    startWatching([rootPath]).catch(err => console.error('watch start failed', err))
  }, [rootPath])

  const applyFsChanges = useCallback(async (paths: string[]) => {
    const effectiveRoot = await resolveRoot()
    if (!effectiveRoot) return
    paths.forEach(p => pendingPaths.current.add(p))
    if (busy.current) { pending.current = true; return }
    busy.current = true
    setLoading(true)
    try {
      do {
        pending.current = false
        const batch = Array.from(pendingPaths.current)
        pendingPaths.current.clear()
        if (batch.length === 0) break
        const diff = await analyzePaths(effectiveRoot, batch)
        await reconcileFromAnalyze(effectiveRoot, diff)
        const t = await getWorkspaceTree(effectiveRoot)
        setTree(t)
      } while (pending.current || pendingPaths.current.size > 0)
    } catch (e) {
      console.error('applyFsChanges failed', e)
    } finally {
      setLoading(false)
      busy.current = false
      if (pending.current) {
        pending.current = false
        reindex(effectiveRoot)
      }
    }
  }, [resolveRoot, reindex])

  const value = useMemo(() => ({ rootPath, tree, loading, init, setRoot, reload, reindex, applyFsChanges }), [rootPath, tree, loading, init, setRoot, reload, reindex, applyFsChanges])

  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceCtx)
  if (!ctx) throw new Error("WorkspaceProvider missing")
  return ctx
}
