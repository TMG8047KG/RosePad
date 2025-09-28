import { MarkSpec } from "prosemirror-model";

export const rMarks: Record<string, MarkSpec> = {
    strong: { 
        parseDOM: [{ style: "font-weight: 700"}],
        toDOM() {
            return ["strong", 0];
        } 
    },
    em: {
        parseDOM: [{ tag: "em" }, { tag: "i" }],
        toDOM() { 
            return ["em", 0]; 
        } 
    },
    underline: {
        parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
        toDOM() {   
            return ["u", 0]; 
        }
    },
    strike:{
        parseDOM: [{ tag: "s"}],
        toDOM() {
            return ["s", 0];
        }
    },
    code: {
        excludes: "_",
        inclusive: false,
        parseDOM: [{ tag: "code" }],
        toDOM() {
            return ["code", 0]
        }
    }
}