import { useState, useRef, useEffect, Children, isValidElement } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function CustomSelect({
  value,
  defaultValue,
  onChange,
  options: propOptions,
  children,
  placeholder = "Select option...",
  disabled = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  name,
  id,
  size = "md", // 'sm' | 'md' | 'lg'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options from props or children (<option value="...">Label</option>)
  const parsedOptions = (() => {
    if (Array.isArray(propOptions) && propOptions.length > 0) {
      return propOptions.map((opt) =>
        typeof opt === "object" && opt !== null
          ? { value: opt.value ?? opt.id ?? opt, label: opt.label ?? opt.name ?? String(opt.value ?? opt), disabled: !!opt.disabled, icon: opt.icon }
          : { value: opt, label: String(opt), disabled: false }
      );
    }

    if (children) {
      const opts = [];
      Children.forEach(children, (child) => {
        if (isValidElement(child)) {
          if (child.type === "option" || child.props?.value !== undefined) {
            opts.push({
              value: child.props.value !== undefined ? child.props.value : child.props.children,
              label: child.props.children || String(child.props.value),
              disabled: !!child.props.disabled,
            });
          } else if (child.props?.options) {
            // Handle optgroup or nested options if any
            Children.forEach(child.props.children, (subChild) => {
              if (isValidElement(subChild)) {
                opts.push({
                  value: subChild.props.value !== undefined ? subChild.props.value : subChild.props.children,
                  label: subChild.props.children || String(subChild.props.value),
                  disabled: !!subChild.props.disabled,
                });
              }
            });
          }
        }
      });
      if (opts.length > 0) return opts;
    }

    return [];
  })();

  const selectedOption = parsedOptions.find((opt) => String(opt.value) === String(value)) ||
    parsedOptions.find((opt) => String(opt.value) === String(defaultValue));

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  function handleSelect(option) {
    if (option.disabled || disabled) return;
    setIsOpen(false);
    if (onChange) {
      // Pass synthetic event for compatibility with standard form handlers
      const event = {
        target: {
          name: name || id || "",
          value: option.value,
        },
      };
      onChange(event);
    }
  }

  // Size styling variants
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-3.5 py-2.5 text-xs sm:text-sm rounded-xl gap-2",
    lg: "px-4 py-3 text-sm sm:text-base rounded-2xl gap-2.5",
  }[size] || "px-3.5 py-2.5 text-xs sm:text-sm rounded-xl gap-2";

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left font-sans ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 shadow-xs transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${
          isOpen ? "ring-2 ring-teal-500/40 border-teal-500/80" : ""
        } ${buttonClassName}`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={!selectedOption ? "text-slate-400 dark:text-slate-500" : ""}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-teal-600 dark:text-teal-400" : ""
          }`}
        />
      </button>

      {/* Animated Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto z-[9999] rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${menuClassName}`}
        >
          {parsedOptions.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-slate-400 text-center">No options available</div>
          ) : (
            parsedOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-lg font-medium transition-all text-left cursor-pointer ${
                    isSelected
                      ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold"
                      : opt.disabled
                      ? "opacity-40 cursor-not-allowed text-slate-400"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span className="truncate flex items-center gap-2">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && <Check size={15} className="shrink-0 text-teal-600 dark:text-teal-400" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
