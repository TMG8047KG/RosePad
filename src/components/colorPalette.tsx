import { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import style from '../styles/components/colorPalette.module.css';

type Props = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  disabled?: boolean;
  colors?: string[];
  renderAs?: 'popover' | 'panel'; // 'popover' uses trigger + floating panel; 'panel' renders standalone panel
  showReset?: boolean; // only display Reset button in editor context
  resetTo?: string; // target color for Reset (used by editor to restore defaults)
  onReset?: () => void; // optional handler for consumers that clear marks instead of setting a color
};

const DEFAULT_COLORS = [
  '#F43F5E', '#EF4444', '#F97316', '#F59E0B', '#FDE047',
  '#A3E635', '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#8B5CF6', '#A855F7', '#EC4899'
];

const SHORT_HEX_LEN = 4;

const expandShortHex = (hex: string) => `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;

function rgbToHex(r:number,g:number,b:number) {
  return `#${[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase()}`;
}

function normalizeToHex6(input: string): string | null {
  const normalized = normalizeHex(input);
  if (normalized) {
    return normalized.length === SHORT_HEX_LEN ? expandShortHex(normalized) : normalized;
  }
  const rgb = input.trim().match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)$/i);
  if (rgb) {
    const [r, g, b] = rgb.slice(1, 4).map(v => Number.parseInt(v, 10));
    if ([r, g, b].every(v => Number.isFinite(v) && v >= 0 && v <= 255)) {
      return rgbToHex(r, g, b);
    }
  }
  return null;
}

function normalizeHex(v: string): string | null {
  let t = v.trim().toUpperCase();
  if (!t) return null;
  if (t[0] !== '#') t = `#${t}`;
  if (t.length === 4) return /^#([0-9A-F]{3})$/.test(t) ? t : null;
  if (t.length === 7) return /^#([0-9A-F]{6})$/.test(t) ? t : null;
  return null;
}

export default function ColorPalette({ value, onChange, className, disabled, colors, renderAs = 'popover', showReset = false, resetTo, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [text, setText] = useState(normalizeToHex6(value) ?? value.toUpperCase());
  const resetTargetRef = useRef(resetTo ?? value);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{left:number; top:number; ready:boolean}>({ left: 0, top: 0, ready: false });
  const isDraggingRef = useRef(false);
  const palette = colors ?? DEFAULT_COLORS;
  const isPopover = renderAs === 'popover';
  const orientationRef = useRef<null | 'below' | 'above'>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isPicking, setIsPicking] = useState(false);
  const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  useEffect(() => setText(normalizeToHex6(value) ?? value.toUpperCase()), [value]);
  useEffect(() => { if (resetTo) resetTargetRef.current = resetTo; }, [resetTo]);
  useEffect(() => { if (resetTo) return; if (!isPopover || !open) resetTargetRef.current = value; }, [value, open, isPopover, resetTo]);

  useEffect(() => {
    if (!isPopover) return;
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
  }, [open, isPopover]);

  useEffect(() => {
    if (!open || !isPopover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false); setCustomOpen(false);
        requestAnimationFrame(() => btnRef.current?.focus());
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isPopover]);

  // Ensure position is calculated before paint to avoid flicker/teleport (floating mode only).
  useLayoutEffect(() => {
    if (!open || !isPopover) return;

    const getConstraintRect = () => {
      const vw = window.innerWidth; const vh = window.innerHeight;
      const viewport = new DOMRect(0, 0, vw, vh);
      let el: HTMLElement | null = btnRef.current ? btnRef.current.parentElement : null;
      while (el && el !== document.body) {
        const role = el.getAttribute('role') || '';
        const cls = (el as HTMLElement).className?.toString?.() || '';
        if (role.includes('dialog') || /\bmodal\b/i.test(cls) || el.hasAttribute('data-modal') || el.hasAttribute('data-dialog')) {
          try { return el.getBoundingClientRect(); } catch { return viewport; }
        }
        el = el.parentElement;
      }
      return viewport;
    };

    const place = () => {
      const btn = btnRef.current; const panel = panelRef.current; if (!btn || !panel) return;
      // Measure button and panel
      const b = btn.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      const margin = 8;
      const constraint = getConstraintRect();

      // Horizontal
      let left = b.left;
      left = Math.max(constraint.left + margin, Math.min(left, constraint.right - p.width - margin));

      // Vertical preference: below if fits, otherwise above, otherwise clamp
      const gap = 6;
      const spaceBelow = constraint.bottom - b.bottom;
      const spaceAbove = b.top - constraint.top;

      // Maintain orientation once chosen; flip only if necessary
      const fitsBelow = p.height + gap <= spaceBelow;
      const fitsAbove = p.height + gap <= spaceAbove;

      if (!orientationRef.current) {
        orientationRef.current = fitsBelow ? 'below' : (fitsAbove ? 'above' : 'below');
      }

      let top: number;
      if (orientationRef.current === 'below') {
        top = b.bottom + gap;
        // If overflow bottom, try flip, otherwise clamp
        if (top + p.height + margin > constraint.bottom) {
          if (fitsAbove) {
            orientationRef.current = 'above';
            top = b.top - p.height - gap;
          } else {
            top = Math.max(constraint.top + margin, constraint.bottom - p.height - margin);
          }
        }
      } else { // 'above'
        top = b.top - p.height - gap;
        // If overflow top, try flip, otherwise clamp
        if (top < constraint.top + margin) {
          if (fitsBelow) {
            orientationRef.current = 'below';
            top = b.bottom + gap;
          } else {
            top = Math.max(constraint.top + margin, Math.min(b.bottom + gap, constraint.bottom - p.height - margin));
          }
        }
      }

      setPanelPos({ left, top, ready: true });
    };

    // First pass immediately in layout phase
    place();
    // After DOM updates like expanding custom panel, re-measure next frame
    const id = requestAnimationFrame(place);
    const onResize = () => place();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    // Observe panel size changes (e.g., custom picker expand/collapse)
    const ro = new ResizeObserver(() => place());
    if (panelRef.current) ro.observe(panelRef.current);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      ro.disconnect();
    };
  }, [open, customOpen, isPopover]);

  // When opening, mark as not ready so it stays hidden until positioned
  useEffect(() => { if (open && isPopover) { orientationRef.current = null; setPanelPos(p => ({ ...p, ready: false })); } }, [open, isPopover]);

  const hex = useMemo(() => {
    const normalized = normalizeHex(text);
    if (normalized) {
      return normalized.length === SHORT_HEX_LEN ? expandShortHex(normalized) : normalized;
    }
    const fallback = normalizeToHex6(value);
    return fallback ?? '#000000';
  }, [text, value]);

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const hexToRgb = (h: string) => {
    const t = normalizeToHex6(h); if (!t) return null;
    return { r: parseInt(t.slice(1,3),16), g: parseInt(t.slice(3,5),16), b: parseInt(t.slice(5,7),16) };
  };
  const rgbToHsv = (r:number,g:number,b:number) => {
    r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
    let h=0; if(d){ h = max===r?((g-b)/d+(g<b?6:0)): max===g?((b-r)/d+2):((r-g)/d+4); h*=60; }
    const s = max===0?0:d/max; const v=max; return {h,s,v};
  };
  const hsvToRgb = (h:number,s:number,v:number) => { h=((h%360)+360)%360; const c=v*s; const x=c*(1-Math.abs(((h/60)%2)-1)); const m=v-c; let rp=0,gp=0,bp=0; if(h<60){rp=c;gp=x;} else if(h<120){rp=x;gp=c;} else if(h<180){gp=c;bp=x;} else if(h<240){gp=x;bp=c;} else if(h<300){rp=x;bp=c;} else {rp=c;bp=x;} return { r:Math.round((rp+m)*255), g:Math.round((gp+m)*255), b:Math.round((bp+m)*255) } };
  const hsvToHex = (h:number,s:number,v:number) => { const {r,g,b}=hsvToRgb(h,s,v); return rgbToHex(r,g,b); };

  const lastHueRef = useRef(0);
  const rgbToHsvPreserveHue = (r:number,g:number,b:number, fallback:number) => {
    const { h, s, v } = rgbToHsv(r,g,b);
    if (s === 0) return { h: fallback, s, v };
    return { h, s, v };
  };
  // Normalize current value to 6-digit hex for comparisons
  const currentHex6 = useMemo(() => {
    const rgb = hexToRgb(value);
    return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : value.toUpperCase();
  }, [value]);
  const isCustomColor = useMemo(() => !palette.includes(currentHex6), [palette, currentHex6]);
  const initialHsv = useMemo(() => {
    const rgb = hexToRgb(value) ?? { r: 255, g: 0, b: 0 };
    const res = rgbToHsvPreserveHue(rgb.r, rgb.g, rgb.b, lastHueRef.current || 0);
    if (res.h) lastHueRef.current = res.h;
    return res;
  }, [value]);
  const [hsv, setHsv] = useState(initialHsv);
  useEffect(()=> { if (!customOpen && !isDraggingRef.current) setHsv(initialHsv); }, [initialHsv, customOpen]);

  const syncFromHex = (hex: string, applyChange = true) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return null;
    setText(normalized);
    const rgb = hexToRgb(normalized);
    if (rgb) {
      const nhsv = rgbToHsvPreserveHue(rgb.r, rgb.g, rgb.b, lastHueRef.current);
      setHsv(nhsv); if (nhsv.h) lastHueRef.current = nhsv.h;
      if (applyChange) onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    } else if (applyChange) {
      onChange(normalized);
    }
    return normalized;
  };

  const handleHexInputChange = (raw: string) => {
    const upper = raw.toUpperCase();
    const limited = upper.startsWith('#') ? upper.slice(0, 7) : upper.slice(0, 6);
    setText(limited);
    const normalized = normalizeHex(limited);
    if (normalized) syncFromHex(normalized);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
      return;
    }
    syncFromHex(resetTargetRef.current);
  };

  const triggerNativePicker = () => {
    const el = colorInputRef.current;
    if (el) el.click();
  };

  const handlePick = async () => {
    if (isPicking) return;
    if (!supportsEyeDropper) {
      triggerNativePicker();
      return;
    }
    try {
      setIsPicking(true);
      const picker = new (window as any).EyeDropper();
      const result = await picker.open();
      if (result?.sRGBHex) {
        syncFromHex(result.sRGBHex);
        setCustomOpen(true);
      }
    } catch (err: any) {
      // Ignore user cancellation; fallback only for actual failures
      const aborted = err?.name === 'AbortError' || err?.code === DOMException.ABORT_ERR;
      if (!aborted) triggerNativePicker();
    } finally {
      setIsPicking(false);
    }
  };

  const renderPanelContent = () => (
    <>
      <div className={style.grid}>
        {palette.map(c => (
          <button
            key={c}
            type="button"
            role="option"
            aria-selected={currentHex6 === c}
            className={`${style.cell} ${currentHex6 === c ? style.cellSelected : ''}`}
            style={{ background: c }}
            title={c}
            onClick={(e) => { e.preventDefault(); syncFromHex(c); setOpen(false); setCustomOpen(false); btnRef.current?.focus(); }}
          />
        ))}
        <button
          type="button"
          role="option"
          aria-selected={isCustomColor}
          className={`${style.customBtn} ${isCustomColor ? style.customBtnSelected : ''}`}
          aria-expanded={customOpen}
          onClick={(e) => { e.preventDefault(); setCustomOpen(o => !o); }}
          title="Custom color"
          style={isCustomColor ? { color: currentHex6 } : undefined}
        >
          {isCustomColor ? (
            <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="currentColor" d="M90,24.0217a17.9806,17.9806,0,0,0-5.2969-12.7968,18.5331,18.5331,0,0,0-25.6054,0L46.23,24.0972,41.9121,19.78a5.9994,5.9994,0,1,0-8.4844,8.4844l4.3184,4.3184L7.7578,62.5647A5.9956,5.9956,0,0,0,6,66.8069V83.9221a5.9966,5.9966,0,0,0,6,6H29.1152a5.9956,5.9956,0,0,0,4.2422-1.7578L63.34,58.176l4.3184,4.3184A5.9994,5.9994,0,0,0,76.1426,54.01L71.825,49.6924,84.6973,36.8245A17.9861,17.9861,0,0,0,90,24.0217Zm-63.3691,53.9H18V69.2913L46.2305,41.0667l8.625,8.625Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="picker">
                  <stop stopColor="#FC466B" offset="0%"/>
                  <stop stopColor="#3F5EFB" offset="100%"/>
                </linearGradient>
              </defs>
              <path fill='url(#picker)' d="M90,24.0217a17.9806,17.9806,0,0,0-5.2969-12.7968,18.5331,18.5331,0,0,0-25.6054,0L46.23,24.0972,41.9121,19.78a5.9994,5.9994,0,1,0-8.4844,8.4844l4.3184,4.3184L7.7578,62.5647A5.9956,5.9956,0,0,0,6,66.8069V83.9221a5.9966,5.9966,0,0,0,6,6H29.1152a5.9956,5.9956,0,0,0,4.2422-1.7578L63.34,58.176l4.3184,4.3184A5.9994,5.9994,0,0,0,76.1426,54.01L71.825,49.6924,84.6973,36.8245A17.9861,17.9861,0,0,0,90,24.0217Zm-63.3691,53.9H18V69.2913L46.2305,41.0667l8.625,8.625Z" />
            </svg>
          )}
        </button>
      </div>
      <div className={`${style.picker} ${customOpen ? style.pickerOpen : style.pickerClosed}`} aria-hidden={!customOpen}>
        <div className={style.pickerInner}>
          <div
            className={style.sv}
            style={{ backgroundColor: hsvToHex(hsv.h, 1, 1) }}
            onPointerDown={(e) => {
              isDraggingRef.current = true;
              e.preventDefault();
              const el = e.currentTarget as HTMLDivElement; const rect = el.getBoundingClientRect();
              const update = (cx:number, cy:number) => {
                const s = clamp((cx - rect.left) / rect.width, 0, 1);
                const v = clamp(1 - (cy - rect.top) / rect.height, 0, 1);
                setHsv(p => ({ ...p, s, v }));
                const hex = hsvToHex(hsv.h, s, v);
                onChange(hex);
              };
              update(e.clientX, e.clientY);
              const move = (ev: PointerEvent) => update(ev.clientX, ev.clientY);
              const up = () => { isDraggingRef.current = false; document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
              document.addEventListener('pointermove', move);
              document.addEventListener('pointerup', up);
            }}
          >
            <div className={style.svHandle} style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
          </div>
          <div
            className={style.hue}
            onPointerDown={(e) => {
              isDraggingRef.current = true;
              e.preventDefault();
              const el = e.currentTarget as HTMLDivElement; const rect = el.getBoundingClientRect();
              const update = (cx:number) => {
                const h = clamp(((cx - rect.left) / rect.width) * 360, 0, 360);
                setHsv(p => ({ ...p, h }));
                lastHueRef.current = h;
                onChange(hsvToHex(h, hsv.s, hsv.v));
              };
              update(e.clientX);
              const move = (ev: PointerEvent) => update(ev.clientX);
              const up = () => { isDraggingRef.current = false; document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
              document.addEventListener('pointermove', move);
              document.addEventListener('pointerup', up);
            }}
          >
            <div className={style.hueHandle} style={{ left: `${(hsv.h / 360) * 100}%` }} />
          </div>
          <div className={style.pickerRow}>
            <span className={style.preview} style={{ background: hsvToHex(hsv.h, hsv.s, hsv.v) }} />
            <input className={style.hexInput} value={text} maxLength={7} onChange={(e) => { 
              const value = (e.target as HTMLInputElement).value; 
              handleHexInputChange(value);
            }} placeholder="#RRGGBB" spellCheck={false} />
            <div className={style.pickerActions}>
              <button
                type="button"
                className={style.actionBtn}
                title={supportsEyeDropper ? 'Pick color from screen' : 'Pick color'}
                onMouseDown={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); handlePick(); }}
                disabled={isPicking}
              >
                <svg viewBox="0 0 96 96" aria-hidden="true">
                  <path fill="currentColor" d="M90,24.0217a17.9806,17.9806,0,0,0-5.2969-12.7968,18.5331,18.5331,0,0,0-25.6054,0L46.23,24.0972,41.9121,19.78a5.9994,5.9994,0,1,0-8.4844,8.4844l4.3184,4.3184L7.7578,62.5647A5.9956,5.9956,0,0,0,6,66.8069V83.9221a5.9966,5.9966,0,0,0,6,6H29.1152a5.9956,5.9956,0,0,0,4.2422-1.7578L63.34,58.176l4.3184,4.3184A5.9994,5.9994,0,0,0,76.1426,54.01L71.825,49.6924,84.6973,36.8245A17.9861,17.9861,0,0,0,90,24.0217Zm-63.3691,53.9H18V69.2913L46.2305,41.0667l8.625,8.625Z"/>
                </svg>
              </button>
              {showReset && (
                <button
                  type="button"
                  className={style.actionBtn}
                  title="Reset"
                  onMouseDown={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); handleReset(); }}
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                className={style.cancelBtn}
                onMouseDown={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); setCustomOpen(false); }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className={style.root}>
      {renderAs === 'panel' ? (
        <div className={style.panelStatic} role="listbox" tabIndex={-1}>
          {renderPanelContent()}
        </div>
      ) : (
        <>
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
            <div
              ref={panelRef}
              className={`${style.panel} ${!panelPos.ready ? style.panelHidden : ''}`}
              role="listbox"
              tabIndex={-1}
              style={panelPos.ready ? { left: panelPos.left, top: panelPos.top } : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setOpen(false);
                  setCustomOpen(false);
                  requestAnimationFrame(() => btnRef.current?.focus());
                }
              }}
          >
              {renderPanelContent()}
            </div>
          )}
          <input
            ref={colorInputRef}
            type="color"
            className={style.hiddenInput}
            value={hex}
            aria-label="Pick color"
            onChange={(e)=> handleHexInputChange((e.target as HTMLInputElement).value)}
          />
        </>
      )}
    </div>
  );
}
