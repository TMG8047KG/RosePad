import { useState, useEffect, useRef, useCallback } from "react";
import style from '../../styles/components/editor/stylesMenu.module.css'
import { setTextColor } from '../../core/editor/command/TextColor'
import { getView } from "../../core/editor/editorBridge";
import { setBlockType, toggleMark } from "prosemirror-commands";
import { setHighlightColor } from "../../core/editor/command/Highlight";
import HeadingPicker from "../editor/headingPicker";
import FontSizePicker from "../editor/fontSizePicker";
import { setFontSize as applyFontSize } from "../../core/editor/command/FontSize";
import { Align, getSelectionAlign, toggleTextAlign } from "../../core/editor/command/Align";
import { toggleBulletList, toggleOrderedList } from "../../core/editor/command/Lists";
import ColorPalette from "../colorPalette";


type ActiveState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  code: boolean;
  strike?: boolean;
  headingLevel: 0|1|2|3|4|5|6;
  inBullet: boolean;
  inOrdered: boolean;
  inCodeBlock: boolean;
  textColor: string;
  highlight: string;
  fontSize: number;
  align?: "left" | "center" | "right" | "justify" | "none" | "mixed";
};

const StyleMenu = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ActiveState>({
    bold: false,
    italic: false,
    underline: false,
    code: false,
    strike: false,
    headingLevel: 0,
    inBullet: false,
    inOrdered: false,
    inCodeBlock: false,
    textColor: "#ffffff",
    highlight: "#ffff00",
    fontSize: 12,
    align: "none"
  });

  useEffect(() => {
    const onState = (e: any) => {
      const el = ref.current;
      if (!el) return;
      if (!e?.detail) {
        el.style.display = "none";
        return;
      }
      const { rect, active } = e.detail as { rect: any; active: ActiveState };
      setActive((prev) => ({ ...prev, ...active }));
      if (!rect) {
        el.style.display = "none";
        return;
      }
      el.style.display = "flex";
      const box = el.getBoundingClientRect();
      const x = Math.max(8, Math.min(rect.left, window.innerWidth - box.width));
      const y = Math.min(rect.bottom, window.innerHeight - box.height);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };
    window.addEventListener("rosepad:selection", onState);
    return () => window.removeEventListener("rosepad:selection", onState);
  }, []);

  const run = useCallback((cmd: (s: any, d: any, v?: any) => boolean) => {
    const view = getView();
    if (!view) return;
    const { state, dispatch } = view;
    if (cmd(state, dispatch, view)) view.focus();
  }, []);

  const toggleBold = () => {
    const view = getView();
    if (!view) return;
    const m = view.state.schema.marks;
    run(toggleMark(m.strong));
  };

  const toggleItalic = () => {
    const view = getView();
    if (!view) return;
    const m = view.state.schema.marks;
    run(toggleMark(m.em));
  };

  const toggleStrike = () => {
    const view = getView();
    if (!view) return;
    const m = view.state.schema.marks;
    run(toggleMark(m.strike));
  };

  const toggleUnderline = () => {
    const view = getView();
    if (!view) return;
    const m = view.state.schema.marks;
    if (m.underline) run(toggleMark(m.underline));
  };

  const toggleCode = () => {
    const view = getView();
    if (!view) return;
    const m = view.state.schema.marks;
    if (m.code) run(toggleMark(m.code));
  };

  const setHeading = (level: 1 | 2 | 3 | 4 | 5 | 6 | 0) => {
    const view = getView();
    if (!view) return;
    const n = view.state.schema.nodes;
    if (level === 0) {
      run(setBlockType(n.paragraph));
    } else if (n.heading) {
      run(setBlockType(n.heading, { level }));
    }
  };

  const setColor = (color: string) => {
    const view = getView();
    if (!view) return;
    if (active.inCodeBlock) return;
    setTextColor(color)(view.state, view.dispatch, view);
    view.focus();  
  };

  const setHighlight = (color: string) => {
    const view = getView();
    if (!view) return;
    if (active.inCodeBlock) return;
    setHighlightColor(color)(view.state, view.dispatch, view);
    view.focus();  
  };

  const setFontSize = (size: number) => {
    const view = getView();
    if (!view) return;
    if (active.inCodeBlock) return;
    applyFontSize(size)(view.state, view.dispatch, view);
    view.focus();
    setActive(a => ({ ...a, fontSize: size }));
  };

  const applyAlign = (value: Align) => {
    const view = getView();
    if (!view) return;
    run(toggleTextAlign(value));
    setActive(a => ({ ...a, align: getSelectionAlign(view.state) }));
  };

  const toggleBullet = () => {
    const view = getView();
    if (!view) return;
    if (toggleBulletList(view)) view.focus();
  };

  const toggleOrdered = () => {
    const view = getView();
    if (!view) return;
    if (toggleOrderedList(view)) view.focus();
  };

  return(
      <div id="styles" ref={ref} className={style.box}>
        <div className={style.top}>
          <div className={style.styles}>
            <button className={`${style.button} ${active.bold ? style.active : ""}`} onClick={toggleBold} >
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5h4.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0-7H6m2 7h6.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0 0H6"/>
              </svg>
            </button>
            <button className={`${style.button} ${active.italic ? style.active : ''}`} onClick={toggleItalic}>
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.874 19 6.143-14M6 19h6.33m-.66-14H18"/>
              </svg>
            </button>
            <button className={`${style.button} ${active.underline ? style.active : ''}`} onClick={toggleUnderline}>
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 19h12M8 5v9a4 4 0 0 0 8 0V5M6 5h4m4 0h4"/>
              </svg>
            </button>
            <button className={`${style.button} ${active.strike ? style.active : ''}`} onClick={toggleStrike}>
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6.2V5h12v1.2M7 19h6m.2-14-1.677 6.523M9.6 19l1.029-4M5 5l6.523 6.523M19 19l-7.477-7.477"/>
              </svg>
            </button>
          </div>
          <div className={style.styles}>
            <button className={`${style.button} ${active.code ? style.active : ""}`} onClick={toggleCode} >
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8 8-4 4 4 4m8 0 4-4-4-4m-2-3-4 14"/>
              </svg>
            </button>
            <button className={`${style.button} ${active.inBullet ? style.active : ''}`} onClick={toggleBullet}>
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5"/>
              </svg>
            </button>
            <button className={`${style.button} ${active.inOrdered ? style.active : ''}`} onClick={toggleOrdered}>
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6h8m-8 6h8m-8 6h8M4 16a2 2 0 1 1 3.321 1.5L4 20h5M4 5l2-1v6m-2 0h4"/>
              </svg>
            </button>
             <ColorPalette className={style.color} value={active.highlight} onChange={(c)=>{ setHighlight(c); setActive(a => ({ ...a, highlight: c })); }} />
          </div>
          <div className={style.alignments}>
            <button className={`${style.button} ${active.align === "left" ? style.active : ""}`} onClick={() => applyAlign("left")} title="Align Left">
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M4 9h8M4 13h16M4 17h8"/>
              </svg>
            </button>
            <button className={`${style.button} ${active.align === "center" ? style.active : ""}`} onClick={() => applyAlign("center")} title="Align Center">
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M8 9h8M4 13h16M8 17h8"/>
              </svg>
            </button>
            <button className={`${style.button} ${active.align === "right" ? style.active : ""}`} onClick={() => applyAlign("right")} title="Align Right">
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M12 9h8M4 13h16M12 17h8"/>
              </svg>
            </button>
            <button className={`${style.button} ${active.align === "justify" ? style.active : ""}`} onClick={() => applyAlign("justify")} title="Justify">
              <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M4 9h16M4 13h16M4 17h16"/>
              </svg>
            </button>
          </div>
        </div> 
        <div className={style.divider}></div>
        <div className={style.bottom}>
          <HeadingPicker className={style.headers} value={active.headingLevel} options={[{value:0,label:'P'},{value:1,label:'H1'},{value:2,label:'H2'},{value:3,label:'H3'},{value:4,label:'H4'},{value:5,label:'H5'},{value:6,label:'H6'}]} onChange={(v)=>{setHeading(v)}} width="2.8rem" />
          <FontSizePicker className={style.fontSizes} value={active.fontSize} options={[{value:8,label:'8pt'},{value:10,label:'10pt'},{value:12,label:'12pt'},{value:14,label:'14pt'},{value:18,label:'18pt'},{value:24,label:'24pt'},{value:36,label:'36pt'}]} onChange={setFontSize} width="3.6rem" />
          <ColorPalette className={style.color} value={active.textColor} onChange={(c)=>{ setColor(c); setActive(a => ({ ...a, textColor: c })); }} />
        </div>
      </div>
    )
}

export default StyleMenu;
