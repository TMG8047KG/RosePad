import { Schema } from "prosemirror-model";
import { rMarks } from "./rMarks";

export const rSchema = new Schema({
    nodes: {
        doc: { content: "block+" },
        paragraph: {
            content: "inline*",
            group: "block",
            attrs: { align: { default: "left" } },
            parseDOM: [{ 
                tag: "p",
                getAttrs: dom => {
                    const style = (dom as HTMLElement).style?.textAlign || null;
                    return { align: style || null };
                }
            }],
            toDOM(node) {
                const attrs: Record<string, any> = {};
                if (node.attrs.align) attrs.style = `text-align:${node.attrs.align}`;
                return ["p", attrs, 0]; 
            }
        },
        heading: {
            attrs: { level: { default: 1 }, align: { default: "left" } },
            content: "inline*",
            group: "block",
            defining: true,
            parseDOM: [1,2,3,4,5,6].map(l => ({
                tag: `h${l}`,
                getAttrs: dom => {
                const ta = (dom as HTMLElement).style?.textAlign || null;
                return { level: l, align: ta || null };
                }
            })),
            toDOM(node) {
                const level = node.attrs.level as number;
                const attrs: Record<string, string> = {};
                if (node.attrs.align) attrs.style = `text-align:${node.attrs.align}`;
                return [`h${level}`, attrs, 0];
            }
        },
        footnote: {
            inline: true,
            group: "inline",
            content: "inline*",
            atom: true,
            selectable: false,
            defining: true,
            parseDOM: [{ tag: "footnote" }],
            toDOM() { return ["footnote", 0] as any }
        },
        list_item: {
            content: "paragraph block*",
            defining: true,
            parseDOM: [{ tag: "li"}],
            toDOM(){
                return ["li", 0];
            }
        },
        bullet_list: { 
            content: "list_item+",
            group: "block",
            parseDOM: [{ tag: "ul" }],
            toDOM(){
                return ["ul", 0];
            }
        },
        ordered_list: {
            content: "list_item+",
            group: "block",
            attrs: { start: { default: null }, type: { default: null } },
            parseDOM: [{
                tag: "ol",
                getAttrs: (dom) => {
                    const el = dom as HTMLOListElement;
                    const startAttr = el.getAttribute("start");
                    const start = startAttr ? Math.max(1, Number(startAttr) || 1) : 1;
                    const type = el.getAttribute("type");
                    return { start, type: type || null };
                }
            }],
            toDOM(node) {
                const { start, type } = node.attrs as { start: number; type: string | null };
                const attrs: Record<string, any> = {};
                if (start && start !== 1) attrs.start = start;
                if (type) attrs.type = type;
                return ["ol", attrs, 0];
            }
        },
        code_block: { 
            excludes: "_", 
            content: "text*",
            marks: "",
            code: true,
            group: "block",
            parseDOM: [{ tag: "pre", preserveWhitespace: "full",  }], 
            toDOM() { 
                return ["pre", ["code", 0]]; 
            } 
        },
        text: { group: "inline" },
    },
    marks: rMarks
})
