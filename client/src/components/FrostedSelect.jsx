import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/* Reusable frosted-glass dropdown — same look on every household page.
   Props: value, onChange(value), options [{ value, label, Icon? }],
   buttonClass?, placeholder? */
export default function FrostedSelect({ value, onChange, options = [], buttonClass = "", placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full h-10 px-3 rounded-xl border text-sm font-semibold text-on-surface flex items-center justify-between gap-2 backdrop-blur-xl transition-all cursor-pointer ${buttonClass} ${
          open
            ? "border-primary/40 bg-primary/10"
            : "border-outline-variant bg-surface-container-lowest/70 hover:border-primary/40"
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span className={`w-6 h-6 rounded-full bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <ChevronDown size={13} strokeWidth={2.5} />
        </span>
      </button>
      {open && (
        <div className="sg-dropdown-list absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-outline-variant/80 overflow-hidden animate-dropdown-in p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
          {options.map((o) => {
            const sel = String(o.value) === String(value);
            const OptIcon = o.Icon;
            return (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-left transition-all cursor-pointer border ${
                  sel
                    ? "bg-primary/15 border-primary/30 text-on-surface backdrop-blur-xl"
                    : "border-transparent text-on-surface hover:bg-surface-container-low"
                }`}
              >
                {OptIcon && <OptIcon size={14} className={sel ? "text-primary" : "text-on-surface-variant"} />}
                <span className="flex-1 truncate">{o.label}</span>
                {sel && <Check size={14} strokeWidth={3} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
