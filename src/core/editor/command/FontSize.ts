import { Command, EditorState } from "prosemirror-state";

export const setFontSize = (size: number): Command => (state, dispatch) => {
  const mark = state.schema.marks.fontSize;
  if (!mark) return false;

  const { from, to, empty, $from } = state.selection as any;
  const sizeAttr = { size: `${size}pt` };

  if (empty) {
    const base = state.storedMarks || $from.marks();
    const next = base.filter((m: any) => m.type !== mark).concat(mark.create(sizeAttr));
    if (dispatch) dispatch(state.tr.setStoredMarks(next));
    return true;
  }

  let tr = state.tr.removeMark(from, to, mark);
  tr = tr.addMark(from, to, mark.create(sizeAttr));
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
};

export const DEFAULT_FONT_PT = 12;

const pickMark = (marks: readonly any[], type: any) =>
  marks.find(m => m.type === type) || null;

const readSize = (mark: any) => {
  if (!mark) return null;
  const v = mark.attrs?.size;
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.endsWith("pt")) {
    const n = Number(v.slice(0, -2));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const getActiveFontSize = (state: EditorState, fallback = DEFAULT_FONT_PT): number => {
  const type = state.schema.marks.fontSize;
  if (!type) return fallback;

  const sel: any = state.selection;
  const stored = state.storedMarks;
  if (stored && stored.length) {
    const m = pickMark(stored, type);
    return readSize(m) ?? fallback;
  }

  if (sel.empty) {
    const m = pickMark(sel.$from.marks(), type);
    return readSize(m) ?? fallback;
  }

  let found: number | null = null;
  state.doc.nodesBetween(sel.from, sel.to, node => {
    if (found != null) return false;
    const m = pickMark(node.marks, type);
    const val = readSize(m);
    if (val != null) found = val;
    return true;
  });

  return found ?? fallback;
};