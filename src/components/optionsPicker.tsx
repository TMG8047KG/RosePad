import { useEffect, useMemo, useRef, useState } from "react";
import style from '../styles/components/editor/optionsPicker.module.css';

type Option = { value: 0|1|2|3|4|5|6; label: string };

type Props = {
  value: 0|1|2|3|4|5|6;
  options: Option[];
  onChange: (v: 0|1|2|3|4|5|6) => void;
  className?: string;
  disabled?: boolean;
  width?: number | string;
};

export default function OptionsPicker({ value, options, onChange, className, disabled, width }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number>(value);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const current = useMemo(() => options.find(o => o.value === value) ?? options[0], [options, value]);

  useEffect(() => setActive(value), [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className={`${style.root} ${disabled ? style.disabled : ""} ${className ?? ""}`} style={{ width }}>
      <button
        ref={btnRef}
        type="button"
        className={style.button}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
      >
        <span>{current?.label}</span>
        <svg className={`${style.chev} ${open ? style.rot : ""}`} viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      {open && (
        <div ref={listRef} className={`${style.list} ${open ? style.listOpen : ""}`} role="listbox" tabIndex={-1}>
          {options.map(o => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`${style.opt} ${o.value === active ? "active" : ""} ${o.value === value ? "selected" : ""}`}
              onMouseEnter={() => setActive(o.value)}
              onMouseDown={e => {
                e.preventDefault();
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
