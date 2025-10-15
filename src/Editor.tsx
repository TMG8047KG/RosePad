import NavBar from "./components/nav"
import './styles/Main.css'
import style from './styles/Editor.module.css'

import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { save } from "@tauri-apps/plugin-dialog"
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs"
import { type } from "@tauri-apps/plugin-os"
import { invoke } from "@tauri-apps/api/core"

import EditorPanel from "./core/editor/rPanel"
import StyleMenu from "./components/stylesMenu"
import { getView, onDocChange } from "./core/editor/editorBridge"
import { DOMSerializer, DOMParser as PMDOMParser } from "prosemirror-model"
import { rSchema } from "./core/editor/rSchema"

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let t: number | undefined
  return ((...args: any[]) => {
    if (t) clearTimeout(t)
    t = window.setTimeout(() => fn(...args), delay)
  }) as T
}

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
  const [isSaved, setSaved] = useState(true)

  const getIntervalMs = () => {
    const raw = localStorage.getItem("autoSaveInterval")
    const n = raw ? parseInt(raw, 10) : 2
    return Math.max(1, n) * 1000
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

  const debouncedAutoSaveRef = useRef<() => void>(() => {})
  useEffect(() => {
    debouncedAutoSaveRef.current = debounce(saveNow, getIntervalMs())
  }, [])

  useEffect(() => {
    const off = onDocChange(() => {
      const v = getView()
      if (!v) return
      setSaved(false)
      setCharacters(v.state.doc.textContent.replace(/\n/g, "").length)
      debouncedAutoSaveRef.current()
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

    setSaved(true)
  }

  const loadProject = async () => {
    const path = sessionStorage.getItem("path")
    if (!path) return
    const content = await loadCurrentFile(path)
    const v = getView()
    if (!v) return

    const looksHtml = /\.rpad$/i.test(path) || /<\/?[a-z][\s\S]*>/i.test(content.trim())
    const html = looksHtml ? content : `<p>${escapeHtml(content)}</p>`

    const dom = new window.DOMParser().parseFromString(html, "text/html")
    const pmDoc = PMDOMParser.fromSchema(rSchema).parse(dom.body)

    const tr = v.state.tr.replaceWith(0, v.state.doc.content.size, pmDoc.content).setMeta("addToHistory", false)
    v.dispatch(tr)

    setCharacters(v.state.doc.textContent.replace(/\n/g, "").length)
    setSaved(true)
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => loadProject())
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <main>
      {!["android","ios"].includes(type()) ? <NavBar isSaved={isSaved}/> : ""}
      <div className={style.main}>
        <div className={style.sidebar}>
          <button className={style.button} onClick={() => navigator('/')}>Back</button>
          <button className={style.button} onClick={() => handleSaving()}>Save</button>
          <button className={style.button} onClick={() => handleSavingAs()}>Save as</button>
          <div id="characters" className={style.textData}>Symbols<br/>{characters}</div>
        </div>
        <div className={style.container}>
          <EditorPanel/>
          <StyleMenu/>
        </div>
      </div>
    </main>
  )
}
