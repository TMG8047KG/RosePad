import { Plugin as Plug } from "prosemirror-state"
import { notifyDocChange } from "./editorBridge";

export const rEvent = () => {
    return new Plug({
        filterTransaction(tr) {
            return true;
        },
        appendTransaction(_trs, _old, _state) {
            return null;
        },
        view(view) {
            const emit = () => {
                const { selection, schema, doc } = view.state;

                let rect: null | { left:number; right:number; top:number; bottom:number } = null;
                if (!selection.empty) {
                    const a = view.coordsAtPos(selection.from);
                    const b = view.coordsAtPos(selection.to);
                    rect = {
                        left: Math.min(a.left, b.left),
                        right: Math.max(a.right, b.right),
                        top: Math.min(a.top, b.top),
                        bottom: Math.max(a.bottom, b.bottom),
                    };
                }

                const marks = schema.marks, nodes = schema.nodes;
                const markOn = (t:any) => {
                    if (!t) return false;
                    const { from, to, empty, $from } = selection;
                    if (empty) return !!t.isInSet(view.state.storedMarks || $from.marks());
                    return doc.rangeHasMark(from, to, t);
                };
                const active = {
                    bold: markOn(marks?.strong),
                    italic: markOn(marks?.em),
                    underline: markOn(marks?.underline),
                    strike: markOn(marks?.strike),
                    code: markOn(marks?.code),
                    headingLevel: selection.$from.parent.type === nodes?.heading ? selection.$from.parent.attrs.level : null,
                    inBullet: selection.$from.depth > 0 && selection.$from.node(-1).type === nodes?.bullet_list,
                    inOrdered: selection.$from.depth > 0 && selection.$from.node(-1).type === nodes?.ordered_list,
                    inCodeBlock: selection.$from.parent.type === nodes?.code_block,
                };

                window.dispatchEvent(new CustomEvent("rosepad:selection", { detail: { rect, active } }));
            };

            emit();
            return {
                update: (view, prevState) => {
                    emit()
                    if (!prevState.doc.eq(view.state.doc)) notifyDocChange()
                },
                destroy: () =>
                window.dispatchEvent(new CustomEvent("rosepad:selection", { detail: null })),
            };
        },
    })
}