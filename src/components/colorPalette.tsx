import { useEffect, useMemo, useRef, useState } from 'react';
import style from '../styles/components/colorPalette.module.css';

type Props = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  disabled?: boolean;
  colors?: string[];
};

const DEFAULT_COLORS = [
  '#F43F5E', '#EF4444', '#F97316', '#F59E0B', '#FDE047',
  '#A3E635', '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#8B5CF6', '#A855F7', '#EC4899'
];

function normalizeHex(v: string): string | null {
  let t = v.trim().toUpperCase();
  if (!t) return null;
  if (t[0] !== '#') t = `#${t}`;
  if (t.length === 4) return /^#([0-9A-F]{3})$/.test(t) ? t : null;
  if (t.length === 7) return /^#([0-9A-F]{6})$/.test(t) ? t : null;
  return null;
}

export default function ColorPalette({ value, onChange, className, disabled, colors }: Props) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [text, setText] = useState(value.toUpperCase());
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{left:number; top:number; ready:boolean}>({ left: 0, top: 0, ready: false });
  const isDraggingRef = useRef(false);
  const palette = colors ?? DEFAULT_COLORS;

  useEffect(() => setText(value.toUpperCase()), [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setCustomOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Position the panel within viewport bounds
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = btnRef.current; const panel = panelRef.current; if (!btn || !panel) return;
      // temporarily show for measurement
      panel.style.visibility = 'hidden';
      panel.style.left = '0px';
      panel.style.top = '0px';
      const b = btn.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      const margin = 8;
      const vw = window.innerWidth; const vh = window.innerHeight;
      let left = Math.min(Math.max(b.left, margin), Math.max(margin, vw - p.width - margin));
      // Prefer below; if not enough space, open above
      const spaceBelow = vh - b.bottom;
      const spaceAbove = b.top;
      let top = b.bottom + 6;
      if (spaceBelow < p.height + 6 && spaceAbove > p.height + 6) {
        top = b.top - p.height - 6;
      } else if (top + p.height + margin > vh) {
        top = Math.max(margin, vh - p.height - margin);
      }
      setPanelPos({ left, top, ready: true });
      panel.style.visibility = '';
    };
    // Place after paint
    const id = requestAnimationFrame(place);
    const onResize = () => place();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onResize, true); };
  }, [open]);

  const hex = useMemo(() => normalizeHex(text) ?? value.toUpperCase(), [text, value]);

  // HSV helpers for the inline picker
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const hexToRgb = (h: string) => {
    const t = normalizeHex(h); if (!t) return null;
    if (t.length === 4) {
      const r = parseInt(t[1] + t[1], 16), g = parseInt(t[2] + t[2], 16), b = parseInt(t[3] + t[3], 16);
      return { r, g, b };
    }
    return { r: parseInt(t.slice(1,3),16), g: parseInt(t.slice(3,5),16), b: parseInt(t.slice(5,7),16) };
  };
  const rgbToHex = (r:number,g:number,b:number) => `#${[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase()}`;
  const rgbToHsv = (r:number,g:number,b:number) => {
    r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
    let h=0; if(d){ h = max===r?((g-b)/d+(g<b?6:0)): max===g?((b-r)/d+2):((r-g)/d+4); h*=60; }
    const s = max===0?0:d/max; const v=max; return {h,s,v};
  };
  const hsvToRgb = (h:number,s:number,v:number) => { h=((h%360)+360)%360; const c=v*s; const x=c*(1-Math.abs(((h/60)%2)-1)); const m=v-c; let rp=0,gp=0,bp=0; if(h<60){rp=c;gp=x;} else if(h<120){rp=x;gp=c;} else if(h<180){gp=c;bp=x;} else if(h<240){gp=x;bp=c;} else if(h<300){rp=x;bp=c;} else {rp=c;bp=x;} return { r:Math.round((rp+m)*255), g:Math.round((gp+m)*255), b:Math.round((bp+m)*255) } };
  const hsvToHex = (h:number,s:number,v:number) => { const {r,g,b}=hsvToRgb(h,s,v); return rgbToHex(r,g,b); };

  // Preserve hue when chroma is zero (black/white/gray), avoiding snap-to-red
  const lastHueRef = useRef(0);
  const rgbToHsvPreserveHue = (r:number,g:number,b:number, fallback:number) => {
    const { h, s, v } = rgbToHsv(r,g,b);
    if (s === 0) return { h: fallback, s, v };
    return { h, s, v };
  };
  const initialHsv = useMemo(() => {
    const rgb = hexToRgb(value) ?? { r: 255, g: 0, b: 0 };
    const res = rgbToHsvPreserveHue(rgb.r, rgb.g, rgb.b, lastHueRef.current || 0);
    if (res.h) lastHueRef.current = res.h;
    return res;
  }, [value]);
  const [hsv, setHsv] = useState(initialHsv);
  useEffect(()=> { if (!customOpen && !isDraggingRef.current) setHsv(initialHsv); }, [initialHsv, customOpen]);

  const applyText = (t: string) => {
    setText(t.toUpperCase());
    const h = normalizeHex(t);
    if (h) onChange(h);
  };

  return (
    <div className={style.root}>
      <button
        ref={btnRef}
        type="button"
        className={`${style.trigger} ${className ?? ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        title="Pick color"
      >
        <span className={style.swatch} style={{ background: value }} />
      </button>
      {open && (
        <div ref={panelRef} className={style.panel} role="listbox" tabIndex={-1} style={panelPos.ready ? { left: panelPos.left, top: panelPos.top } : undefined}>
          <div className={style.grid}>
            {palette.map(c => (
              <button key={c} className={style.cell} style={{ background: c }} title={c}
                onMouseDown={(e) => { e.preventDefault(); onChange(c); setOpen(false); setCustomOpen(false); }} />
            ))}
            <button className={style.customBtn} onMouseDown={(e) => { e.preventDefault(); setCustomOpen(o => !o); }} title="Custom color">Custom</button>
          </div>
          {customOpen && (
            <div className={style.picker}>
              <div
                className={style.sv}
                style={{ backgroundColor: hsvToHex(hsv.h, 1, 1) }}
                onMouseDown={(e) => {
                  isDraggingRef.current = true;
                  const el = e.currentTarget as HTMLDivElement; const rect = el.getBoundingClientRect();
                  const update = (cx:number, cy:number) => {
                    const s = clamp((cx - rect.left) / rect.width, 0, 1);
                    const v = clamp(1 - (cy - rect.top) / rect.height, 0, 1);
                    setHsv(p => ({ ...p, s, v }));
                    const hex = hsvToHex(hsv.h, s, v);
                    onChange(hex);
                  };
                  update(e.clientX, e.clientY);
                  const move = (ev: MouseEvent) => update(ev.clientX, ev.clientY);
                  const up = () => { isDraggingRef.current = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
                  document.addEventListener('mousemove', move);
                  document.addEventListener('mouseup', up);
                }}
              >
                <div className={style.svHandle} style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
              </div>
              <div
                className={style.hue}
                onMouseDown={(e) => {
                  isDraggingRef.current = true;
                  const el = e.currentTarget as HTMLDivElement; const rect = el.getBoundingClientRect();
                  const update = (cx:number) => {
                    const h = clamp(((cx - rect.left) / rect.width) * 360, 0, 360);
                    setHsv(p => ({ ...p, h }));
                    lastHueRef.current = h;
                    onChange(hsvToHex(h, hsv.s, hsv.v));
                  };
                  update(e.clientX);
                  const move = (ev: MouseEvent) => update(ev.clientX);
                  const up = () => { isDraggingRef.current = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
                  document.addEventListener('mousemove', move);
                  document.addEventListener('mouseup', up);
                }}
              >
                <div className={style.hueHandle} style={{ left: `${(hsv.h / 360) * 100}%` }} />
              </div>
              <div className={style.pickerRow}>
                <span className={style.preview} style={{ background: hsvToHex(hsv.h, hsv.s, hsv.v) }} />
                <input className={style.hexInput} value={hex} onChange={(e) => { const v = (e.target as HTMLInputElement).value; setText(v.toUpperCase()); const rgb = hexToRgb(v); if (rgb) { const nhsv = rgbToHsvPreserveHue(rgb.r, rgb.g, rgb.b, lastHueRef.current); setHsv(nhsv); if (nhsv.h) lastHueRef.current = nhsv.h; onChange(rgbToHex(rgb.r, rgb.g, rgb.b)); } }} placeholder="#RRGGBB" spellCheck={false} />
                <button className={style.cancelBtn} onMouseDown={(e)=>{ e.preventDefault(); setCustomOpen(false); }}>Done</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
