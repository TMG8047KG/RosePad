import type { EditorView } from "prosemirror-view"

let view: EditorView | null = null
const docSubs = new Set<() => void>()

export function setView(v: EditorView | null) { view = v }
export function getView() { return view }

export function onDocChange(cb: () => void): () => void {
  docSubs.add(cb)
  return () => { docSubs.delete(cb) }
}

export function notifyDocChange() { docSubs.forEach(cb => cb()) }
