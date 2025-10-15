import { MarkSpec } from "prosemirror-model";

export const rMarks: Record<string, MarkSpec> = {
    strong: {
        parseDOM: [
            { tag: "strong" },
            {
                style: "font-weight",
                getAttrs: (value: string) => {
                    const n = /^\d+$/.test(value);
                    return (typeof n === "number" && n >= 600) ? null : false;
                },
            },
        ],
        toDOM() { 
            return ["strong", 0]; 
        }
    },
    em: {
        parseDOM: [
            { tag: "em" },
            { tag: "i" },
        ],
        toDOM() { 
            return ["em", 0]; 
        }
    },
    underline: {
        parseDOM: [
            { tag: "u" },
        ],
        toDOM() { 
            return ["u", 0]; 
        }
    },
    strike: {
        parseDOM: [
            { tag: "s" },
        ],
        toDOM() {
            return ["s", 0]; 
        }
    },
    textColor: {
        attrs: { color: { default: "" }},
        parseDOM: [
            { 
                style: "color",
                 getAttrs: (value: string) => {
                    const v = String(value).trim();
                    const hex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
                    const rgb = /^rgba?\(/i;
                    if (hex.test(v) || rgb.test(v)) return { color: v };
                    return { color: "#FFFF00" };
                }
            }
        ],
        toDOM(node) {
            return ["span", { style: ` color: ${node.attrs.color}` }]
        }
    },
    highlight: {
        attrs: { color: { default: "#FFFF00"}},
        parseDOM: [
            { 
                style: "background-color",
                getAttrs: (value: string) => {
                    const v = String(value).trim();
                    const hex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
                    const rgb = /^rgba?\(/i;
                    if (hex.test(v) || rgb.test(v)) return { color: v };
                    return { color: "#FFFF00" };
                }
            }
        ],
        toDOM(node) {
            return ["span", { style: `background-color: ${node.attrs.color}` }]
        }
    },
    fontSize: {
        attrs: { size: { default: "14pt" }},
        parseDOM: [{ 
            style: "font-size",
            getAttrs: (value: string) => {
                const n = /^(\d+(?:\.\d+)?)(pt|px)$/i.test(value);
                if(n) return { size: `${value}` };
                return { size: "12pt" };
            }
        }],
        toDOM(node) {
            return ["span", { style: `font-size: ${node.attrs.size}`}]
        }
    },
    code: {
        excludes: "_",
        inclusive: false,
        code: true,
        parseDOM: [{ tag: "code" }],
        toDOM() { 
            return ["code", 0];
        }
    }
}