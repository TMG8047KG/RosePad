import { Schema } from "prosemirror-model";
import { rMarks } from "./rMarks";

export const rSchema = new Schema({
    nodes: {
        doc: { content: "block+" },
        paragraph: {
            content: "inline*",
            group: "block",
            parseDOM: [{ tag: "p" }],
            toDOM() { 
                return ["p", 0]; 
            }
        },
        heading: {
            attrs: { level: { default: 1 } },
            content: "inline*",
            group: "block",
            defining: true,
            parseDOM: [
                { tag: "h1", attrs: { level: 1 } },
                { tag: "h2", attrs: { level: 2 } },
                { tag: "h3", attrs: { level: 3 } },
                { tag: "h4", attrs: { level: 4 } },
                { tag: "h5", attrs: { level: 5 } },
                { tag: "h6", attrs: { level: 6 } }
            ],
            toDOM(node) {
                const level = (node.attrs as { level: number }).level;
                return ["h" + level, 0];
            }
        },
        list_item: {
            content: "block+",
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