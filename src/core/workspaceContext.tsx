import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { getWorkspaceRoot, setWatchedFolders, setWorkspaceRoot as persistWorkspaceRoot } from "./cache"
import { startWatching } from "./bridge"
import { getWorkspaceTree, reconcileFromScan, scanWorkspace, analyzePaths, reconcileFromAnalyze } from "./db"
import { setWorkspaceRoot as clearPersistedRoot } from "./cache"
import type { WorkspaceTree } from "./db"

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
  const didAutoInit = useRef(false)
  const rootRef = useRef<string|null>(null)

  useEffect(() => { rootRef.current = rootPath }, [rootPath])

  const reload = useCallback(async (rootOverride?: string) => {
    let effectiveRoot = rootOverride ?? rootRef.current
    if (!effectiveRoot) {
      // Fallback to persisted settings if state is stale on first-run
      effectiveRoot = await getWorkspaceRoot()
      if (effectiveRoot) {
        if (rootRef.current !== effectiveRoot) setRootPath(effectiveRoot)
      } else {
        return
      }
    }
    setLoading(true)
    const t = await getWorkspaceTree(effectiveRoot)
    setTree(t)
    setLoading(false)
  }, [])

  const reindex = useCallback(async (rootOverride?: string) => {
    let effectiveRoot = rootOverride ?? rootRef.current
    if (!effectiveRoot) {
      // Fallback to persisted settings if state is stale on first-run
      effectiveRoot = await getWorkspaceRoot()
      if (effectiveRoot) {
        if (rootRef.current !== effectiveRoot) setRootPath(effectiveRoot)
      } else {
        return
      }
    }
    if (busy.current) { pending.current = true; return }
    busy.current = true
    setLoading(true)
    try {
      const scan = await scanWorkspace(effectiveRoot)
      await reconcileFromScan(effectiveRoot, scan)
      const t = await getWorkspaceTree(effectiveRoot)
      setTree(t)
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
      if (pending.current) {
        pending.current = false
        // Run one more time to pick up any missed changes
        reindex(effectiveRoot)
      }
    }
  }, [])

  const init = useCallback(async () => {
    const root = await getWorkspaceRoot()
    if (root) {
      // Only set state and reindex; watcher is managed by a separate effect on rootPath
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

  // Start FS watcher when rootPath becomes available; avoid duplicate start for same root
  const watchStartedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!rootPath) return
    if (watchStartedFor.current === rootPath) return
    watchStartedFor.current = rootPath
    startWatching([rootPath]).catch(err => console.error('watch start failed', err))
  }, [rootPath])

  const applyFsChanges = useCallback(async (paths: string[]) => {
    let effectiveRoot = rootRef.current ?? await getWorkspaceRoot()
    if (!effectiveRoot) return
    if (busy.current) { pending.current = true; return }
    busy.current = true
    setLoading(true)
    try {
      const diff = await analyzePaths(effectiveRoot, paths)
      await reconcileFromAnalyze(effectiveRoot, diff)
      const t = await getWorkspaceTree(effectiveRoot)
      setTree(t)
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
  }, [])

  const value = useMemo(() => ({ rootPath, tree, loading, init, setRoot, reload, reindex, applyFsChanges }), [rootPath, tree, loading, init, setRoot, reload, reindex, applyFsChanges])

  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceCtx)
  if (!ctx) throw new Error("WorkspaceProvider missing")
  return ctx
}
