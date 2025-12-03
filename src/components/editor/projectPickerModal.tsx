import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import overlayStyle from "../../styles/components/modal.module.css"
import style from "../../styles/components/editor/projectPicker.module.css"
import type { OpenProject } from "./editorTabs"

const DEFAULT_ROWS = 8
const MIN_ROWS = 2
const MAX_ROWS = 6
const ROW_HEIGHT = 30
const ROW_GAP = 4
const BASE_WINDOW_HEIGHT = 600

export type ProjectOption = { id?: string; name: string; path: string; lastModifiedMs?: number }

type ProjectPickerModalProps = {
  isOpen: boolean
  projects: ProjectOption[]
  initialSelection: OpenProject[]
  lastSession: OpenProject[]
  onApply: (projects: OpenProject[]) => void
  onClose: () => void
}

export default function ProjectPickerModal({
  isOpen,
  projects,
  initialSelection,
  lastSession,
  onApply,
  onClose
}: ProjectPickerModalProps) {
  const [selectedList, setSelectedList] = useState<OpenProject[]>(() => [...initialSelection])
  const [rows, setRows] = useState<number>(DEFAULT_ROWS)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const draggingIndexRef = useRef<number | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const moveListenerRef = useRef<((e: PointerEvent) => void) | null>(null)
  const upListenerRef = useRef<(() => void) | null>(null)
  const positionsRef = useRef<Map<string, DOMRect>>(new Map())
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (!isOpen) return
    setSelectedList([...initialSelection])
  }, [initialSelection, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aTime = a.lastModifiedMs ?? 0
      const bTime = b.lastModifiedMs ?? 0
      if (aTime !== bTime) return bTime - aTime
      return a.name.localeCompare(b.name)
    })
  }, [projects])

  const selectedPaths = useMemo(() => new Set(selectedList.map(p => p.path)), [selectedList])
  const unselectedProjects = useMemo(
    () => sortedProjects.filter(p => !selectedPaths.has(p.path)),
    [sortedProjects, selectedPaths]
  )

  const hasLastSession = useMemo(() => {
    if (!lastSession.length) return false
    const set = new Set(lastSession.map(p => p.path))
    return sortedProjects.some(p => set.has(p.path))
  }, [lastSession, sortedProjects])

  const capturePositions = () => {
    const map = new Map<string, DOMRect>()
    selectedList.forEach(p => {
      const el = itemRefs.current.get(p.path)
      if (el) map.set(p.path, el.getBoundingClientRect())
    })
    positionsRef.current = map
  }

  const toggle = (path: string) => {
    capturePositions()
    setSelectedList(prev => {
      const exists = prev.find(p => p.path === path)
      if (exists) {
        return prev.filter(p => p.path !== path)
      }
      const toAdd = sortedProjects.find(p => p.path === path)
      if (!toAdd) return prev
      return [...prev, { name: toAdd.name, path: toAdd.path }]
    })
  }

  const selectAll = () => {
    capturePositions()
    setSelectedList(sortedProjects.map(p => ({ name: p.name, path: p.path })))
  }
  const selectNone = () => {
    capturePositions()
    setSelectedList([])
  }
  const selectLastSession = () => {
    capturePositions()
    const last = new Set(lastSession.map(p => p.path))
    const filtered = sortedProjects.filter(p => last.has(p.path))
    setSelectedList(filtered.map(p => ({ name: p.name, path: p.path })))
  }

  const apply = () => {
    onApply(selectedList)
  }

  const overlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const moveItem = (from: number, to: number) => {
    capturePositions()
    setSelectedList(prev => {
      if (from < 0 || from >= prev.length) return prev
      const clamped = Math.max(0, Math.min(to, prev.length - 1))
      if (from === clamped) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(clamped, 0, item)
      return next
    })
  }

  const stopPointerListeners = () => {
    if (moveListenerRef.current) {
      window.removeEventListener("pointermove", moveListenerRef.current)
      moveListenerRef.current = null
    }
    if (upListenerRef.current) {
      window.removeEventListener("pointerup", upListenerRef.current)
      upListenerRef.current = null
    }
  }

  const handlePointerUp = () => {
    stopPointerListeners()
    setDraggingIndex(null)
    draggingIndexRef.current = null
  }

  const handlePointerMove = (e: PointerEvent) => {
    const from = draggingIndexRef.current
    if (from === null) return
    const container = listRef.current
    if (!container) return
    const items = Array.from(container.querySelectorAll("[data-index]")) as HTMLDivElement[]
    if (!items.length) return

    const mouseY = e.clientY
    let target = items.length
    for (const item of items) {
      const idx = Number(item.dataset.index)
      if (Number.isNaN(idx)) continue
      const rect = item.getBoundingClientRect()
      if (mouseY < rect.top + rect.height / 2) {
        target = idx
        break
      }
    }

    const to = target > from ? target - 1 : target
    if (to === from) return
    moveItem(from, to)
    draggingIndexRef.current = to
    setDraggingIndex(to)
  }

  const handlePointerDown = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest("input")) return
    e.preventDefault()
    draggingIndexRef.current = index
    setDraggingIndex(index)

    const move = (ev: PointerEvent) => handlePointerMove(ev)
    const up = () => handlePointerUp()
    moveListenerRef.current = move
    upListenerRef.current = up
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  useEffect(() => stopPointerListeners, [])

  useLayoutEffect(() => {
    const prev = positionsRef.current
    if (!prev.size) return
    requestAnimationFrame(() => {
      selectedList.forEach(p => {
        const el = itemRefs.current.get(p.path)
        if (!el) return
        const prevRect = prev.get(p.path)
        const nextRect = el.getBoundingClientRect()
        if (!prevRect) return
        const dx = prevRect.left - nextRect.left
        const dy = prevRect.top - nextRect.top
        if (dx === 0 && dy === 0) return
        el.style.transition = "none"
        el.style.transform = `translate(${dx}px, ${dy}px)`
        requestAnimationFrame(() => {
          el.style.transition = "transform 160ms ease"
          el.style.transform = ""
        })
      })
      positionsRef.current.clear()
    })
  }, [selectedList])

  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    const recalcRows = () => {
      const currentHeight = window.innerHeight || BASE_WINDOW_HEIGHT
      const rowSpace = ROW_HEIGHT + ROW_GAP
      const deltaRows = Math.floor((currentHeight - BASE_WINDOW_HEIGHT) / rowSpace)
      const next = Math.max(MIN_ROWS, Math.min(MAX_ROWS, DEFAULT_ROWS + deltaRows))
      setRows(prev => (prev === next ? prev : next))
    }

    recalcRows()
    window.addEventListener("resize", recalcRows)
    return () => window.removeEventListener("resize", recalcRows)
  }, [])

  const listSizingVars = useMemo<React.CSSProperties>(() => ({
    ["--rows" as string]: rows,
    ["--row-height" as string]: `${ROW_HEIGHT}px`,
    ["--row-gap" as string]: `${ROW_GAP}px`
  }), [rows])

  if (!isOpen) return null

  return createPortal(
    <div className={overlayStyle.modalOverlay} onClick={overlayClick}>
      <div className={style.modal} role="dialog" aria-modal="true" aria-label="Manage open projects">
        <div className={style.header}>
          <div>
            <p className={style.eyebrow}>Editor Tabs</p>
            <h2 className={style.title}>Choose projects to keep open</h2>
          </div>
        </div>

        <div className={style.filters}>
          <button className={style.filterButton} type="button" onClick={selectAll}>Select all</button>
          <button className={style.filterButton} type="button" onClick={selectNone}>Deselect all</button>
          <button className={style.filterButton} type="button" disabled={!hasLastSession} onClick={selectLastSession}>
            Select last session
          </button>
        </div>

        <div className={style.selectedArea}>
          <div className={style.selectedHeader}>
            <span>Selected order</span>
            <span className={style.count}>{selectedList.length}</span>
          </div>
          <div className={style.selectedList} ref={listRef} style={listSizingVars}>
            {selectedList.length === 0 ? (
              <div className={style.emptySelected}>You haven't selected anything!</div>
            ) : (
              selectedList.map((p, index) => (
                <div
                  key={p.path}
                  className={`${style.selectedItem} ${draggingIndex === index ? style.dragging : ""}`}
                  data-index={index}
                  ref={el => {
                    if (el) itemRefs.current.set(p.path, el)
                    else itemRefs.current.delete(p.path)
                  }}
                  onPointerDown={handlePointerDown(index)}
                >
                  <input
                    type="checkbox"
                    className={style.selectedCheckbox}
                    checked
                    onChange={() => toggle(p.path)}
                    aria-label={`Toggle ${p.name}`}
                    draggable={false}
                  />
                  <span className={style.selectedName}>{p.name}</span>
                  <input
                    type="number"
                    className={style.positionInput}
                    value={index + 1}
                    min={1}
                    max={selectedList.length}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10)
                      if (Number.isNaN(val)) return
                      moveItem(index, val - 1)
                    }}
                    draggable={false}
                  />
                  <svg className={style.dragHandle} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h14"/>
                  </svg>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={style.listbox}>
          <div className={style.list} role="listbox" aria-label="Projects" style={listSizingVars}>
            {unselectedProjects.length === 0 ? (
              <div className={style.empty}>No more projects to select... It's just an empty void.</div>
            ) : (
              unselectedProjects.map(p => (
                <label key={p.path} className={style.row}>
                  <input
                    type="checkbox"
                    checked={selectedPaths.has(p.path)}
                    onChange={() => toggle(p.path)}
                    className={style.checkbox}
                  />
                  <span className={style.name} title={p.name}>{p.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className={style.actions}>
          <button type="button" className={style.cancel} onClick={onClose}>Cancel</button>
          <button type="button" className={style.update} onClick={apply}>Update tabs</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
