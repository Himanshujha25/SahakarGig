import { useEffect, useState } from "react";
import { AlertTriangle, HelpCircle, Info, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // 'warning' | 'danger' | 'info'
  isPrompt = false,
  promptPlaceholder = "Enter details...",
  defaultValue = "",
}) {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const typeIcons = {
    warning: <AlertTriangle size={24} className="text-amber-500" />,
    danger: <AlertTriangle size={24} className="text-rose-500" />,
    info: <Info size={24} className="text-teal-500" />,
  };

  const confirmBtnStyles = {
    warning: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20",
    info: "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20",
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    if (isPrompt) {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg p-1 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 shrink-0">
            {typeIcons[type] || <HelpCircle size={24} className="text-teal-500" />}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>

        {isPrompt && (
          <div className="pt-2">
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={promptPlaceholder}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer ${confirmBtnStyles[type] || confirmBtnStyles.info}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
