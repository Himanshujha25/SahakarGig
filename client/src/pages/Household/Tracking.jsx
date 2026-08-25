import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

const STEPS = ["requested", "accepted", "in-progress", "completed"];

export default function Tracking() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [disputing, setDisputing] = useState(false);

  const load = () => {
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sendChat = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    await api.post(`/bookings/${id}/chat`, { message });
    setMessage("");
    load();
  };

  const raiseDispute = async (e) => {
    e.preventDefault();
    await api.patch(`/bookings/${id}/dispute`, { reason });
    setReason("");
    setDisputing(false);
    load();
  };

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;
  if (!booking) return <p className="font-body-md text-on-surface-variant">Booking not found.</p>;

  const currentIdx = STEPS.indexOf(booking.status);

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate("/household/bookings")}
        className="flex items-center gap-1 font-heading text-sm font-semibold text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back
      </button>

      <h1 className="font-headline-lg text-headline-lg text-on-surface">Tracking</h1>

      <div className="card flex flex-col gap-1">
        <p className="font-body-md text-on-surface-variant">{booking.providerId?.userId?.name || "Provider"}</p>
        <p className="font-headline-md text-headline-md text-on-surface">{booking.service}</p>
        <p className="font-body-md text-sm text-on-surface-variant">₹{booking.price}</p>
      </div>

      <div className="card flex flex-col gap-4">
        {STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-heading text-sm font-bold ${
                  done
                    ? "bg-secondary text-on-secondary"
                    : active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {done ? (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`font-headline text-sm font-semibold capitalize ${
                  i <= currentIdx ? "text-on-surface" : "text-on-surface-variant"
                }`}
              >
                {step.replace("-", " ")}
              </span>
            </div>
          );
        })}
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="font-headline-md text-headline-md text-on-surface">Chat</h2>
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
          {(booking.chat || []).length === 0 ? (
            <p className="font-body-md text-sm text-on-surface-variant">No messages yet.</p>
          ) : (
            booking.chat.map((c, i) => (
              <div key={i} className="rounded-lg bg-surface-container-low p-2">
                <p className="font-heading text-xs font-semibold text-on-surface-variant">{c.sender}</p>
                <p className="font-body-md text-sm text-on-surface">{c.message}</p>
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendChat} className="flex gap-2">
          <input
            className="input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message…"
          />
          <button type="submit" className="btn-secondary px-4">
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>

      {booking.status === "completed" && booking.paymentStatus !== "paid" && (
        <button onClick={() => navigate(`/household/pay/${id}`)} className="btn-primary w-full">
          <span className="material-symbols-outlined mr-1 text-[18px]">payments</span>
          {t("pay")}
        </button>
      )}

      {disputing ? (
        <form onSubmit={raiseDispute} className="card flex flex-col gap-3">
          <textarea
            className="input h-24"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for dispute…"
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-danger flex-1">
              {t("dispute")}
            </button>
            <button type="button" onClick={() => setDisputing(false)} className="btn-secondary flex-1">
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setDisputing(true)} className="btn-secondary w-full">
          <span className="material-symbols-outlined mr-1 text-[18px]">gavel</span>
          {t("dispute")}
        </button>
      )}
    </div>
  );
}
