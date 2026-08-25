import { useEffect, useState } from 'react';
import socket from '../lib/socket';

export default function NotificationToasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onNotif(n) {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, ...n }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
    }
    socket.on('notification', onNotif);
    return () => socket.off('notification', onNotif);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="card-lg border-l-4 border-l-primary bg-white shadow-md">
          <p className="font-heading text-sm font-semibold text-on-surface">{t.type?.replace('_', ' ')}</p>
          <p className="text-sm text-on-surface-variant">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
