import { Command } from "prosemirror-state";

export const setTextColor = (color: string): Command => (state, dispatch) => {
  const colorMark = state.schema.marks.textColor;
  if (!colorMark) return false;

  const { from, to, empty } = state.selection;

  if (empty) {
    let tr = state.tr.removeStoredMark(colorMark);
    tr = tr.addStoredMark(colorMark.create({ color }));
    if (dispatch) dispatch(tr);
    return true;
  }

  let tr = state.tr.removeMark(from, to, colorMark);
  tr = tr.addMark(from, to, colorMark.create({ color }));
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
};
