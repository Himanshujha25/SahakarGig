import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../lib/api';
import socket from '../lib/socket';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  async function fetchAll() {
    try {
      const { data } = await api.get('/notifications');
      setItems(data);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchAll();
    function onNotif(n) {
      setItems(prev => [{ ...n, read: false }, ...prev]);
    }
    socket.on('notification', onNotif);
    return () => socket.off('notification', onNotif);
  }, []);

  // close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAll() {
    try {
      await api.patch('/notifications/read-all');
      setItems(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }

  const unread = items.filter(n => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-outline-variant bg-surface shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/60">
            <p className="text-[13px] font-bold text-on-surface">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-[11px] font-semibold text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/40">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-on-surface-variant">No notifications</p>
            ) : items.map((n, i) => (
              <div key={n._id || i} className={`px-4 py-3 ${n.read ? '' : 'bg-[#e8edff]/50'}`}>
                <p className="text-[12px] font-semibold text-on-surface capitalize">{n.type?.replace(/_/g, ' ')}</p>
                <p className="text-[12px] text-on-surface-variant mt-0.5">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
