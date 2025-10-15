import { liftListItem, wrapInList } from "prosemirror-schema-list";
import { setBlockType } from "prosemirror-commands";

const isInList = (state: any, listType: any) => {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === listType) return { depth: d, pos: $from.before(d) };
  }
  return null;
};

const changeListType = (state: any, dispatch: any, fromListType: any, toListType: any) => {
  const found = isInList(state, fromListType);
  if (!found) return false;
  const tr = state.tr.setNodeMarkup(found.pos, toListType, null, toListType.defaultAttrs || undefined);
  if (dispatch) dispatch(tr.scrollIntoView());
  return true;
};

const normalizeToParagraph = (state: any, dispatch: any, paragraph: any) => {
  const { $from, $to } = state.selection;
  const range = $from.blockRange($to);
  if (!range) return false;
  // If the parent isn’t a paragraph, convert the blocks to paragraph so wrapping can succeed
  return setBlockType(paragraph)(state, dispatch);
};

export const toggleBulletList = (view: any) => {
  const { state, dispatch } = view;
  const n = state.schema.nodes;
  const inBullet = isInList(state, n.bullet_list);
  const inOrdered = isInList(state, n.ordered_list);

  if (inBullet) return liftListItem(n.list_item)(state, dispatch);
  if (inOrdered) return changeListType(state, dispatch, n.ordered_list, n.bullet_list);

  // not in any list: ensure we can wrap
  if (!wrapInList(n.bullet_list)(state, dispatch)) {
    if (normalizeToParagraph(state, dispatch, n.paragraph)) {
      return wrapInList(n.bullet_list)(state, dispatch);
    }
    return false;
  }
  return true;
};

export const toggleOrderedList = (view: any) => {
  const { state, dispatch } = view;
  const n = state.schema.nodes;
  const inOrdered = isInList(state, n.ordered_list);
  const inBullet = isInList(state, n.bullet_list);

  if (inOrdered) return liftListItem(n.list_item)(state, dispatch);
  if (inBullet) return changeListType(state, dispatch, n.bullet_list, n.ordered_list);

  if (!wrapInList(n.ordered_list)(state, dispatch)) {
    if (normalizeToParagraph(state, dispatch, n.paragraph)) {
      return wrapInList(n.ordered_list)(state, dispatch);
    }
    return false;
  }
  return true;
};
