import { useEffect, useRef } from "react"
import { onFsChanged } from "../core/bridge"
import { useWorkspace } from "../core/workspaceContext"

export function useFsAutoReload() {
  const { applyFsChanges, reindex } = useWorkspace()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bufferRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    let un: (() => void) | null = null
    onFsChanged((paths) => {
      // Collect paths and debounce apply
      if (Array.isArray(paths)) {
        for (const p of paths) bufferRef.current.add(p)
      }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        const batch = Array.from(bufferRef.current)
        bufferRef.current.clear()
        try {
          await applyFsChanges(batch)
        } catch {
          // Fallback to full reindex if targeted apply fails
          await reindex()
        }
      }, 300)
    }).then(u => (un = u))
    return () => { 
      if (un) un()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [applyFsChanges, reindex])
}
