import { chainCommands, createParagraphNear, deleteSelection, exitCode, joinBackward, joinForward, liftEmptyBlock, newlineInCode, selectNodeBackward, selectNodeForward, setBlockType, splitBlock, toggleMark } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { splitListItem, sinkListItem, liftListItem } from "prosemirror-schema-list";
import { rSchema } from "./rSchema";
import { AllSelection, TextSelection } from "prosemirror-state";
import { ResolvedPos, NodeType } from "prosemirror-model";

function codeBlockDepth($pos: ResolvedPos, type: NodeType) {
  for (let d = $pos.depth; d >= 0; d--) if ($pos.node(d).type === type) return d;
  return null;
}

export const keyBinding = () => {

    const deleteBack = chainCommands(deleteSelection, (state, dispatch) => {
            const { $from, empty } = state.selection;
            if (!empty) return false;
            if ($from.parent.type === rSchema.nodes.code_block && $from.parent.content.size === 0) {
                return setBlockType(rSchema.nodes.paragraph)(state, dispatch);
            }
            return false;
        }, (state, dispatch) => {
            const { $from, empty } = state.selection;
            if (!empty) return false;
            const atStart = $from.parentOffset === 0;
            const emptyPara = $from.parent.type === rSchema.nodes.paragraph && $from.parent.content.size === 0;
            let inLI = false;
            for (let d = $from.depth; d > 0; d--) if ($from.node(d).type === rSchema.nodes.list_item) inLI = true;
            if (inLI && atStart && emptyPara) {
                return liftListItem(rSchema.nodes.list_item)(state, dispatch);
            }
            return false;
        }, (state, dispatch) => {
            const { $from, empty } = state.selection;
            if (!empty) return false;
            const emptyParaAtStart =
                $from.parent.type === rSchema.nodes.paragraph &&
                $from.parent.content.size === 0 &&
                $from.parentOffset === 0;
            if (!emptyParaAtStart) return false;
            const parent = $from.node($from.depth - 1);
            const index = $from.index($from.depth - 1);
            if (index === 0) return false;
            const prevSibling = parent.child(index - 1);
            const isPrevList = prevSibling.type === rSchema.nodes.bullet_list || prevSibling.type === rSchema.nodes.ordered_list;
            if (!isPrevList) return false;
            if (!dispatch) return true;
            const from = $from.before();
            const to = $from.after();
            const tr = state.tr.delete(from, to);
            tr.setSelection(TextSelection.near(tr.doc.resolve(from), -1));
            dispatch(tr.scrollIntoView());
            return true;
        },
        joinBackward,
        selectNodeBackward
    );

    const deleteFront = chainCommands(deleteSelection, joinForward, selectNodeForward);

    return keymap({
        "Mod-b": toggleMark(rSchema.marks.strong),
        "Mod-i": toggleMark(rSchema.marks.em),
        "Mod-u": toggleMark(rSchema.marks.underline),
        "Mod-t": toggleMark(rSchema.marks.strike),
        "Mod-h": toggleMark(rSchema.marks.highlight),
        "Mod-`": toggleMark(rSchema.marks.code),
        "Mod-Shift-`": setBlockType(rSchema.nodes.code_block),
        "Mod-1": setBlockType(rSchema.nodes.heading, { level: 1 }),
        "Mod-2": setBlockType(rSchema.nodes.heading, { level: 2 }),
        "Mod-3": setBlockType(rSchema.nodes.heading, { level: 3 }),
        "Mod-4": setBlockType(rSchema.nodes.heading, { level: 4 }),
        "Mod-5": setBlockType(rSchema.nodes.heading, { level: 5 }),
        "Mod-6": setBlockType(rSchema.nodes.heading, { level: 6 }),
        "Mod-0": setBlockType(rSchema.nodes.paragraph),
        "Mod-z": undo,
        "Mod-y": redo,
        "Mod-[": liftListItem(rSchema.nodes.list_item),
        "Mod-]": sinkListItem(rSchema.nodes.list_item),
        "Mod-a": (state, dispatch) => {
            if (!rSchema.nodes.code_block) {
                if (dispatch) dispatch(state.tr.setSelection(new AllSelection(state.doc)));
                return true;
            }
            const $from = state.selection.$from;
            const $to = state.selection.$to;
            const df = codeBlockDepth($from, rSchema.nodes.code_block);
            const dt = codeBlockDepth($to, rSchema.nodes.code_block);
            if (df != null && df === dt) {
                const from = $from.start(df);
                const to = $from.end(df);
                if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
                return true;
            }
            if (dispatch) dispatch(state.tr.setSelection(new AllSelection(state.doc)));
            return true;
        },
        "Enter": chainCommands(splitListItem(rSchema.nodes.list_item), newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
        "Shift-Enter": (state, dispatch) => {
            const { $from, empty } = state.selection;
            if (!empty) return false;
            if (!$from.parent || $from.parent.type !== rSchema.nodes.code_block) return false;
            if ($from.parentOffset !== 0) return false;

            const depth = $from.depth;
            const insertPos = $from.before(depth);
            const p = rSchema.nodes.paragraph.createAndFill();
            if (!p) return false;

            let tr = state.tr.insert(insertPos, p);
            tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
            if (dispatch) dispatch(tr.scrollIntoView());
            return true;
        },
        "Mod-Enter": exitCode,
        "Backspace": deleteBack,
        "Mod-Backspace": deleteBack,
        "Delete": deleteFront,
        "Mod-Delete": deleteFront,
        "Tab": (state, dispatch) => {
            const li = state.schema.nodes.list_item;
            if (li && sinkListItem(li)(state, dispatch)) return true;
            if (dispatch) dispatch(state.tr.insertText("\t"));
            return true;
        },
        "Shift-Tab": (state, dispatch) => {
            const li = state.schema.nodes.list_item;
            if (li && liftListItem(li)(state, dispatch)) return true;
            return true;
        },
        "ArrowDown": (state, dispatch) => {
            const { $from, empty } = state.selection;
            if (!empty) return false;
            if ($from.parent.type !== rSchema.nodes.code_block) return false;
            if ($from.parentOffset !== $from.parent.content.size) return false;

            const cbDepth = $from.depth;
            const parent = $from.node(cbDepth - 1);
            const isLast = $from.index(cbDepth - 1) === parent.childCount - 1;
            if (!isLast) return false;

            const p = rSchema.nodes.paragraph.createAndFill();
            if (!p) return false;
            const insertPos = $from.after(cbDepth);

            let tr = state.tr.insert(insertPos, p);
            tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
            if (dispatch) dispatch(tr.scrollIntoView());
            return true;
        },
    });
}