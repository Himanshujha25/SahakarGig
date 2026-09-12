import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Megaphone, Building2, CheckCheck, X, Trash2 } from 'lucide-react';
import api from '../lib/api';
import socket from '../lib/socket';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [clearing, setClearing] = useState(false);
  const btnRef = useRef(null);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, right: 0, bottom: 0, width: 36 });

  async function fetchAll() {
    try {
      const { data } = await api.get('/notifications').catch(() => ({ data: [] }));
      const coopMsgs = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]")
        .filter(m => !m.id?.startsWith("msg_seed_"));

      const formattedCoop = coopMsgs.map(m => ({
        _id: m.id,
        type: 'coop_message',
        title: m.title || 'Cooperative Announcement',
        message: m.body,
        sender: m.sender || 'Cooperative Agency',
        timestamp: m.timestamp || 'Just now',
        read: m.read || false,
        msgType: m.type
      }));

      const combined = [...formattedCoop, ...(Array.isArray(data) ? data : [])];
      setItems(combined);
    } catch { /* ignore */ }
  }

  async function clearAll() {
    if (items.length === 0 || clearing) return;
    setClearing(true);
    try {
      await api.delete('/notifications').catch(() => {});
      localStorage.setItem("sg_coop_messages", JSON.stringify([]));
      setItems(prev => prev.filter(n => n.type !== 'coop_message'));
      fetchAll();
    } catch { /* ignore */ }
    setClearing(false);
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    function onNotif(n) { setItems(prev => [{ ...n, read: false }, ...prev]); }
    function onCleared() {
      setItems(prev => prev.filter(n => n.type !== 'coop_message'));
      localStorage.setItem("sg_coop_messages", JSON.stringify([]));
      fetchAll();
    }
    function onReadAll() { setItems(prev => prev.map(n => ({ ...n, read: true }))); }
    socket.on('notification', onNotif);
    socket.on('notifications:cleared', onCleared);
    socket.on('notifications:read-all', onReadAll);
    return () => {
      clearInterval(interval);
      socket.off('notification', onNotif);
      socket.off('notifications:cleared', onCleared);
      socket.off('notifications:read-all', onReadAll);
    };
  }, []);

  async function markAll() {
    try {
      await api.patch('/notifications/read-all').catch(() => {});
      const coopMsgs = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
      const updatedCoop = coopMsgs.map(m => ({ ...m, read: true }));
      localStorage.setItem("sg_coop_messages", JSON.stringify(updatedCoop));
      setItems(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }

  function toggle(e) {
    if (e) e.stopPropagation();
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width });
    setOpen(true);
  }

  const unread = items.filter(n => !n.read).length;

  // Dropdown appears anchored to the bell,
  // clamped & flipped vertically/horizontally so it never overflows the viewport.
  const POP_W = 340;
  const POP_H_MAX = Math.min(window.innerHeight * 0.7, 480);
  const center = anchor.left + (anchor.width || 36) / 2;
  const dropLeft = Math.max(8, Math.min(center - POP_W / 2, window.innerWidth - POP_W - 8));

  const spaceBelow = window.innerHeight - anchor.bottom;
  const spaceAbove = anchor.top;

  // If opening below would overflow the screen or space is tight, open above
  const opensAbove = spaceBelow < 360 && spaceAbove > spaceBelow;

  let dropTop;
  let maxHeight;

  if (opensAbove) {
    maxHeight = Math.min(spaceAbove - 16, POP_H_MAX);
    dropTop = Math.max(8, anchor.top - 8 - maxHeight);
  } else {
    maxHeight = Math.min(spaceBelow - 16, POP_H_MAX);
    dropTop = (anchor.bottom || 0) + 8;
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={19} strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-4 px-1 rounded-full bg-error text-on-error text-[10px] font-extrabold flex items-center justify-center shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && createPortal(
        <>
          {/* Invisible click-catcher to close on outside tap */}
          <div className="fixed inset-0 z-[99999]" onClick={toggle} />
          {/* Floating premium dropdown anchored to the bell */}
          <div
            className="fixed z-[100000] w-[min(92vw,340px)] rounded-2xl border border-outline-variant/70 bg-surface shadow-[0_12px_48px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col animate-dropdown-in"
            style={{
              left: dropLeft,
              top: dropTop,
              maxHeight: `${maxHeight}px`,
              transformOrigin: `${Math.max(0, Math.min(((anchor.left + (anchor.width||36)/2) - dropLeft) / POP_W, 1)) * 100}% ${opensAbove ? 'bottom' : 'top'}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Center arrow pointing to the bell */}
            <div
              className={`absolute w-3.5 h-3.5 rotate-45 bg-surface ${
                opensAbove
                  ? "bottom-[-7px] border-r border-b border-outline-variant/70"
                  : "top-[-7px] border-l border-t border-outline-variant/70"
              }`}
              style={{ left: `${Math.max(12, Math.min(((anchor.left + (anchor.width||36)/2) - dropLeft) - 7, POP_W - 24))}px` }}
            />
            {/* Header */}
            <div className="relative flex items-center justify-between px-4 py-3 border-b border-outline-variant/60 bg-surface-container-low/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative">
                  <Bell size={16} className="text-primary" strokeWidth={2.2} />
                  {unread > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-error" />}
                </div>
                <h3 className="text-sm font-extrabold text-on-surface tracking-tight">Notifications</h3>
                {unread > 0 && (
                  <span className="text-[10px] font-bold text-on-primary bg-primary px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <button
                    onClick={clearAll}
                    disabled={clearing}
                    title="Clear all notifications"
                    className="flex items-center gap-1 text-[10.5px] font-bold text-on-surface-variant hover:text-error px-2 h-7 rounded-lg hover:bg-error-container/40 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Trash2 size={12} /> <span className="hidden sm:inline">Clear all</span>
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center">
                    <Building2 size={22} className="text-on-surface-variant/50" strokeWidth={1.6} />
                  </div>
                  <p className="text-sm font-extrabold text-on-surface">All caught up</p>
                  <p className="text-xs text-on-surface-variant">New cooperative & platform alerts will show up here.</p>
                </div>
              ) : (
                items.map((n, i) => (
                  <div
                    key={n._id || i}
                    className={`px-4 py-3 border-b border-outline-variant/50 last:border-b-0 transition-colors ${
                      n.read ? 'hover:bg-surface-container-low' : 'bg-primary-container/25 border-l-[3px] border-l-[#84cc16] hover:bg-primary-container/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`inline-flex items-center text-[9.5px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full truncate ${
                        n.type === 'coop_message' ? 'bg-[#84cc16]/15 text-[#4d7c0f]' : 'bg-primary-container/60 text-primary'
                      }`}>
                        {n.sender || n.title || 'Alert'}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/70 font-semibold shrink-0">{n.timestamp}</span>
                    </div>
                    <h4 className="text-[13px] font-extrabold text-on-surface leading-snug">{n.title || n.type?.replace(/_/g, ' ')}</h4>
                    <p className="text-xs font-medium text-on-surface-variant/90 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                    {!n.read && (
                      <button
                        onClick={markAll}
                        className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-bold text-primary hover:underline cursor-pointer transition-colors"
                      >
                        <CheckCheck size={12} /> Mark read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
