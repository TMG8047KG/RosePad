import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Fragment } from "prosemirror-model";

export const footnoteKey = new PluginKey("rosepad-footnotes");

type FootnoteRef = { pos: number; index: number };

function findFootnotes(doc: any): FootnoteRef[] {
  const found: FootnoteRef[] = [];
  let i = 0;
  doc.descendants((node: any, pos: number) => {
    if (node.type && node.type.name === "footnote") {
      found.push({ pos, index: ++i });
    }
    return true;
  });
  return found;
}

function buildDecorations(state: any): DecorationSet {
  const decos: Decoration[] = [];
  const refs = findFootnotes(state.doc);
  for (const { pos, index } of refs) {
    const node = state.doc.nodeAt(pos);
    if (!node) continue;
    const widget = document.createElement("sup");
    widget.className = "pm-footnote-ref";
    widget.textContent = String(index);
    widget.setAttribute("data-fn-pos", String(pos));
    // place widget after the node; ensure newly typed text appears after it
    const deco = Decoration.widget(pos + node.nodeSize, widget, { side: -1 });
    decos.push(deco);
  }
  return DecorationSet.create(state.doc, decos);
}

function getFootnoteText(view: EditorView, start: number): string {
  const node = view.state.doc.nodeAt(start);
  if (!node || node.type.name !== "footnote") return "";
  try {
    return node.textContent || "";
  } catch {
    return "";
  }
}

function replaceFootnoteText(view: EditorView, start: number, text: string) {
  const { state, dispatch } = view;
  const node = state.doc.nodeAt(start);
  if (!node || node.type.name !== "footnote") return;
  const from = start + 1;
  const to = start + node.nodeSize - 1;
  const content = text ? Fragment.from(state.schema.text(text)) : Fragment.empty;
  let tr = state.tr.replaceWith(from, to, content);
  dispatch(tr);
}

function removeFootnote(view: EditorView, start: number) {
  const { state, dispatch } = view;
  const node = state.doc.nodeAt(start);
  if (!node || node.type.name !== "footnote") return;
  const from = start;
  const to = start + node.nodeSize;
  dispatch(state.tr.delete(from, to));
}

// label support removed

export function insertFootnote() {
  // Inserts a standalone footnote at the cursor when selection is empty,
  // or a linked footnote immediately after the selected inline range.
  return (state: any, dispatch?: any, view?: EditorView) => {
    const { selection, schema } = state;
    const type = schema.nodes.footnote;
    if (!type) return false;

    // Only allow inline-range behavior for non-empty selections
    const slice = selection.content();
    if (!selection.empty && !slice.content.size) return false;

    // Always create an empty footnote node; tooltip handles its content.
    const node = type.create(null, undefined);

    // Decide insertion position:
    // - Linked: place right after the selection (anchor to selected text)
    // - Standalone: place at the cursor
    const insertPos = selection.empty ? selection.from : selection.to;

    if (dispatch) {
      let tr = state.tr.insert(insertPos, node);
      // Move cursor after the inserted footnote so typing continues after it
      const after = insertPos + node.nodeSize;
      tr = tr.setSelection(TextSelection.create(tr.doc, after));
      dispatch(tr.scrollIntoView());
      // Open the tooltip at the inserted node position
      setTimeout(() => {
        const el = document.querySelector(`.pm-footnote-ref[data-fn-pos=\"${insertPos}\"]`) as HTMLElement | null;
        if (el && view) openTooltip(view, insertPos, el.getBoundingClientRect());
      }, 0);
    }
    return true;
  };
}

// Explicit variants for UI bindings if needed
export function insertStandaloneFootnote() {
  return (state: any, dispatch?: any, view?: EditorView) => {
    const { schema, selection } = state;
    const type = schema.nodes.footnote;
    if (!type) return false;
    const node = type.create(null, undefined);
    const pos = selection.from;
    if (dispatch) {
      let tr = state.tr.insert(pos, node);
      tr = tr.setSelection(TextSelection.create(tr.doc, pos + node.nodeSize));
      dispatch(tr.scrollIntoView());
      setTimeout(() => {
        const el = document.querySelector(`.pm-footnote-ref[data-fn-pos=\"${pos}\"]`) as HTMLElement | null;
        if (el && view) openTooltip(view, pos, el.getBoundingClientRect());
      }, 0);
    }
    return true;
  };
}

export function insertLinkedFootnote() {
  return (state: any, dispatch?: any, view?: EditorView) => {
    const { schema, selection } = state;
    const type = schema.nodes.footnote;
    if (!type) return false;
    const slice = selection.content();
    // Require a non-empty inline selection to attach to
    if (selection.empty || !slice.content.size) return false;
    const node = type.create(null, undefined);
    const pos = selection.to; // place after selection
    if (dispatch) {
      let tr = state.tr.insert(pos, node);
      tr = tr.setSelection(TextSelection.create(tr.doc, pos + node.nodeSize));
      dispatch(tr.scrollIntoView());
      setTimeout(() => {
        const el = document.querySelector(`.pm-footnote-ref[data-fn-pos=\"${pos}\"]`) as HTMLElement | null;
        if (el && view) openTooltip(view, pos, el.getBoundingClientRect());
      }, 0);
    }
    return true;
  };
}

// Tooltip management in plugin view closure
let tooltipEl: HTMLDivElement | null = null;
let openForPos: number | null = null;
let outsideClickHandler: ((e: MouseEvent) => void) | null = null;
let resizeHandler: (() => void) | null = null;

function ensureTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "pm-footnote-tooltip";
    tooltipEl.style.display = "none";
    document.body.appendChild(tooltipEl);
  }
}

function renderTooltip(view: EditorView, start: number, onClose: () => void) {
  if (!tooltipEl) return;
  const value = getFootnoteText(view, start);

  tooltipEl.innerHTML = "";
  const textarea = document.createElement("textarea");
  textarea.className = "pm-footnote-input";
  textarea.value = value;
  textarea.rows = 1; // small default size

  const autoGrow = () => {
    // Reset height to compute new scrollHeight correctly
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    // Reposition tooltip after size change
    const ref = document.querySelector(`.pm-footnote-ref[data-fn-pos="${start}"]`) as HTMLElement | null;
    if (ref) positionTooltip(ref.getBoundingClientRect());
  };

  // Live update text as user types
  textarea.addEventListener("input", () => {
    replaceFootnoteText(view, start, textarea.value);
    autoGrow();
  });
  // Close behaviors
  textarea.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      onClose();
      view.focus();
      return;
    }
    if (ev.key === "Enter" && !ev.shiftKey) {
      // Save and close: move caret after footnote and focus editor
      ev.preventDefault();
      const pos = openForPos != null ? openForPos : start;
      const node = view.state.doc.nodeAt(pos);
      if (node && node.type.name === "footnote") {
        const after = pos + node.nodeSize;
        const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, after));
        view.dispatch(tr.scrollIntoView());
      }
      onClose();
      view.focus();
    }
  });
  textarea.addEventListener("blur", () => {
    onClose();
  });

  tooltipEl.appendChild(textarea);

  // Mount and size
  setTimeout(() => {
    autoGrow();
    textarea.focus();
  }, 0);
}

function tooltipSize(): { w: number; h: number } {
  if (!tooltipEl) return { w: 0, h: 0 };
  const r = tooltipEl.getBoundingClientRect();
  return { w: r.width || 260, h: r.height || 0 };
}

function positionTooltip(rect: DOMRect) {
  if (!tooltipEl) return;
  const pad = 8;
  const gap = 6;
  const { w, h } = tooltipSize();
  let top = rect.bottom + gap;
  // Flip above if overflowing bottom
  if (top + h + pad > window.innerHeight) {
    top = Math.max(pad, rect.top - h - gap);
  }
  let left = rect.left;
  // Clamp horizontally
  left = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
  tooltipEl.style.top = `${Math.round(top)}px`;
  tooltipEl.style.left = `${Math.round(left)}px`;
}

function closeTooltip() {
  if (!tooltipEl) return;
  tooltipEl.style.display = "none";
  tooltipEl.innerHTML = "";
  openForPos = null;
  if (outsideClickHandler) {
    window.removeEventListener("mousedown", outsideClickHandler, true);
    outsideClickHandler = null;
  }
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
}

function openTooltip(view: EditorView, start: number, around: DOMRect) {
  ensureTooltip();
  if (!tooltipEl) return;
  openForPos = start;
  renderTooltip(view, start, closeTooltip);
  tooltipEl.style.display = "block";
  positionTooltip(around);

  // Close when clicking outside
  if (!outsideClickHandler) {
    outsideClickHandler = (e: MouseEvent) => {
      if (!tooltipEl) return;
      const t = e.target as Node;
      if (tooltipEl.contains(t)) return;
      const ref = (t as HTMLElement).closest && (t as HTMLElement).closest('.pm-footnote-ref');
      if (ref) return; // clicking the ref will be handled by handleClick
      closeTooltip();
    };
    window.addEventListener("mousedown", outsideClickHandler, true);
  }
  // Reposition on resize
  if (!resizeHandler) {
    resizeHandler = () => {
      const ref = document.querySelector(`.pm-footnote-ref[data-fn-pos="${start}"]`) as HTMLElement | null;
      if (ref) positionTooltip(ref.getBoundingClientRect());
    };
    window.addEventListener("resize", resizeHandler);
  }
}

export function footnotePlugin() {
  return new Plugin<{ decorations: DecorationSet } | any>({
    key: footnoteKey,
    state: {
      init: (_, state) => ({ decorations: buildDecorations(state) }),
      apply(tr, prev, oldState, newState) {
        // Keep tooltip open across content edits. Track mapped position and close only
        // if the footnote node no longer exists at that position.
        if (openForPos != null) {
          const mapped = tr.mapping.map(openForPos, -1);
          const node = newState.doc.nodeAt(mapped);
          if (!node || node.type.name !== "footnote") {
            closeTooltip();
          } else {
            openForPos = mapped;
            const ref = document.querySelector(`.pm-footnote-ref[data-fn-pos="${openForPos}"]`) as HTMLElement | null;
            if (ref) positionTooltip(ref.getBoundingClientRect());
          }
        }
        return { decorations: buildDecorations(newState) };
      },
    },
    props: {
      decorations(state) {
        const data = footnoteKey.getState(state);
        return data ? data.decorations : null;
      },
      handleClick(view, _pos, event) {
        const t = event.target as HTMLElement;
        const ref = t.closest && t.closest(".pm-footnote-ref") as HTMLElement | null;
        if (ref) {
          const start = Number(ref.getAttribute("data-fn-pos") || "-1");
          if (start >= 0) openTooltip(view, start, ref.getBoundingClientRect());
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        
        scroll(view, _evt) {
          // Reposition open tooltip on scroll
          if (!tooltipEl || openForPos == null) return false;
          const ref = document.querySelector(`.pm-footnote-ref[data-fn-pos="${openForPos}"]`) as HTMLElement | null;
          if (ref) positionTooltip(ref.getBoundingClientRect());
          return false;
        },
      },
    }
    ,
    view() {
      return {
        destroy() {
          if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
          tooltipEl = null;
          if (outsideClickHandler) {
            window.removeEventListener("mousedown", outsideClickHandler, true);
            outsideClickHandler = null;
          }
          if (resizeHandler) {
            window.removeEventListener("resize", resizeHandler);
            resizeHandler = null;
          }
        }
      }
    }
  });
}
