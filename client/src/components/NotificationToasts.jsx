import { useEffect, useState } from 'react';
import socket from '../lib/socket';
import { toast } from '../lib/toast';
import { CheckCircle2, AlertCircle, Info, ShieldAlert, X } from 'lucide-react';

export default function NotificationToasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function addToast(n) {
      const id = n.id || Date.now() + Math.random();
      const newToast = { id, ...n };
      setToasts((t) => [...t, newToast]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 4500);
    }

    function onNotif(n) {
      addToast({
        type: n.type || 'info',
        title: n.title || (n.type ? n.type.replace('_', ' ') : 'Notification'),
        message: n.message || n.text || 'System update received.',
      });
    }

    socket.on('notification', onNotif);
    const unsubscribe = toast.subscribe(addToast);

    return () => {
      socket.off('notification', onNotif);
      unsubscribe();
    };
  }, []);

  const removeToast = (id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-80 sm:w-96 flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        const borderColor = isSuccess
          ? 'border-l-emerald-500'
          : isError
          ? 'border-l-rose-500'
          : isWarning
          ? 'border-l-amber-500'
          : 'border-l-primary';

        const iconColor = isSuccess
          ? 'text-emerald-500'
          : isError
          ? 'text-rose-500'
          : isWarning
          ? 'text-amber-500'
          : 'text-primary';

        const IconComponent = isSuccess
          ? CheckCircle2
          : isError
          ? AlertCircle
          : isWarning
          ? ShieldAlert
          : Info;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-surface/95 backdrop-blur-md border border-outline-variant/60 ${borderColor} border-l-4 shadow-lg text-on-surface transition-all animate-in slide-in-from-right duration-200`}
          >
            <div className={`mt-0.5 shrink-0 ${iconColor}`}>
              <IconComponent size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black tracking-tight text-on-surface capitalize">
                {t.title}
              </p>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5 leading-snug break-words">
                {t.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 text-on-surface-variant/60 hover:text-on-surface rounded-lg hover:bg-surface-container-high transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
