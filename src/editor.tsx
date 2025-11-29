import NavBar from "./components/nav"
import './styles/Main.css'
import style from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { save } from "@tauri-apps/plugin-dialog"
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs"
import { type } from "@tauri-apps/plugin-os"
import { invoke } from "@tauri-apps/api/core"
import { rpc_project } from "./core/discord_rpc"

import EditorPanel from "./core/editor/rPanel"
import StyleMenu from "./components/editor/stylesMenu"
import EditorTabs, { type OpenProject } from "./components/editor/editorTabs"
import { getView, onDocChange } from "./core/editor/editorBridge"
import { DOMSerializer, DOMParser as PMDOMParser } from "prosemirror-model"
import { rSchema } from "./core/editor/rSchema"

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
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
  const [characters, setCharacters] = useState(0)
  const [words, setWords] = useState(0)
  const [isSaved, setSaved] = useState(true)
  const [openProjects, setOpenProjects] = useState<OpenProject[]>(() => {
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
  })
  const [currentPath, setCurrentPath] = useState(sessionStorage.getItem("path") || "")
  const charactersRef = useRef(0)
  const autoSaveTimer = useRef<number | undefined>(undefined)

  const getIntervalMs = () => {
    const raw = localStorage.getItem("autoSaveInterval")
    const n = raw ? parseInt(raw, 10) : 2
    const safe = Number.isFinite(n) ? n : 2
    return Math.max(1, safe) * 1000
  }

  const isAutoSaveEnabled = () => localStorage.getItem("autoSave") === "true"

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
    let next = hasProject
      ? existing.map(p => (p.path === path ? { path, name } : p))
      : [...existing, { path, name }]

    if (next.length > 8) {
      next = next.slice(-8)
    }

    sessionStorage.setItem("openProjects", JSON.stringify(next))
    setOpenProjects(next)
  }

  const scheduleAutoSave = () => {
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current)
    if (!isAutoSaveEnabled()) return

    const delay = getIntervalMs()
    autoSaveTimer.current = window.setTimeout(() => {
      autoSaveTimer.current = undefined
      void saveNow()
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

  const saveNow = async () => {
    const v = getView()
    if (!v) return
    const path = sessionStorage.getItem("path") || ""
    if (!path) return

    const ext = extOf(path)
    if (ext === "txt") {
      const payload = v.state.doc.textContent
      await writeTextFile(path, payload)
    } else if (ext === "rpad") {
      const html = serializeHTML()
      const title = sessionStorage.getItem("projectName") || "Untitled"
      await invoke("write_rpad_html", { path, html, title })
    } else {
      // fallback: write plain text
      const payload = v.state.doc.textContent
      await writeTextFile(path, payload)
    }

    setSaved(true)
    sessionStorage.setItem("fileStatus", "Saved")
  }

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current)
    }
  }, [])

  useEffect(() => {
    const off = onDocChange(() => {
      const v = getView()
      if (!v) return
      setSaved(false)
      const text = v.state.doc.textContent
      setCharacters(text.replace(/\n/g, "").length)
      setWords(text.trim() ? text.trim().split(/\s+/).length : 0)
      scheduleAutoSave()
    })
    return off
  }, [])

  const handleSaving = async () => {
    await saveNow()
  }

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

    if (isRpad) {
      const title = sessionStorage.getItem("projectName") || "Untitled"
      await invoke("write_rpad_html", { path: newPath, html: payload, title })
    } else {
      await writeTextFile(newPath, payload)
    }

    setCurrentPath(newPath)
    rememberProject(newPath, nameFromPath(newPath))
    setSaved(true)
  }

  const loadProject = async (pathOverride?: string) => {
    const path = pathOverride || sessionStorage.getItem("path")
    if (!path) return
    setCurrentPath(path)
    const content = await loadCurrentFile(path)
    const v = getView()
    if (!v) return

    const looksHtml = /\.rpad$/i.test(path) || /<\/?[a-z][\s\S]*>/i.test(content.trim())
    const html = looksHtml ? content : `<p>${escapeHtml(content)}</p>`

    const dom = new window.DOMParser().parseFromString(html, "text/html")
    const pmDoc = PMDOMParser.fromSchema(rSchema).parse(dom.body)

    const tr = v.state.tr.replaceWith(0, v.state.doc.content.size, pmDoc.content).setMeta("addToHistory", false)
    v.dispatch(tr)

    const text = v.state.doc.textContent
    setCharacters(text.replace(/\n/g, "").length)
    setWords(text.trim() ? text.trim().split(/\s+/).length : 0)
    setSaved(true)
    const name =
      sessionStorage.getItem("projectName") ||
      sessionStorage.getItem("name") ||
      "Untitled"
    rememberProject(path, name)
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => loadProject())
    return () => cancelAnimationFrame(id)
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

  const switchProject = async (project: OpenProject) => {
    if (!project.path) return
    if (project.path === currentPath) return
    sessionStorage.setItem("path", project.path)
    sessionStorage.setItem("projectName", project.name)
    sessionStorage.setItem("name", project.name)
    window.dispatchEvent(new Event("storage"))
    setCurrentPath(project.path)
    await loadProject(project.path)
    rememberProject(project.path, project.name)
  }

  return (
    <main>
      {!["android","ios"].includes(type()) ? (
        <NavBar
          isSaved={isSaved}
          onBack={() => navigator('/')}
          onSave={handleSaving}
          onSaveAs={handleSavingAs}
          characters={characters}
          words={words}
        />
      ) : ""}
      <div className={style.main}>
        <div className={style.sidebar}>
          <EditorTabs
            openProjects={openProjects}
            currentPath={currentPath}
            onSwitch={switchProject}
          />
        </div>
        <div className={style.container}>
          <EditorPanel/>
          <StyleMenu/>
        </div>
      </div>
    </main>
  )
}
