import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import socket from "../../lib/socket";
import Icon from "../../components/Icon";

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
    socket.connect();
    socket.on('booking:updated', (b) => { if (b._id === id) setBooking(b); });
    return () => {
      socket.off('booking:updated');
      socket.disconnect();
    };
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

  if (loading)
    return (
      <div className="mx-auto w-full max-w-2xl pt-lg">
        <div className="animate-pulse rounded-xl border border-outline-variant bg-surface p-6">
          <div className="mb-4 h-5 w-1/3 rounded bg-surface-variant"></div>
          <div className="h-4 w-2/3 rounded bg-surface-variant"></div>
        </div>
      </div>
    );
  if (!booking) return <p className="pt-lg font-body-md text-on-surface-variant">Booking not found.</p>;

  const currentIdx = STEPS.indexOf(booking.status);

  return (
    <div className="mx-auto w-full max-w-2xl pt-lg">
      <button
        onClick={() => navigate("/household/bookings")}
        className="mb-6 inline-flex items-center gap-1 font-heading text-sm font-semibold text-primary hover:text-primary-container"
      >
        <Icon name="arrow_back" className=" text-[18px]" />
        Back
      </button>

      <h1 className="mb-2 font-heading font-bold tracking-tight text-on-background text-2xl md:text-3xl">Tracking</h1>
      <p className="mb-6 font-body-md text-on-surface-variant">Live status of your service booking.</p>

      {/* Booking summary */}
      <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <div className="min-w-0">
          <p className="truncate font-body-md text-sm text-on-surface-variant">{booking.providerId?.userId?.name || "Provider"}</p>
          <p className="truncate font-heading text-lg font-bold text-on-surface">{booking.service}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-xl font-bold text-primary">₹{booking.price}</p>
          <p className="font-body-md text-xs capitalize text-on-surface-variant">{booking.status}</p>
        </div>
      </div>
    {/* Progress tracker */}
      <div className="mt-4 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <h2 className="mb-4 font-heading text-base font-semibold text-on-surface">Progress</h2>
        <div className="flex flex-col gap-2">
          {STEPS.map((step, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-heading text-sm font-bold ${
                    done ? "bg-secondary text-on-secondary" : active ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {done ? <Icon name="check" className=" text-[18px]" /> : i + 1}
                </div>
                <div className="flex-1">
                  <p className={`font-heading text-sm font-semibold capitalize ${i <= currentIdx ? "text-on-surface" : "text-on-surface-variant"}`}>
                    {step.replace("-", " ")}
                  </p>
                </div>
                {active && <Icon name="radio_button_checked" className=" text-primary" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat */}
      <div className="mt-4 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <h2 className="mb-3 font-heading text-base font-semibold text-on-surface">Chat</h2>
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
          {(booking.chat || []).length === 0 ? (
            <p className="font-body-md text-sm text-on-surface-variant">No messages yet.</p>
          ) : (
            booking.chat.map((c, i) => (
              <div key={i} className="rounded-lg bg-surface-container-low p-3">
                <p className="font-heading text-xs font-semibold text-on-surface-variant">{c.sender}</p>
                <p className="font-body-md text-sm text-on-surface">{c.message}</p>
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendChat} className="mt-3 flex gap-2">
          <input
            className="h-12 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message…"
          />
          <button type="submit" className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-primary text-primary hover:bg-primary-fixed-dim/40">
            <Icon name="send" className="" />
          </button>
        </form>
      </div>

      {booking.status === "completed" && booking.paymentStatus !== "paid" && (
        <button onClick={() => navigate(`/household/pay/${id}`)} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-heading font-semibold text-on-primary transition-all hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)]">
          <Icon name="payments" className=" text-[20px]" />
          {t("pay")}
        </button>
      )}

      {disputing ? (
        <form onSubmit={raiseDispute} className="mt-4 flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-5">
          <textarea
            className="h-24 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for dispute…"
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-error font-heading font-semibold text-on-error hover:bg-error/90">
              <Icon name="gavel" className=" text-[18px]" />
              {t("dispute")}
            </button>
            <button type="button" onClick={() => setDisputing(false)} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-primary font-heading font-semibold text-primary hover:bg-primary-fixed-dim/40">
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setDisputing(true)} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-primary font-heading font-semibold text-primary hover:bg-primary-fixed-dim/40">
          <Icon name="gavel" className=" text-[20px]" />
          {t("dispute")}
        </button>
      )}
    </div>
  );
}