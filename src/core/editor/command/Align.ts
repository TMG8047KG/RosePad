import { EditorState } from "prosemirror-state";
import { Command } from "prosemirror-state";

export type Align = "left" | "center" | "right" | "justify";
export type AlignState = Align | "none" | "mixed";

const apply = (state: EditorState, value: Align | null) => {
  const { from, to } = state.selection;
  let tr = state.tr;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return;
    if (!("align" in (node.attrs || {}))) return;
    if (node.attrs.align === value) return;
    tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, align: value }, node.marks);
  });
  return tr;
};

export const setTextAlign = (value: Align): Command => (state, dispatch) => {
  const tr = apply(state, value);
  if (tr === state.tr) return false;
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
};

export const unsetTextAlign = (): Command => (state, dispatch) => {
  const tr = apply(state, null);
  if (tr === state.tr) return false;
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
};

export const getSelectionAlign = (state: EditorState): AlignState => {
  const { from, to } = state.selection;
  let seen: AlignState | null = null;
  state.doc.nodesBetween(from, to, node => {
    if (!node.isTextblock || !("align" in (node.attrs || {}))) return;
    const raw = node.attrs.align;
    const a: AlignState =
      raw === "left" || raw === "center" || raw === "right" || raw === "justify" ? raw : "none";
    if (seen === null) seen = a;
    else if (seen !== a) seen = "mixed";
  });
  return seen ?? "none";
};

export const toggleTextAlign = (value: Align): Command => (state, dispatch) => {
  const cur = getSelectionAlign(state);
  if (cur === value) return unsetTextAlign()(state, dispatch);
  return setTextAlign(value)(state, dispatch);
};
