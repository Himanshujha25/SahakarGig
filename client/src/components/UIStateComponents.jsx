import React from 'react';
import { AlertTriangle, RefreshCw, Inbox, AlertCircle, X, CheckCircle2 } from 'lucide-react';

/**
 * Shimmer Loading Skeleton Components
 */
export function SkeletonCard({ count = 3, className = "" }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/50 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-outline-variant/40 rounded-md w-1/3" />
            <div className="h-5 bg-outline-variant/40 rounded-full w-1/4" />
          </div>
          <div className="h-6 bg-outline-variant/40 rounded-md w-3/4" />
          <div className="space-y-2 pt-2">
            <div className="h-3.5 bg-outline-variant/30 rounded-md w-full" />
            <div className="h-3.5 bg-outline-variant/30 rounded-md w-5/6" />
          </div>
          <div className="pt-3 border-t border-outline-variant/30 flex justify-between items-center">
            <div className="h-4 bg-outline-variant/40 rounded-md w-1/4" />
            <div className="h-8 bg-outline-variant/50 rounded-xl w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = "" }) {
  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-low animate-pulse ${className}`}>
      <div className="p-4 border-b border-outline-variant/40 bg-surface-container/60 flex items-center justify-between">
        <div className="h-4 bg-outline-variant/50 rounded-md w-1/4" />
        <div className="h-7 bg-outline-variant/40 rounded-lg w-20" />
      </div>
      <div className="divide-y divide-outline-variant/30">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-4 bg-outline-variant/35 rounded-md ${
                  c === 0 ? 'w-1/3' : c === cols - 1 ? 'w-16' : 'w-1/6'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4, className = "" }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/50 space-y-2 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-outline-variant/40 rounded-md w-1/2" />
            <div className="w-7 h-7 rounded-xl bg-outline-variant/40" />
          </div>
          <div className="h-7 bg-outline-variant/50 rounded-md w-2/3" />
          <div className="h-3 bg-outline-variant/30 rounded-md w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-outline-variant/40 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-outline-variant/40 rounded-md w-1/3" />
            <div className="h-3 bg-outline-variant/30 rounded-md w-2/3" />
          </div>
          <div className="h-7 bg-outline-variant/40 rounded-lg w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Error State Component with Retry Action
 */
export function ErrorState({
  title = "Failed to load data",
  message = "A temporary error occurred while fetching information. Please try again.",
  onRetry,
  className = ""
}) {
  return (
    <div className={`p-6 rounded-2xl bg-error-container/20 border border-error/30 text-on-surface text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
        <AlertTriangle size={24} />
      </div>
      <div>
        <h4 className="text-base font-bold text-on-surface">{title}</h4>
        <p className="text-xs text-on-surface-variant max-w-md mt-1">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-error text-on-error text-xs font-bold hover:opacity-90 transition active:scale-95 cursor-pointer shadow-sm"
        >
          <RefreshCw size={14} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}

/**
 * Empty State Component with Optional Action Button
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = "No records found",
  description = "There are no items to display at this time.",
  actionLabel,
  onAction,
  className = ""
}) {
  return (
    <div className={`p-8 sm:p-12 rounded-2xl bg-surface-container-low/60 border border-outline-variant/40 text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/70 border border-outline-variant/30">
        <Icon size={28} strokeWidth={1.7} />
      </div>
      <div className="max-w-md">
        <h4 className="text-base font-extrabold text-on-surface">{title}</h4>
        <p className="text-xs font-medium text-on-surface-variant mt-1 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:opacity-95 transition active:scale-95 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Reusable Confirmation Modal Dialog
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to proceed with this action?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary", // "primary" | "error" | "warning"
  loading = false,
  icon: Icon = AlertCircle
}) {
  if (!isOpen) return null;

  const buttonStyles = {
    primary: "bg-primary text-on-primary hover:opacity-95",
    error: "bg-error text-on-error hover:opacity-90",
    warning: "bg-amber-600 text-white hover:bg-amber-700"
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-surface border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              variant === 'error' ? 'bg-error/10 text-error' :
              variant === 'warning' ? 'bg-amber-500/10 text-amber-600' :
              'bg-primary/10 text-primary'
            }`}>
              <Icon size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-on-surface leading-tight">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">{description}</p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/40">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-on-surface-variant border border-outline-variant hover:bg-surface-container transition cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-60 ${buttonStyles[variant] || buttonStyles.primary}`}
          >
            {loading && <RefreshCw size={14} className="animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
