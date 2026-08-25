import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

const statusPillClass = {
  requested: "bg-surface-container-high text-on-surface-variant",
  accepted: "bg-primary-fixed-dim text-primary",
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

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;
  if (!booking) return <p className="font-body-md text-on-surface-variant">Booking not found.</p>;

  const b = booking;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate("/provider")}
        className="flex items-center gap-1 font-heading text-sm font-semibold text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to jobs
      </button>

      <div className="card-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-headline-md text-on-surface">
                {b.householdId?.name || "Household"}
              </h1>
              {b.isEmergency && (
                <span className="status-pill bg-error-container text-on-error-container">
                  {t("emergency")}
                </span>
              )}
            </div>
            <p className="font-body-md text-on-surface-variant">{b.service}</p>
          </div>
          <span className={`status-pill ${statusPillClass[b.status] || ""}`}>{b.status}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 font-body-md text-on-surface">
          <div>
            <p className="text-on-surface-variant">Price</p>
            <p className="font-heading font-semibold">₹{b.price}</p>
          </div>
          <div>
            <p className="text-on-surface-variant">Scheduled</p>
            <p className="font-heading font-semibold">
              {b.scheduledTime ? new Date(b.scheduledTime).toLocaleString() : "—"}
            </p>
          </div>
          {b.address && (
            <div className="col-span-2">
              <p className="text-on-surface-variant">Address</p>
              <p className="font-heading font-semibold">{b.address}</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {b.status === "requested" && (
            <>
              <button className="btn-primary" disabled={busy} onClick={accept}>
                {t("accept")}
              </button>
              <button className="btn-danger" disabled={busy} onClick={cancel}>
                {t("reject")}
              </button>
            </>
          )}
          {b.status === "accepted" && (
            <button className="btn-primary" disabled={busy} onClick={complete}>
              <span className="material-symbols-outlined mr-1 text-[18px]">task_alt</span>
              {t("complete")}
            </button>
          )}
          {(b.status === "accepted" || b.status === "requested") && (
            <button className="btn-secondary" disabled={busy} onClick={cancel}>
              {t("cancel")}
            </button>
          )}
        </div>
      </div>

      <div className="card-lg flex flex-col gap-3">
        <h2 className="font-headline-md text-headline-md text-on-surface">Chat</h2>
        <div className="flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="font-body-md text-sm text-on-surface-variant">No messages yet.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className="rounded-lg bg-surface-container-low p-3">
              <p className="font-body-md text-on-surface">{m.message}</p>
              <p className="mt-1 font-body-md text-xs text-on-surface-variant">
                {m.from} · {m.at ? new Date(m.at).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            placeholder="Type a message…"
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
          />
          <button className="btn-primary" onClick={sendChat}>
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
