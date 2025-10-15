import { Command } from "prosemirror-state";

export const setHighlightColor= (color: string): Command => (state, dispatch) => {
  const highlightColor = state.schema.marks.highlight;
  if (!highlightColor) return false;

  const { from, to, empty } = state.selection;

  if (empty) {
    let tr = state.tr.removeStoredMark(highlightColor);
    tr = tr.addStoredMark(highlightColor.create({ color }));
    if (dispatch) dispatch(tr);
    return true;
  }

  let tr = state.tr.removeMark(from, to, highlightColor);
  tr = tr.addMark(from, to, highlightColor.create({ color }));
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
};
