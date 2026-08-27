import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import socket from "../../lib/socket";
import Icon from "../../components/Icon";

const statusPillClass = {
  requested: "bg-surface-container-high text-on-surface-variant",
  accepted: "bg-primary-fixed-dim text-primary",
  "in-progress": "bg-[#e8edff] text-[#00288e]",
  completed: "bg-secondary-container text-on-secondary-container",
  cancelled: "bg-error-container text-on-error-container",
  disputed: "bg-tertiary-container text-on-tertiary-container",
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState("");
  const [messages, setMessages] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/bookings/${id}`);
      setBooking(data);
      setMessages(data.chat || []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    socket.on('booking:updated', (b) => {
      const incoming = b?.booking || b;
      if (incoming?._id?.toString() === id || incoming?._id === id) {
        setBooking(incoming);
        setMessages(incoming.chat || []);
      }
    });
    socket.on('booking:chat', ({ bookingId, message }) => {
      if (bookingId?.toString() === id) setMessages(prev => [...prev, message]);
    });
    return () => {
      socket.off('booking:updated');
      socket.off('booking:chat');
    };
  }, [load]);

  async function accept() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/accept`);
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function markInProgress() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/status`, { status: 'in-progress' });
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function complete() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/status`, { status: "completed" });
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/cancel`);
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function sendChat() {
    if (!chat.trim()) return;
    try {
      const { data } = await api.post(`/bookings/${id}/chat`, { message: chat });
      setMessages(data.chat || []);
      setChat("");
    } catch {
      // ignore
    }
  }

  if (loading)
    return (
      <div className="mx-auto w-full max-w-2xl pt-lg">
        <div className="animate-pulse rounded-xl border border-outline-variant bg-surface p-6">
          <div className="mb-4 h-5 w-1/3 rounded bg-surface-variant"></div>
          <div className="mb-3 h-4 w-2/3 rounded bg-surface-variant"></div>
          <div className="h-4 w-1/2 rounded bg-surface-variant"></div>
        </div>
      </div>
    );
  if (!booking) return <p className="pt-lg font-body-md text-on-surface-variant">Booking not found.</p>;

  const b = booking;

  return (
    <div className="mx-auto w-full max-w-2xl pt-lg">
      <button
        onClick={() => navigate("/provider")}
        className="mb-6 inline-flex items-center gap-1 font-heading text-sm font-semibold text-primary hover:text-primary-container"
      >
        <Icon name="arrow_back" className=" text-[18px]" />
        Back to jobs
      </button>

      <h1 className="mb-2 font-heading font-bold tracking-tight text-on-background text-2xl md:text-3xl">
        Job Details
      </h1>
      <p className="mb-6 font-body-md text-on-surface-variant">Review the request and take action.</p>

      {/* Job summary card */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-6 shadow-xs">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-outline-variant/40">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="truncate font-heading text-xl font-bold text-on-surface">
                {b.householdId?.name || "Customer Request"}
              </h2>
              {b.isEmergency && (
                <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-3 py-0.5 text-xs font-bold text-on-error-container">
                  <Icon name="local_fire_department" className="text-[14px]" />
                  Emergency Dispatch
                </span>
              )}
            </div>
            <p className="text-[14px] text-on-surface-variant font-medium">Service Category: <strong className="text-on-surface">{b.targetCategory || b.service}</strong></p>
          </div>
          <span className={`inline-flex shrink-0 rounded-full px-3.5 py-1 text-xs font-bold capitalize ${statusPillClass[b.status] || "bg-surface-container-high text-on-surface-variant"}`}>
            {b.status}
          </span>
        </div>

        {/* Customer Contact & Delivery Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#f8f9ff] border border-[#00288e]/15 p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Customer Phone</p>
            <p className="text-[15px] font-bold text-[#00288e]">
              {b.householdId?.phone || "+91 98765 43210"}
            </p>
          </div>

          <div className="rounded-xl bg-[#f8f9ff] border border-[#00288e]/15 p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Offered Payout Rate</p>
            <p className="text-[18px] font-extrabold text-[#00288e]">₹{b.price} <span className="text-[12px] font-normal text-on-surface-variant">/ hr</span></p>
          </div>

          <div className="rounded-xl bg-[#f8f9ff] border border-[#00288e]/15 p-4 space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Customer Address & Locality</p>
              {b.coordinates && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${b.coordinates.lat},${b.coordinates.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11.5px] font-bold text-[#00288e] hover:underline inline-flex items-center gap-1"
                >
                  <Icon name="navigation" className="text-[12px]" /> Navigate on Maps ↗
                </a>
              )}
            </div>
            <p className="text-[14px] font-semibold text-on-surface">
              {b.locationText || b.address || "Indiranagar, Ghaziabad, Uttar Pradesh"}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-500/20 p-4 sm:col-span-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon name="shield" className="text-emerald-700 text-[18px]" />
              <div>
                <p className="text-[13px] font-bold text-emerald-900">Razorpay Escrow Protected</p>
                <p className="text-[12px] text-emerald-800">Funds of ₹{b.price} held safely in escrow. Released upon completion.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-700 text-white">Escrow Secured</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-wrap gap-3">
          {b.status === "requested" && (
            <>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#00288e] px-6 font-heading font-bold text-white hover:bg-[#173bab] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 cursor-pointer shadow-sm"
                disabled={busy}
                onClick={accept}
              >
                <Icon name="check" className="text-[18px]" />
                Accept Job Request Now
              </button>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-error px-6 font-heading font-bold text-on-error hover:bg-error/90 disabled:opacity-60 cursor-pointer"
                disabled={busy}
                onClick={cancel}
              >
                <Icon name="close" className="text-[18px]" />
                Reject
              </button>
            </>
          )}
          {b.status === 'accepted' && (
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#00288e] px-6 font-heading font-bold text-white hover:bg-[#173bab] transition-all duration-200 disabled:opacity-60 cursor-pointer shadow-sm"
              disabled={busy}
              onClick={markInProgress}
            >
              <Icon name="directions_run" className="text-[18px]" />
              Mark In Progress
            </button>
          )}
          {b.status === 'in-progress' && (
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 font-heading font-bold text-white hover:bg-emerald-800 transition-all duration-200 disabled:opacity-60 cursor-pointer shadow-sm"
              disabled={busy}
              onClick={complete}
            >
              <Icon name="task_alt" className="text-[18px]" />
              Mark Job Completed (Release ₹{b.price} Payout)
            </button>
          )}
          {(b.status === 'in-progress' || b.status === 'accepted') && (
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-6 font-heading font-semibold text-on-surface hover:bg-surface-container disabled:opacity-60 cursor-pointer"
              disabled={busy}
              onClick={cancel}
            >
              Cancel Job
            </button>
          )}
        </div>
      </div>

      {/* Chat card */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <h2 className="font-heading text-base font-semibold text-on-surface">Chat</h2>
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 && (
            <p className="font-body-md text-sm text-on-surface-variant">No messages yet.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className="rounded-lg bg-surface-container-low p-3">
              <p className="font-body-md text-sm text-on-surface">{m.message}</p>
              <p className="mt-1 font-body-md text-xs text-on-surface-variant">
                {m.from} · {m.at ? new Date(m.at).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="h-12 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            placeholder="Type a message…"
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
          />
          <button
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-[#e8edff] font-heading text-[#00288e] hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)] active:scale-[0.95] transition-all duration-200"
            onClick={sendChat}
          >
            <Icon name="send" className="" />
          </button>
        </div>
      </div>
    </div>
  );
}