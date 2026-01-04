import NavBar from "./components/nav"
import './styles/Main.css'
import style from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import { save } from "@tauri-apps/plugin-dialog"
import { readTextFile } from "@tauri-apps/plugin-fs"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { rpc_project } from "./core/discord_rpc"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

import EditorPanel from "./core/editor/rPanel"
import StyleMenu from "./components/editor/stylesMenu"
import EditorTabs, { type OpenProject } from "./components/editor/editorTabs"
import { getView, onDocChange } from "./core/editor/editorBridge"
import { DOMSerializer, DOMParser as PMDOMParser, Node as PMNode } from "prosemirror-model"
import { rSchema } from "./core/editor/rSchema"
import ProjectPickerModal from "./components/editor/projectPickerModal"
import { useWorkspace } from "./core/workspaceContext"
import { useToast } from "./core/toast"

const DOC_CACHE_TTL_MS = 5 * 60 * 1000

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function countWords(raw: string) {
  const text = raw.replace(/\u00A0/g, " ").replace(/[\r\n]+/g, " ").trim()
  if (!text) return 0

  // Prefer built-in word segmentation for better unicode + punctuation handling
  const Segmenter = (Intl as any).Segmenter as
    | (new (...args: any[]) => { segment(input: string): Iterable<any> })
    | undefined
  if (Segmenter) {
    const segmenter = new Segmenter(undefined, { granularity: "word" })
    let count = 0
    for (const segment of segmenter.segment(text) as any) {
      if (segment.isWordLike) count += 1
    }
    return count
  }

  // Fallback: match word-like tokens (letters/numbers) with optional intra-word hyphens/apostrophes/dashes
  const matches = text.match(/[\p{L}\p{N}]+(?:['’\-–—][\p{L}\p{N}]+)*/gu)
  return matches ? matches.length : 0
}

function extractDocText(doc: { textBetween: (from: number, to: number, blockSeparator?: string, leafSeparator?: string) => string; content: { size: number } }) {
  return doc?.textBetween(0, doc.content.size, "\n", "\n") || ""
}

function extOf(p: string) {
  const m = /\.([^.]+)$/i.exec(p)
  return m ? m[1].toLowerCase() : ""
}

async function loadCurrentFile(path: string): Promise<string> {
  const ext = extOf(path)
  if (ext === "rpad") {
    try {
      const html = await invoke<string>("read_rpad_data", { path })
      return html || "<p></p>"
    } catch {
      return "<p></p>"
    }
  }
  if (ext === "txt") {
    try { return await readTextFile(path) } catch { return "" }
  }
  try { return await readTextFile(path) } catch { return "" }
}

export default function Editor() {
  const navigator = useNavigate()
  const { tree } = useWorkspace()
  const pushToast = useToast()
  const [characters, setCharacters] = useState(0)
  const [words, setWords] = useState(0)
  const [isSaved, setSaved] = useState(true)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)
  const readStoredProjects = (key: string) => {
    try {
      const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter(p => typeof p?.name === "string" && typeof p?.path === "string")
        .map(p => ({ name: p.name, path: p.path } as OpenProject))
    } catch {
      return []
    }
  }
  const [openProjects, setOpenProjects] = useState<OpenProject[]>(() => readStoredProjects("openProjects"))
  const lastSessionSnapshotRef = useRef<OpenProject[]>(readStoredProjects("openProjects:lastSession"))
  const [isPickerOpen, setPickerOpen] = useState(false)
  const [pickerInitialSelection, setPickerInitialSelection] = useState<OpenProject[]>(openProjects)
  const pickerHasOpenedRef = useRef(sessionStorage.getItem("projectPicker:openedOnce") === "true")
  const [currentPath, setCurrentPath] = useState(sessionStorage.getItem("path") || "")
  const openProjectsRef = useRef(openProjects)
  const currentPathRef = useRef(currentPath)
  const switchProjectRef = useRef<(project: OpenProject) => Promise<void> | undefined>(undefined)
  const isSwitchingRef = useRef(false)
  const pendingSwitchRef = useRef<OpenProject | null>(null)
  const loadRequestIdRef = useRef(0)
  const [unsavedPaths, setUnsavedPaths] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem("unsavedPaths")
      if (!raw) return new Set<string>()
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return new Set<string>()
      return new Set(parsed.filter((p: unknown) => typeof p === "string"))
    } catch {
      return new Set<string>()
    }
  })
  const unsavedPathsRef = useRef<Set<string>>(new Set(unsavedPaths))
  const projectOptions = useMemo(() => {
    if (!tree) return []
    return tree.projects.map(p => ({
      id: p.id,
      name: p.title || p.name,
      path: p.path,
      lastModifiedMs: p.lastModifiedMs
    }))
  }, [tree])
  const sanitizeSelection = (list: OpenProject[]) => {
    const seen = new Set<string>()
    const filtered: OpenProject[] = []
    for (const item of list) {
      if (!item?.path || !item?.name) continue
      if (seen.has(item.path)) continue
      seen.add(item.path)
      filtered.push({ name: item.name, path: item.path })
    }
    return filtered
  }
  const sanitizedLastSession = useMemo(
    () => sanitizeSelection(lastSessionSnapshotRef.current),
    [projectOptions]
  )
  const charactersRef = useRef(0)
  const autoSaveTimer = useRef<number | undefined>(undefined)
  const autoSaveTargetRef = useRef<string | null>(null)
  const hasSyncedOpenProjects = useRef(false)
  const isRestoring = useRef(false)
  const docCacheRef = useRef<Map<string, { doc: PMNode; fromDraft: boolean; updatedAt: number }>>(new Map())

  const readDrafts = () => {
    try {
      const raw = localStorage.getItem("drafts")
      if (!raw) return {} as Record<string, string>
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object") return {} as Record<string, string>
      return parsed as Record<string, string>
    } catch {
      return {} as Record<string, string>
    }
  }

  const cacheDoc = (path: string, doc: PMNode, fromDraft: boolean) => {
    if (!path || !doc) return
    docCacheRef.current.set(path, { doc, fromDraft, updatedAt: Date.now() })
  }

  const applyDocToEditor = (doc: PMNode, path: string, fromDraft: boolean) => {
    const activePath = currentPathRef.current || sessionStorage.getItem("path") || currentPath
    if (path !== activePath) return
    const v = getView()
    if (!v) return

    isRestoring.current = true
    const tr = v.state.tr.replaceWith(0, v.state.doc.content.size, doc.content).setMeta("addToHistory", false)
    v.dispatch(tr)
    setTimeout(() => { isRestoring.current = false }, 0)

    const text = extractDocText(doc)
    setCharacters(text.replace(/\n/g, "").length)
    setWords(countWords(text))
    setSaved(!fromDraft)
    setUnsavedPaths(prev => {
      const next = new Set(prev)
      if (fromDraft) next.add(path)
      else next.delete(path)
      return next
    })

    cacheDoc(path, doc, fromDraft)
  }

  const persistDraft = (targetPath?: string) => {
    const path = targetPath || currentPathRef.current || sessionStorage.getItem("path") || currentPath
    if (!path) return
    if (isSaved && !unsavedPaths.has(path)) return
    const v = getView()
    if (!v) return
    const html = serializeHTML()
    const drafts = readDrafts()
    drafts[path] = html
    localStorage.setItem("drafts", JSON.stringify(drafts))
    setUnsavedPaths(prev => {
      const next = new Set(prev)
      next.add(path)
      return next
    })
  }

  const clearDraft = (path: string) => {
    const drafts = readDrafts()
    if (drafts[path]) {
      delete drafts[path]
      localStorage.setItem("drafts", JSON.stringify(drafts))
    }
    setUnsavedPaths(prev => {
      const next = new Set(prev)
      next.delete(path)
      return next
    })
  }

  const getIntervalMs = () => {
    const raw = localStorage.getItem("autoSaveInterval")
    const n = raw ? parseInt(raw, 10) : 2
    const safe = Number.isFinite(n) ? n : 2
    return Math.max(1, safe) * 1000
  }

  const cancelAutoSaveTimer = () => {
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = undefined
    }
    autoSaveTargetRef.current = null
  }

  const isAutoSaveEnabled = () => {
    const v = localStorage.getItem("autoSave")
    if (v === null) return true
    return v === "true"
  }

  const readOpenProjects = (): OpenProject[] => {
    try {
      const raw = sessionStorage.getItem("openProjects")
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter(p => typeof p?.name === "string" && typeof p?.path === "string")
        .map(p => ({ name: p.name, path: p.path } as OpenProject))
    } catch {
      return []
    }
  }

  const rememberProject = (path: string, name: string) => {
    if (!path) return
    const existing = readOpenProjects()
    const hasProject = existing.some(p => p.path === path)
    const next = hasProject
      ? existing.map(p => (p.path === path ? { path, name } : p))
      : [...existing, { path, name }]

    sessionStorage.setItem("openProjects", JSON.stringify(next))
    setOpenProjects(next)
  }

  useEffect(() => {
    if (!hasSyncedOpenProjects.current && openProjects.length === 0) return
    hasSyncedOpenProjects.current = true
    sessionStorage.setItem("openProjects", JSON.stringify(openProjects))
    try {
      localStorage.setItem("openProjects:lastSession", JSON.stringify(openProjects))
    } catch {
      // ignore storage failures
    }
  }, [openProjects])

  useEffect(() => {
    openProjectsRef.current = openProjects
  }, [openProjects])

  useEffect(() => {
    currentPathRef.current = currentPath
  }, [currentPath])

  useEffect(() => {
    try {
      sessionStorage.setItem("unsavedPaths", JSON.stringify(Array.from(unsavedPaths)))
    } catch {
      // ignore storage failures
    }
    unsavedPathsRef.current = unsavedPaths
  }, [unsavedPaths])

  useEffect(() => {
    const onExternalOpen = (event: Event) => {
      const detail = (event as CustomEvent<{
        projects?: OpenProject[];
        activePath?: string;
        activeName?: string;
      }>).detail || {}

      const nextProjects = Array.isArray(detail.projects) ? detail.projects : readOpenProjects()
      const sanitized = sanitizeSelection(nextProjects)
      setOpenProjects(sanitized)

      const targetPath = detail.activePath || sessionStorage.getItem("path") || ""
      const targetName =
        detail.activeName ||
        sanitized.find(p => p.path === targetPath)?.name ||
        sessionStorage.getItem("projectName") ||
        "Untitled"

      if (targetPath && targetPath !== currentPathRef.current) {
        void switchProjectRef.current?.({ path: targetPath, name: targetName })
      }
    }

    window.addEventListener("rosepad:open-projects-changed", onExternalOpen)
    return () => window.removeEventListener("rosepad:open-projects-changed", onExternalOpen)
  }, [sanitizeSelection])

  const scheduleAutoSave = () => {
    cancelAutoSaveTimer()
    if (!isAutoSaveEnabled()) return
    const targetPath = currentPathRef.current || sessionStorage.getItem("path") || currentPath
    if (!targetPath) return
    autoSaveTargetRef.current = targetPath

    const delay = getIntervalMs()
    autoSaveTimer.current = window.setTimeout(() => {
      autoSaveTimer.current = undefined
      const path = autoSaveTargetRef.current
      autoSaveTargetRef.current = null
      if (!path) return
      // If user has switched tabs, skip this save to avoid writing the wrong doc to a new path
      const activePath = currentPathRef.current || sessionStorage.getItem("path") || currentPath
      if (path !== activePath) return
      const name =
        openProjectsRef.current.find(p => p.path === path)?.name ||
        sessionStorage.getItem("projectName") ||
        sessionStorage.getItem("name") ||
        "Untitled"
      void saveNow({ path, name })
    }, delay)
  }

  const serializeHTML = () => {
    const v = getView()
    if (!v) return ""
    const frag = DOMSerializer.fromSchema(v.state.schema).serializeFragment(v.state.doc.content)
    const div = document.createElement("div")
    div.appendChild(frag)
    return div.innerHTML
  }

  const saveNow = async (target?: { path?: string; name?: string }) => {
    const v = getView()
    if (!v) return
    const path =
      target?.path ||
      currentPathRef.current ||
      sessionStorage.getItem("path") ||
      ""
    if (!path) return
    const title =
      target?.name ||
      openProjectsRef.current.find(p => p.path === path)?.name ||
      sessionStorage.getItem("projectName") ||
      sessionStorage.getItem("name") ||
      "Untitled"

    const ext = extOf(path)
    if (ext === "txt") {
      const payload = v.state.doc.textContent
      await invoke("write_text_atomic", { path, contents: payload })
    } else if (ext === "rpad") {
      const html = serializeHTML()
      await invoke("write_rpad_html", { path, html, title })
    } else {
      // fallback: write plain text
      const payload = v.state.doc.textContent
      await invoke("write_text_atomic", { path, contents: payload })
    }

    setSaved(true)
    sessionStorage.setItem("fileStatus", "Saved")
    clearDraft(path)
    setUnsavedPaths(prev => {
      const next = new Set(prev)
      next.delete(path)
      return next
    })
    cacheDoc(path, v.state.doc, false)
  }

  const saveAllUnsaved = async () => {
    cancelAutoSaveTimer()
    const targets = Array.from(unsavedPathsRef.current)
    if (!targets.length) return
    const tasks = targets.map(async (path) => {
      const name =
        openProjectsRef.current.find(p => p.path === path)?.name ||
        sessionStorage.getItem("projectName") ||
        sessionStorage.getItem("name") ||
        "Untitled"
      try {
        await saveNow({ path, name })
      } catch (err) {
        console.error("Failed to save on exit for", path, err)
      }
    })
    await Promise.all(tasks)
  }

  useEffect(() => {
    return () => {
      cancelAutoSaveTimer()
    }
  }, [])

  useEffect(() => {
    const off = onDocChange(() => {
      if (isRestoring.current) {
        isRestoring.current = false
        return
      }
      const v = getView()
      if (!v) return
      setSaved(false)
      const path = currentPathRef.current || sessionStorage.getItem("path") || currentPath
      if (path) {
        setUnsavedPaths(prev => {
          const next = new Set(prev)
          next.add(path)
          return next
        })
        cacheDoc(path, v.state.doc, true)
      }
      const text = extractDocText(v.state.doc)
      setCharacters(text.replace(/\n/g, "").length)
      setWords(countWords(text))
      scheduleAutoSave()
    })
    return off
  }, [])

  const handleSaving = async () => {
    try {
      await saveNow()
      pushToast({ message: "Saved", kind: "success" })
    } catch (err) {
      pushToast({ message: `Save failed: ${err}`, kind: "error" })
    }
  }

  useEffect(() => {
    const onSaveShortcut = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key.toLowerCase() !== "s") return
      e.preventDefault()
      void saveNow()
    }
    window.addEventListener("keydown", onSaveShortcut)
    return () => window.removeEventListener("keydown", onSaveShortcut)
  }, [])

  const handleSavingAs = async () => {
    const oldPath = sessionStorage.getItem("path") || ""
    const suggested = oldPath || sessionStorage.getItem("projectName") || "Untitled.rpad"
    const newPath = await save({
      defaultPath: suggested,
      filters: [
        { name: "RosePad Files", extensions: ["rpad", "txt"] },
        { name: "RosePad Project", extensions: ["rpad"] },
        { name: "Supported Files", extensions: ["txt"] }
      ]
    })
    if (!newPath) return

    const v = getView()
    if (!v) return

    const nameFromPath = (p: string) => {
      const parts = p.split(/[\\/]/)
      return parts[parts.length - 1]
    }

    const isRpad = /\.rpad$/i.test(newPath)
    const payload = isRpad ? serializeHTML() : v.state.doc.textContent

    sessionStorage.setItem("path", newPath)
    sessionStorage.setItem("projectName", nameFromPath(newPath))
    window.dispatchEvent(new Event("storage"))

    try {
      if (isRpad) {
        const title = sessionStorage.getItem("projectName") || "Untitled"
        await invoke("write_rpad_html", { path: newPath, html: payload, title })
      } else {
        await invoke("write_text_atomic", { path: newPath, contents: payload })
      }
      pushToast({ message: `Saved to ${newPath}`, kind: "success" })
    } catch (err) {
      pushToast({ message: `Save as failed: ${err}`, kind: "error" })
      throw err
    }

    setCurrentPath(newPath)
    rememberProject(newPath, nameFromPath(newPath))
    setSaved(true)
    cacheDoc(newPath, v.state.doc, false)
  }

  const loadProject = async (pathOverride?: string) => {
    const requestId = ++loadRequestIdRef.current
    const path = pathOverride || sessionStorage.getItem("path")
    if (!path) return
    cancelAutoSaveTimer()
    currentPathRef.current = path
    setCurrentPath(path)
    const cached = docCacheRef.current.get(path)
    if (cached?.doc && Date.now() - cached.updatedAt <= DOC_CACHE_TTL_MS) {
      const activePath = currentPathRef.current || sessionStorage.getItem("path") || currentPath
      if (path !== activePath) return
      if (requestId !== loadRequestIdRef.current) return
      applyDocToEditor(cached.doc, path, cached.fromDraft)
      return
    } else if (cached) {
      docCacheRef.current.delete(path)
    }

    setIsLoadingDoc(true)
    try {
      const drafts = readDrafts()
      const draft = drafts[path]
      const content = draft ?? await loadCurrentFile(path)

      const looksHtml = !!draft || /\.rpad$/i.test(path) || /<\/?[a-z][\s\S]*>/i.test(content.trim())
      const html = looksHtml ? content : `<p>${escapeHtml(content)}</p>`

      const dom = new window.DOMParser().parseFromString(html, "text/html")
      const pmDoc = PMDOMParser.fromSchema(rSchema).parse(dom.body)

      const activePath = currentPathRef.current || sessionStorage.getItem("path") || currentPath
      if (path !== activePath) return
      if (requestId !== loadRequestIdRef.current) return
      applyDocToEditor(pmDoc, path, !!draft)
      const name =
        sessionStorage.getItem("projectName") ||
        sessionStorage.getItem("name") ||
        "Untitled"
      rememberProject(path, name)
    } finally {
      setIsLoadingDoc(false)
    }
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => loadProject())
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    ;(async () => {
      try {
        const win = getCurrentWindow()
        unlisten = await win.onCloseRequested(async (event) => {
          if (!unsavedPathsRef.current.size) return
          event.preventDefault()
          await saveAllUnsaved()
          await win.close()
        })
      } catch (err) {
        console.error("Failed to register close handler", err)
      }
    })()
    return () => {
      unlisten?.()
    }
  }, [])

  useEffect(() => {
    const trimCache = () => {
      const now = Date.now()
      docCacheRef.current.forEach((value, key) => {
        if (now - value.updatedAt > DOC_CACHE_TTL_MS) {
          docCacheRef.current.delete(key)
        }
      })
    }
    const id = window.setInterval(trimCache, DOC_CACHE_TTL_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const path = sessionStorage.getItem("path") || ""
    const name =
      sessionStorage.getItem("projectName") ||
      sessionStorage.getItem("name") ||
      "Untitled"
    if (path) rememberProject(path, name)
    setCurrentPath(path)
  }, [])

  useEffect(() => {
    let unlisten: UnlistenFn | undefined

    listen("open-changelog", () => {
      sessionStorage.setItem("openChangelogRequested", "true")
      navigator("/")
    }).then((fn) => {
      unlisten = fn
    }).catch((err) => {
      console.error("Failed to bind changelog listener", err)
    })

    return () => {
      unlisten?.()
    }
  }, [navigator])

  useEffect(() => {
    charactersRef.current = characters
  }, [characters])

  useEffect(() => {
    const refreshRpc = () => {
      const path = sessionStorage.getItem("path")
      if (!path) return
      const name =
        sessionStorage.getItem("projectName") ||
        sessionStorage.getItem("name") ||
        "Untitled"
      localStorage.setItem("activePage", "editor")
      rpc_project(name, path, charactersRef.current)
    }
    refreshRpc()
    window.addEventListener("focus", refreshRpc)
    return () => window.removeEventListener("focus", refreshRpc)
  }, [])

  useEffect(() => {
    const path = sessionStorage.getItem("path")
    if (!path) return
    const name =
      sessionStorage.getItem("projectName") ||
      sessionStorage.getItem("name") ||
      "Untitled"
    rpc_project(name, path, characters)
  }, [characters])

  const applyProjectSelection = async (projects: OpenProject[]) => {
    const activePath = currentPathRef.current || sessionStorage.getItem("path") || ""
    const activeName =
      openProjectsRef.current.find(p => p.path === activePath)?.name ||
      sessionStorage.getItem("projectName") ||
      sessionStorage.getItem("name") ||
      "Untitled"
    cancelAutoSaveTimer()
    if (isAutoSaveEnabled()) {
      await saveNow({ path: activePath, name: activeName })
    } else {
      persistDraft(activePath)
    }
    sessionStorage.setItem("openProjects", JSON.stringify(projects))
    hasSyncedOpenProjects.current = true
    setOpenProjects(projects)
    setUnsavedPaths(prev => {
      const allowed = new Set(projects.map(p => p.path))
      const next = new Set<string>()
      prev.forEach(p => { if (allowed.has(p)) next.add(p) })
      return next
    })
    const allowedPaths = new Set(projects.map(p => p.path))
    docCacheRef.current.forEach((_, key) => {
      if (!allowedPaths.has(key)) docCacheRef.current.delete(key)
    })

    if (projects.length === 0) {
      currentPathRef.current = ""
      docCacheRef.current.clear()
      setCurrentPath("")
      sessionStorage.removeItem("path")
      sessionStorage.removeItem("projectName")
      sessionStorage.removeItem("name")
      window.dispatchEvent(new Event("storage"))
      navigator("/")
      return
    }

    const staysOnCurrent = projects.some(p => p.path === currentPath)
    const nextActive = staysOnCurrent
      ? projects.find(p => p.path === currentPath) || projects[0]
      : projects[0]

    sessionStorage.setItem("path", nextActive.path)
    sessionStorage.setItem("projectName", nextActive.name)
    sessionStorage.setItem("name", nextActive.name)
    window.dispatchEvent(new Event("storage"))
    currentPathRef.current = nextActive.path
    setCurrentPath(nextActive.path)

    if (!staysOnCurrent) {
      await loadProject(nextActive.path)
    }
  }

  const switchProject = async (project: OpenProject) => {
    if (isSwitchingRef.current) {
      pendingSwitchRef.current = project
      return
    }
    if (!project.path) return
    if (project.path === currentPath) return
    isSwitchingRef.current = true
    const prevPath = currentPathRef.current || sessionStorage.getItem("path") || ""
    const prevName =
      openProjectsRef.current.find(p => p.path === prevPath)?.name ||
      sessionStorage.getItem("projectName") ||
      sessionStorage.getItem("name") ||
      "Untitled"
    cancelAutoSaveTimer()
    if (prevPath) {
      if (isAutoSaveEnabled()) {
        await saveNow({ path: prevPath, name: prevName })
      } else {
        persistDraft(prevPath)
      }
    }
    sessionStorage.setItem("path", project.path)
    sessionStorage.setItem("projectName", project.name)
    sessionStorage.setItem("name", project.name)
    window.dispatchEvent(new Event("storage"))
    currentPathRef.current = project.path
    setCurrentPath(project.path)
    try {
      await loadProject(project.path)
      rememberProject(project.path, project.name)
    } finally {
      isSwitchingRef.current = false
      const pending = pendingSwitchRef.current
      pendingSwitchRef.current = null
      if (pending && pending.path !== currentPathRef.current) {
        void switchProject(pending)
      }
    }
  }
  switchProjectRef.current = switchProject

  useEffect(() => {
    const isFormField = (el: EventTarget | null) => {
      if (!el || !(el as HTMLElement).closest) return false
      return !!(el as HTMLElement).closest("input, textarea, select")
    }

    const handleTabHotkeys = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (!e.altKey || e.metaKey || e.ctrlKey) return
      if (isPickerOpen) return
      if (isFormField(e.target)) return

      const projects = openProjectsRef.current
      if (!projects.length) return

      if (/^[1-9]$/.test(e.key)) {
        const index = parseInt(e.key, 10) - 1
        if (index < projects.length) {
          e.preventDefault()
          const targetProject = projects[index]
          void switchProjectRef.current?.(targetProject)
        }
        return
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const activeIndex = projects.findIndex(p => p.path === currentPathRef.current)
        const startIndex = activeIndex === -1 ? 0 : activeIndex
        const delta = e.key === "ArrowDown" ? 1 : -1
        const nextIndex = (startIndex + delta + projects.length) % projects.length
        const nextProject = projects[nextIndex]
        if (nextProject) {
          e.preventDefault()
          void switchProjectRef.current?.(nextProject)
        }
      }
    }

    window.addEventListener("keydown", handleTabHotkeys)
    return () => window.removeEventListener("keydown", handleTabHotkeys)
  }, [isPickerOpen])

  const openPicker = () => {
    const currentSelection = sanitizeSelection(openProjects)
    const lastSelection = sanitizedLastSession
    let nextInitial = currentSelection

    if (!pickerHasOpenedRef.current) {
      pickerHasOpenedRef.current = true
      sessionStorage.setItem("projectPicker:openedOnce", "true")
      if (!currentSelection.length && lastSelection.length) {
        nextInitial = lastSelection
      }
    }

    setPickerInitialSelection(nextInitial)
    setPickerOpen(true)
  }

  return (
    <main>
      <NavBar
        isSaved={isSaved}
        onBack={() => navigator('/')}
        onSave={handleSaving}
        onSaveAs={handleSavingAs}
        characters={characters}
        words={words}
      />
      <div className={style.main}>
        <div className={style.sidebar}>
          <EditorTabs
            openProjects={openProjects}
            currentPath={currentPath}
            onSwitch={switchProject}
            onAdd={openPicker}
          />
        </div>
        <div className={style.container}>
          {isLoadingDoc ? (
            <div className={style.loadingOverlay} aria-live="polite">
              <span>Loading...</span>
            </div>
          ) : null}
          <EditorPanel/>
          <StyleMenu/>
        </div>
      </div>
      <ProjectPickerModal
        isOpen={isPickerOpen}
        projects={projectOptions}
        initialSelection={pickerInitialSelection}
        lastSession={sanitizedLastSession}
        onApply={async selection => {
          await applyProjectSelection(selection)
          setPickerOpen(false)
        }}
        onClose={() => setPickerOpen(false)}
      />
    </main>
  )
}
