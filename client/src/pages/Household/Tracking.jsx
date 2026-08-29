import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import socket from "../../lib/socket";
import Icon from "../../components/Icon";
import FileUpload from "../../components/FileUpload";

const STEPS = ["requested", "accepted", "in-progress", "completed"];
const DISPUTE_CATEGORIES = [
  "Service not completed",
  "Quality not as expected",
  "Provider no-show / late",
  "Overcharged",
  "Damaged property",
  "Unprofessional behaviour",
  "Other",
];

export default function Tracking() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState(DISPUTE_CATEGORIES[0]);
  const [evidence, setEvidence] = useState([]);
  const [disputing, setDisputing] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeError, setDisputeError] = useState("");
  // Reschedule state
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleSlots, setRescheduleSlots] = useState(null);
  const [reschedDay, setReschedDay] = useState(0);
  const [reschedHour, setReschedHour] = useState(null);
  const [reschedError, setReschedError] = useState("");
  const [reschedSubmitting, setReschedSubmitting] = useState(false);
  const [livePos, setLivePos] = useState(null);

  const load = () => {
    api
      .get(`/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();
    load();
    socket.on('booking:updated', (b) => { if (b._id === id || b._id?.toString() === id) setBooking(b); });
    socket.on('booking:chat', ({ bookingId, message }) => {
      if (bookingId?.toString() === id) setBooking(prev => prev ? { ...prev, chat: [...(prev.chat || []), message] } : prev);
    });
    socket.on('provider:location_update', ({ bookingId, lat, lng, at }) => {
      if (bookingId?.toString() === id) setLivePos({ lat, lng, at: at || Date.now() });
    });
    return () => {
      socket.off('booking:updated');
      socket.off('booking:chat');
      socket.off('provider:location_update');
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
    if (!reason.trim()) { setDisputeError("Please describe the issue."); return; }
    setSubmittingDispute(true);
    setDisputeError("");
    try {
      await api.patch(`/bookings/${id}/dispute`, { reason, category, evidence });
      setReason("");
      setCategory(DISPUTE_CATEGORIES[0]);
      setEvidence([]);
      setDisputing(false);
      load();
    } catch (err) {
      setDisputeError(err?.response?.data?.message || "Could not raise the dispute. Please try again.");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const withdrawDispute = async () => {
    if (!window.confirm("Withdraw this dispute? The booking will return to Completed.")) return;
    try {
      await api.patch(`/bookings/${id}/withdraw-dispute`);
      load();
    } catch { /* best-effort */ }
  };

  // Household cancels only while the request is still open (before a worker accepts).
  const cancelBooking = async () => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await api.patch(`/bookings/${id}/cancel`);
      load();
    } catch (err) {
      alert(err?.response?.data?.message || "Could not cancel the booking. Please try again.");
    }
  };

  // ── Reschedule ──
  const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const openReschedule = async () => {
    setRescheduling(true);
    setReschedError("");
    setReschedHour(null);
    setReschedDay(0);
    try {
      const providerId = booking?.providerId?._id;
      if (!providerId) return;
      const { data } = await api.get(`/providers/${providerId}/slots`);
      setRescheduleSlots(data);
    } catch {
      setRescheduleSlots(null);
      setReschedError("Could not load the provider's availability.");
    }
  };

  const reschedDays = (() => {
    const out = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      out.push({
        date: x,
        label: i === 0 ? "Today" : DAY_KEYS[x.getDay()],
        dayNum: x.getDate(),
        key: `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`,
      });
    }
    return out;
  })();

  const reschedTakenHours = (() => {
    const s = new Set();
    (rescheduleSlots?.bookings || []).forEach((b) => {
      if (!b.scheduledTime) return;
      const x = new Date(b.scheduledTime);
      s.add(`${x.getFullYear()}-${x.getMonth()}-${x.getDate()}|${x.getHours()}:00`);
    });
    return s;
  })();

  const reschedDayHours = (() => {
    const day = reschedDays[reschedDay];
    if (!day) return [];
    const slot = (rescheduleSlots?.availabilitySlots || []).find((s) => s.day === DAY_KEYS[day.date.getDay()]);
    if (!slot || !slot.from || !slot.to) return [];
    const [fh] = slot.from.split(":").map(Number);
    const [th] = slot.to.split(":").map(Number);
    if (Number.isNaN(fh) || Number.isNaN(th)) return [];
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const hours = [];
    for (let h = fh; h < th; h++) {
      const time = `${String(h).padStart(2, "0")}:00`;
      const isPast = day.key === todayKey && h <= now.getHours();
      const isTaken = reschedTakenHours.has(`${day.key}|${time}`);
      hours.push({ time, available: !isPast && !isTaken });
    }
    return hours;
  })();

  const submitReschedule = async (e) => {
    e.preventDefault();
    setReschedError("");
    if (!reschedHour) { setReschedError("Please choose an available time slot."); return; }
    const day = reschedDays[reschedDay];
    const scheduledTime = new Date(
      day.date.getFullYear(), day.date.getMonth(), day.date.getDate(),
      Number(reschedHour.split(":")[0]), 0, 0
    ).toISOString();
    setReschedSubmitting(true);
    try {
      await api.patch(`/bookings/${id}/reschedule`, { scheduledTime });
      setRescheduling(false);
      setReschedHour(null);
      load();
    } catch (err) {
      setReschedError(err?.response?.data?.message || "Could not reschedule. Please try again.");
    } finally {
      setReschedSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="animate-pulse rounded-xl border border-outline-variant bg-surface p-6">
          <div className="mb-4 h-5 w-1/3 rounded bg-surface-variant"></div>
          <div className="h-4 w-2/3 rounded bg-surface-variant"></div>
        </div>
      </div>
    );
  if (!booking) return <p className="p-8 font-body-md text-on-surface-variant text-center">Booking not found.</p>;

  const currentIdx = STEPS.indexOf(booking.status);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {booking.isEmergency && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-emergency text-[10px] font-bold">
                <Icon name="local_fire_department" className="text-[12px]" /> Emergency
              </span>
            )}
            {booking.recurrence?.enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-accepted text-[10px] font-bold capitalize">
                <Icon name="repeat" className="text-[12px]" /> Recurring · {booking.recurrence.freq}
              </span>
            )}
            {booking.groupBooking?.enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full badge-pending text-[10px] font-bold">
                <Icon name="people" className="text-[12px]" /> {booking.groupBooking.groupName || "Group"} · {booking.groupBooking.memberCount} members
              </span>
            )}
          </div>
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

      {/* Live location */}
      {["accepted", "in-progress"].includes(booking.status) && (
        <div className="mt-4 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-on-surface">Live Location</h2>
            {livePos ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-2.5 py-1 font-heading text-xs font-bold text-error">
                <span className="h-2 w-2 animate-pulse rounded-full bg-error"></span>
                LIVE
              </span>
            ) : (
              <span className="font-heading text-xs text-on-surface-variant">waiting for GPS…</span>
            )}
          </div>
          {livePos ? (
            <div className="flex flex-col gap-3">
              <iframe
                title="Provider live location"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${livePos.lng - 0.005}%2C${livePos.lat - 0.005}%2C${livePos.lng + 0.005}%2C${livePos.lat + 0.005}&layer=mapnik&marker=${livePos.lat}%2C${livePos.lng}`}
                className="h-48 w-full rounded-lg border border-outline-variant"
                loading="lazy"
              />
              <div className="flex items-center justify-between font-body-md text-sm text-on-surface-variant">
                <span>
                  {livePos.lat.toFixed(5)}, {livePos.lng.toFixed(5)}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${livePos.lat},${livePos.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-heading font-semibold text-primary hover:underline"
                >
                  Open in Maps
                </a>
              </div>
            </div>
          ) : (
            <p className="font-body-md text-sm text-on-surface-variant">
              Location updates will appear here once the provider shares their GPS signal.
            </p>
          )}
        </div>
      )}

      {/* Chat */}
      <div className="mt-4 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <h2 className="mb-3 font-heading text-base font-semibold text-on-surface">Chat</h2>
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
          {(booking.chat || []).length === 0 ? (
            <p className="font-body-md text-sm text-on-surface-variant">No messages yet.</p>
          ) : (
            booking.chat.map((c, i) => {
              const senderId = c.sender?._id?.toString() || c.sender?.toString() || "";
              const mine = senderId === user?.id?.toString();
              return (
                <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 ${mine ? "bg-primary text-on-primary" : "bg-surface-container-low border border-outline-variant"}`}>
                    <p className={`font-heading text-[11px] font-semibold ${mine ? "text-on-primary/75" : "text-primary"}`}>
                      {mine ? "You" : (c.sender?.name || "Provider")}
                    </p>
                    <p className={`font-body-md text-sm ${mine ? "text-on-primary" : "text-on-surface"}`}>{c.message}</p>
                  </div>
                </div>
              );
            })
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

      {booking.status === "completed" && booking.paymentStatus !== "paid" && booking.paymentStatus !== "refunded" && (
        <button onClick={() => navigate(`/household/pay/${id}`)} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary-container font-heading font-semibold text-on-primary-container hover:border-primary hover:bg-primary hover:text-on-primary active:scale-[0.98] transition-all duration-200">
          <Icon name="payments" className=" text-[20px]" />
          {t("pay")}
        </button>
      )}

      {/* Refunded status banner */}
      {booking.paymentStatus === "refunded" && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-secondary/30 bg-secondary-container/30 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-on-secondary">
              <Icon name="account_balance_wallet" className="text-[18px]" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-on-surface">Booking refunded</p>
              <p className="font-body-md text-sm text-on-surface-variant">
                The full amount was credited back to your wallet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disputed status banner */}
      {booking.status === "disputed" && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-error/30 bg-error-container/30 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-error text-on-error">
              <Icon name="gavel" className="text-[18px]" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-on-surface">Dispute under review</p>
              <p className="font-body-md text-sm text-on-surface-variant">
                {booking.disputeCategory ? `${booking.disputeCategory} — ` : ""}Your case has been sent to the cooperative for review.
              </p>
            </div>
          </div>
          {booking.issue && (
            <p className="rounded-lg bg-surface/70 px-3 py-2 font-body-md text-sm text-on-surface">"{booking.issue}"</p>
          )}
          <button
            onClick={withdrawDispute}
            className="w-fit inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 font-heading text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Icon name="undo" className="text-[16px]" />
            Withdraw dispute
          </button>
        </div>
      )}

      {booking.status !== "cancelled" && booking.status !== "disputed" && !disputing && (
        <button onClick={() => setDisputing(true)} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-primary font-heading font-semibold text-primary hover:bg-primary-fixed-dim/40 active:scale-[0.99] transition-all duration-200">
          <Icon name="gavel" className=" text-[20px]" />
          {t("dispute")}
        </button>
      )}

      {(booking.status === "requested" || booking.status === "accepted") && !rescheduling && !disputing && (
        <button onClick={openReschedule} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-primary font-heading font-semibold text-primary hover:bg-primary-fixed-dim/40 active:scale-[0.99] transition-all duration-200">
          <Icon name="event_available" className=" text-[20px]" />
          Reschedule
        </button>
      )}

      {/* Household can cancel a booking that no worker has accepted yet */}
      {booking.status === "requested" && !rescheduling && !disputing && (
        <button onClick={cancelBooking} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-error/40 bg-error-container/20 font-heading font-semibold text-error hover:bg-error hover:text-on-error active:scale-[0.99] transition-all duration-200">
          <Icon name="close" className=" text-[20px]" />
          Cancel Booking
        </button>
      )}

      {rescheduling && (
        <form onSubmit={submitReschedule} className="mt-4 flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-5">
          <h3 className="font-heading text-base font-semibold text-on-surface">Reschedule this booking</h3>
          <p className="font-body-md text-sm text-on-surface-variant">Pick a new slot from the provider's availability.</p>

          {/* Day selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {reschedDays.map((d, i) => (
              <button
                key={d.key}
                type="button"
                onClick={() => { setReschedDay(i); setReschedHour(null); }}
                className={`flex flex-col items-center rounded-xl border px-3 py-2 transition-all ${i === reschedDay ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary/40"}`}
              >
                <span className="text-[11px] font-semibold">{d.label}</span>
                <span className="text-[16px] font-bold">{d.dayNum}</span>
              </button>
            ))}
          </div>

          {/* Hour selector */}
          {reschedDayHours.length === 0 ? (
            <p className="font-body-md text-sm text-on-surface-variant">No open slots on this day.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {reschedDayHours.map(({ time, available }) => (
                <button
                  key={time}
                  type="button"
                  disabled={!available}
                  onClick={() => setReschedHour(time)}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-[13px] font-bold transition-all duration-200 ${
                    reschedHour === time
                      ? "border-primary bg-primary text-on-primary shadow-sm"
                      : available
                        ? "border-outline-variant bg-surface-container-low text-on-surface hover:border-primary/50"
                        : "border-outline-variant/40 bg-surface-container-low text-on-surface-variant/50 cursor-not-allowed"
                  }`}
                >
                  <Icon name="schedule" className="text-[15px]" />
                  {time}
                </button>
              ))}
            </div>
          )}

          {reschedError && <p className="font-body-md text-sm font-semibold text-error">{reschedError}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={reschedSubmitting} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary font-heading font-semibold text-on-primary disabled:opacity-60">
              <Icon name="check_circle" className="text-[18px]" />
              {reschedSubmitting ? "Updating…" : "Confirm new time"}
            </button>
            <button type="button" onClick={() => setRescheduling(false)} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-primary font-heading font-semibold text-primary hover:bg-primary-fixed-dim/40">
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {disputing && (
        <form onSubmit={raiseDispute} className="mt-4 flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-5">
          <h3 className="font-heading text-base font-semibold text-on-surface">File a dispute</h3>
          <p className="font-body-md text-sm text-on-surface-variant">
            Describe what went wrong. Evidence is optional but helps us resolve faster.
          </p>

          <label className="font-heading text-xs font-semibold text-on-surface-variant">Reason category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {DISPUTE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="font-heading text-xs font-semibold text-on-surface-variant">Describe the issue (required)</label>
          <textarea
            className="h-24 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tell us what went wrong…"
            required
          />

          <label className="font-heading text-xs font-semibold text-on-surface-variant">Supporting evidence (optional)</label>
          <FileUpload
            label="Add photos or documents"
            onSelect={(dataUrl) => setEvidence((prev) => [...prev, dataUrl])}
          />

          {disputeError && <p className="font-body-md text-sm font-semibold text-error">{disputeError}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={submittingDispute} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-error font-heading font-semibold text-on-error hover:bg-error/90 disabled:opacity-60">
              <Icon name="gavel" className=" text-[18px]" />
              {submittingDispute ? "Submitting…" : t("dispute")}
            </button>
            <button type="button" onClick={() => { setDisputing(false); setDisputeError(""); }} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-primary font-heading font-semibold text-primary hover:bg-primary-fixed-dim/40">
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}