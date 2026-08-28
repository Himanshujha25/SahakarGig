import { useEffect, useRef, useState } from 'react';
import { Bell, Megaphone, Building2, ShieldAlert, Sparkles, CheckCheck, X } from 'lucide-react';
import api from '../lib/api';
import socket from '../lib/socket';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

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

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    function onNotif(n) {
      setItems(prev => [{ ...n, read: false }, ...prev]);
    }
    socket.on('notification', onNotif);
    return () => {
      clearInterval(interval);
      socket.off('notification', onNotif);
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

  const unread = items.filter(n => !n.read).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={19} strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-4 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center px-1 shadow-sm animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Fixed Viewport Overlay Modal (Never clipped by sidebars or overflow containers) ── */}
      {open && (
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-alert-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-[#84cc16]" />
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">Agency Alerts & Notifications</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Cooperative messages & platform updates</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button
                    onClick={markAll}
                    className="text-xs font-bold text-[#84cc16] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
              {items.length === 0 ? (
                <div className="px-4 py-12 text-center space-y-2">
                  <Building2 size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-extrabold text-slate-700">No agency alerts or messages yet</p>
                  <p className="text-xs text-slate-400">Broadcasts sent by your cooperative society will appear here.</p>
                </div>
              ) : items.map((n, i) => (
                <div
                  key={n._id || i}
                  className={`p-4 rounded-2xl space-y-1.5 transition-all ${
                    n.read
                      ? 'bg-white hover:bg-slate-50'
                      : n.type === 'coop_message'
                      ? 'bg-[#f7fee7] border-l-4 border-l-[#84cc16] shadow-xs'
                      : 'bg-slate-50 border-l-4 border-l-[#1e6b65] shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      n.type === 'coop_message' ? 'bg-[#84cc16]/20 text-[#4d7c0f]' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {n.sender || n.title || 'Cooperative Alert'}
                    </span>
                    <span className="text-[10.5px] text-slate-400 font-semibold">{n.timestamp}</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{n.title || n.type?.replace(/_/g, ' ')}</h4>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

