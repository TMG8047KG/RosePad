import { wrappingInputRule, inputRules, textblockTypeInputRule } from "prosemirror-inputrules";
import { rSchema } from "./rSchema";

export const rRules = () => {
  const bulletList = wrappingInputRule(/^\s*([-+*])\s$/, rSchema.nodes.bullet_list);
  const orderedList = wrappingInputRule(/^\s*(\d+|[AaIi]+)\.\s$/, rSchema.nodes.ordered_list,
    (match) => {
      const m = match[1];
      let type: "1" | "a" | "A" | "i" | "I" | null = null;
      if (/^\d+$/.test(m)) type = "1";
      else if (/^[a]+$/.test(m)) type = "a";
      else if (/^[A]+$/.test(m)) type = "A";
      else if (/^[i]+$/.test(m)) type = "i";
      else if (/^[I]+$/.test(m)) type = "I";
      return { type, start: 1 };
    },
    (match, node) => {
      const m = match[1];
      let type: string | null = null;
      if (/^\d+$/.test(m)) type = "1";
      else if (/^[a]$/.test(m)) type = "a";
      else if (/^[A]$/.test(m)) type = "A";
      else if (/^[i]+$/.test(m)) type = "i";
      else if (/^[I]+$/.test(m)) type = "I";
      return node.type === rSchema.nodes.ordered_list && node.attrs.type === type;
    }
  );
  const codeBlock = textblockTypeInputRule(/^(```)+$/, rSchema.nodes.code_block)

    
  return inputRules({
    rules: [
        bulletList,
        orderedList,
        codeBlock
    ]
  });
}