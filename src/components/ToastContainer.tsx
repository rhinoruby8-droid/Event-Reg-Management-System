import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          );

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 transition-all"
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900">{toast.title}</div>
              {toast.description && (
                <div className="text-[11px] text-slate-500 mt-0.5">{toast.description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
