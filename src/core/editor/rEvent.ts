import { Plugin as Plug } from "prosemirror-state"
import { notifyDocChange } from "./editorBridge";
import { getActiveFontSize } from "./command/FontSize";
import { AlignState, getSelectionAlign } from "./command/Align";

export const rEvent = () => {
    return new Plug({
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

                // Helpers to read current color/highlight at the selection
                const pickMark = (arr: readonly any[] | null | undefined, type: any) =>
                    (arr || []).find((m: any) => m.type === type) || null;

                const readAttr = (mark: any, key: string): string | null => {
                    if (!mark) return null;
                    const v = mark.attrs?.[key];
                    if (typeof v === 'string' && v.trim().length) return v.trim();
                    return null;
                };

                const getActiveMarkAttr = (type: any, key: string, fallback: string): string => {
                    if (!type) return fallback;
                    const sel: any = selection;

                    // 1) Prefer stored marks (typing after color change)
                    const stored = view.state.storedMarks;
                    if (stored && stored.length) {
                        const m = pickMark(stored, type);
                        const val = readAttr(m, key);
                        if (val) return val;
                    }

                    // 2) If cursor selection, inspect marks at cursor
                    if (sel.empty) {
                        const m = pickMark(sel.$from.marks(), type);
                        const val = readAttr(m, key);
                        if (val) return val;
                    } else {
                        // 3) Non-empty selection: find first node with the mark
                        let found: string | null = null;
                        doc.nodesBetween(sel.from, sel.to, node => {
                            if (found != null) return false;
                            const m = pickMark(node.marks, type);
                            const val = readAttr(m, key);
                            if (val) found = val;
                            return true;
                        });
                        if (found) return found;
                    }

                    return fallback;
                };

                const activeTextColor = getActiveMarkAttr(marks?.textColor, 'color', '#ffffff');
                const activeHighlight = getActiveMarkAttr(marks?.highlight, 'color', '#ffff00');

                const alignForView = (view: any): AlignState => getSelectionAlign(view.state);

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
                    textColor: activeTextColor,
                    highlight: activeHighlight,
                    fontSize: getActiveFontSize(view.state),
                    align: alignForView(view)
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
