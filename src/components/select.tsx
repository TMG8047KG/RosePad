import React, { useEffect, useMemo, useRef, useState } from "react";
import style from "../styles/components/modal.module.css";

export type SelectOption =
  | { kind: "option"; value: string; label: string }
  | { kind: "section"; label: string };

type OptionItem = Extract<SelectOption, { kind: "option" }>;

type SelectProps = {
  id: string;
  value?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
};

const Select: React.FC<SelectProps> = ({
  id,
  value,
  options,
  placeholder = "Select an option",
  className,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!open) return;
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedOption = useMemo(
    () => options.find((opt): opt is OptionItem => opt.kind === "option" && opt.value === value),
    [options, value]
  );

  const containerClass = [style.selectBody, className].filter(Boolean).join(" ");

  return (
    <div className={containerClass} ref={selectRef}>
      <button
        type="button"
        id={id}
        className={`${style.select} ${open ? style.selectOpen : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={style.selectValue}>{selectedOption?.label ?? placeholder}</span>
        <span className={style.selectArrow} aria-hidden="true">
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M13.729 5.575c1.304-1.074 3.27-.146 3.27 1.544v9.762c0 1.69-1.966 2.618-3.27 1.544l-5.927-4.881a2 2 0 0 1 0-3.088l5.927-4.88Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>
      {open ? (
        <div className={style.selectMenu} role="listbox" aria-labelledby={id}>
          {options.map((option, index) =>
            option.kind === "section" ? (
              <div key={`section-${option.label}-${index}`} className={style.selectSection}>
                {option.label}
              </div>
            ) : (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`${style.selectOption} ${value === option.value ? style.selectOptionActive : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Select;
