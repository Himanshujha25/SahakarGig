import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import socket from "../../lib/socket";
import FileUpload from "../../components/FileUpload";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Zap,
  Repeat,
  Users,
  MapPin,
  Calendar,
  ShieldCheck,
  Send,
  AlertTriangle,
  RotateCcw,
  CreditCard,
  Building2,
  User,
  Radio,
  ExternalLink,
  X,
  MessageSquare,
  Sparkles,
} from "lucide-react";

const STEPS = [
  { key: "requested", label: "Requested", desc: "Awaiting provider acceptance" },
  { key: "accepted", label: "Accepted", desc: "Worker assigned & on route" },
  { key: "in-progress", label: "In Progress", desc: "Service actively underway" },
  { key: "completed", label: "Completed", desc: "Work verified & signed off" },
];

const DISPUTE_CATEGORIES = [
  "Service not completed",
  "Quality not as expected",
  "Provider no-show / late",
  "Overcharged",
  "Damaged property",
  "Unprofessional behaviour",
  "Other",
];

const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const chatBottomRef = useRef(null);

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
    socket.on("booking:updated", (b) => {
      if (b._id === id || b._id?.toString() === id) setBooking(b);
    });
    socket.on("booking:chat", ({ bookingId, message }) => {
      if (bookingId?.toString() === id) {
        setBooking((prev) => (prev ? { ...prev, chat: [...(prev.chat || []), message] } : prev));
      }
    });
    socket.on("provider:location_update", ({ bookingId, lat, lng, at }) => {
      if (bookingId?.toString() === id) setLivePos({ lat, lng, at: at || Date.now() });
    });
    return () => {
      socket.off("booking:updated");
      socket.off("booking:chat");
      socket.off("provider:location_update");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [booking?.chat]);

  const sendChat = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await api.post(`/bookings/${id}/chat`, { message });
      setMessage("");
      load();
    } catch {
      /* ignore */
    }
  };

  const raiseDispute = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setDisputeError("Please describe the issue.");
      return;
    }
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
    } catch {
      /* best-effort */
    }
  };

  const cancelBooking = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.patch(`/bookings/${id}/cancel`);
      load();
    } catch (err) {
      alert(err?.response?.data?.message || "Could not cancel the booking. Please try again.");
    }
  };

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
    if (!reschedHour) {
      setReschedError("Please choose an available time slot.");
      return;
    }
    const day = reschedDays[reschedDay];
    const scheduledTime = new Date(
      day.date.getFullYear(),
      day.date.getMonth(),
      day.date.getDate(),
      Number(reschedHour.split(":")[0]),
      0,
      0
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

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <div className="h-6 w-1/4 rounded-lg bg-slate-200"></div>
          <div className="h-4 w-1/2 rounded-lg bg-slate-100"></div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Order Record Not Found</h2>
        <p className="text-xs text-slate-500">The requested service order could not be located.</p>
        <Link
          to="/household/bookings"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-bold shadow-xs hover:bg-[#173bab] transition"
        >
          <ArrowLeft size={14} /> Back to My Bookings
        </Link>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === booking.status);
  const isCancelled = booking.status === "cancelled";
  const isDisputed = booking.status === "disputed";

  // Financial Escrow Breakdown
  const totalAmount = booking.price || 0;
  const workerEscrow = Math.round(totalAmount * 0.85);
  const welfarePool = Math.round(totalAmount * 0.10);
  const techFee = Math.round(totalAmount * 0.05);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* ── Top Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/household/bookings")}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-700 flex items-center justify-center hover:border-[#00288e]/40 hover:text-[#00288e] transition shadow-xs cursor-pointer"
            title="Back to Bookings"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                Order Tracking
              </h1>
              <span className="text-xs text-slate-400 font-medium">#{booking._id.slice(-8).toUpperCase()}</span>
            </div>
            <p className="text-xs text-slate-500">Live statutory status & real-time dispatch telemetrics</p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          {isCancelled ? (
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              Cancelled
            </span>
          ) : isDisputed ? (
            <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1.5">
              <AlertTriangle size={13} /> Under Dispute Review
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-[#e8edff] text-[#00288e] text-xs font-bold border border-[#00288e]/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00288e] animate-pulse" />
              {STEPS.find((s) => s.key === booking.status)?.label || booking.status}
            </span>
          )}
        </div>
      </div>

      {/* ── Main Layout: 2 Columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Service Details, Stepper, GPS & Action Buttons (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Service Overview Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {booking.isEmergency && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10.5px] font-bold">
                      <Zap size={11} /> Emergency Express
                    </span>
                  )}
                  {booking.groupBooking?.enabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10.5px] font-bold">
                      <Users size={11} /> Institutional Crew · {booking.groupBooking.memberCount} Workers
                    </span>
                  )}
                  {booking.recurrence?.enabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#00288e] border border-[#00288e]/20 text-[10.5px] font-bold capitalize">
                      <Repeat size={11} /> Recurring · {booking.recurrence.freq}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {booking.service}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Booked on {new Date(booking.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-2xl font-black text-[#00288e]">₹{booking.price?.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-slate-400 font-semibold">100% Escrow</p>
              </div>
            </div>

            {/* Provider & Location Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#00288e] shrink-0">
                  <User size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 font-medium">Assigned Worker / Lead</p>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {booking.providerId?.userId?.name || (booking.dispatchMode === "broadcast" && booking.broadcastStatus === "broadcasting" ? "Searching nearby..." : "Cooperative Crew")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#00288e] shrink-0">
                  <MapPin size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 font-medium">Service Locality</p>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {booking.locationText || "Site Location Defined"}
                  </p>
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700">
                <span className="font-bold text-[#00288e]">Requirement Notes:</span> {booking.notes}
              </div>
            )}
          </div>

          {/* 2. Interactive Milestone Stepper Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                Order Lifecycle Timeline
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">Step {Math.max(1, currentIdx + 1)} of 4</span>
            </div>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-100">
              {STEPS.map((step, i) => {
                const done = !isCancelled && i < currentIdx;
                const active = !isCancelled && i === currentIdx;
                return (
                  <div key={step.key} className="flex items-start gap-3.5 relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                        done
                          ? "bg-[#00288e] text-white shadow-xs"
                          : active
                          ? "bg-[#00288e] text-white ring-4 ring-[#e8edff]"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {done ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold ${active ? "text-[#00288e]" : done ? "text-slate-900" : "text-slate-400"}`}>
                          {step.label}
                        </p>
                        {active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#e8edff] text-[#00288e] font-bold border border-[#00288e]/20">
                            Current Stage
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Live GPS Location (when accepted or in-progress) */}
          {["accepted", "in-progress"].includes(booking.status) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h3 className="text-sm font-bold text-slate-900">Worker Live Telemetry</h3>
                </div>
                {livePos && (
                  <a
                    href={`https://www.google.com/maps?q=${livePos.lat},${livePos.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00288e] hover:underline"
                  >
                    Open in Google Maps <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {livePos ? (
                <div className="space-y-2">
                  <iframe
                    title="Provider live location"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${livePos.lng - 0.005}%2C${livePos.lat - 0.005}%2C${livePos.lng + 0.005}%2C${livePos.lat + 0.005}&layer=mapnik&marker=${livePos.lat}%2C${livePos.lng}`}
                    className="h-44 w-full rounded-xl border border-slate-200"
                    loading="lazy"
                  />
                  <p className="text-[11px] text-slate-500 text-right">
                    GPS Fix: {livePos.lat.toFixed(4)}, {livePos.lng.toFixed(4)}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
                  <Radio size={18} className="text-slate-400 mx-auto animate-pulse" />
                  <p className="text-xs font-semibold text-slate-700">Connecting to Worker Signal...</p>
                  <p className="text-[11px] text-slate-400">Live GPS map will initialize once provider transmits signal.</p>
                </div>
              )}
            </div>
          )}

          {/* 4. Action Buttons */}
          <div className="space-y-2.5">
            {booking.status === "completed" && booking.paymentStatus !== "paid" && booking.paymentStatus !== "refunded" && (
              <button
                type="button"
                onClick={() => navigate(`/household/pay/${id}`)}
                className="w-full h-12 rounded-xl bg-[#00288e] hover:bg-[#173bab] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <CreditCard size={16} /> Pay Escrow via Razorpay (₹{booking.price})
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(booking.status === "requested" || booking.status === "accepted") && !rescheduling && !disputing && (
                <button
                  type="button"
                  onClick={openReschedule}
                  className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Calendar size={14} className="text-[#00288e]" /> Reschedule Time Slot
                </button>
              )}

              {booking.status === "requested" && !rescheduling && !disputing && (
                <button
                  type="button"
                  onClick={cancelBooking}
                  className="h-10 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <X size={14} /> Cancel Booking Request
                </button>
              )}

              {booking.status !== "cancelled" && booking.status !== "disputed" && !disputing && (
                <button
                  type="button"
                  onClick={() => setDisputing(true)}
                  className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <AlertTriangle size={14} className="text-amber-600" /> Raise Dispute / Grievance
                </button>
              )}
            </div>
          </div>

          {/* Reschedule Inline Form */}
          {rescheduling && (
            <form onSubmit={submitReschedule} className="rounded-2xl border border-[#00288e]/30 bg-blue-50/40 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Reschedule Service Slot</h4>
                  <p className="text-[11px] text-slate-500">Pick from provider's verified availability window</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduling(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Day selector */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {reschedDays.map((d, i) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => { setReschedDay(i); setReschedHour(null); }}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      i === reschedDay
                        ? "border-[#00288e] bg-[#00288e] text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-[10px] font-semibold block">{d.label}</span>
                    <span className="text-xs font-bold block mt-0.5">{d.dayNum}</span>
                  </button>
                ))}
              </div>

              {/* Hour selector */}
              {reschedDayHours.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No available slots on this selected day.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {reschedDayHours.map(({ time, available }) => (
                    <button
                      key={time}
                      type="button"
                      disabled={!available}
                      onClick={() => setReschedHour(time)}
                      className={`h-9 rounded-xl border text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                        reschedHour === time
                          ? "border-[#00288e] bg-[#00288e] text-white shadow-xs"
                          : available
                          ? "border-slate-200 bg-white text-slate-700 hover:border-[#00288e]/40"
                          : "border-slate-200/50 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}

              {reschedError && <p className="text-xs font-semibold text-red-600">{reschedError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={reschedSubmitting}
                  className="flex-1 h-10 rounded-xl bg-[#00288e] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#173bab] transition cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 size={14} /> {reschedSubmitting ? "Updating..." : "Confirm Rescheduled Slot"}
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduling(false)}
                  className="px-4 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Dispute Inline Form */}
          {disputing && (
            <form onSubmit={raiseDispute} className="rounded-2xl border border-red-200 bg-red-50/40 p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-red-900">File Cooperative Grievance</h4>
                  <p className="text-[11px] text-red-600">Your complaint will be reviewed by the society nodal desk</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setDisputing(false); setDisputeError(""); }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Grievance Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#00288e]"
                >
                  {DISPUTE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Description of Issue (Required)</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain clearly what happened on site..."
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-[#00288e]"
                />
              </div>

              <FileUpload
                label="Add photo proof or documentation (optional)"
                onSelect={(dataUrl) => setEvidence((prev) => [...prev, dataUrl])}
              />

              {disputeError && <p className="text-xs font-semibold text-red-600">{disputeError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60"
                >
                  <AlertTriangle size={14} /> {submittingDispute ? "Submitting..." : "Submit Grievance"}
                </button>
                <button
                  type="button"
                  onClick={() => { setDisputing(false); setDisputeError(""); }}
                  className="px-4 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Under Dispute Banner */}
          {booking.status === "disputed" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertTriangle size={14} /> Dispute Open with Cooperative Administration
              </div>
              <p className="text-xs text-slate-700">"{booking.issue || "Dispute submitted"}"</p>
              <button
                type="button"
                onClick={withdrawDispute}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              >
                <RotateCcw size={13} /> Withdraw Dispute
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Financial Escrow & Real-Time Chat (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* 1. Transparent Escrow Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                Escrow Settlement Math
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10.5px] font-bold border border-emerald-200">
                <ShieldCheck size={11} /> 100% Nodal Escrow
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Direct Worker Escrow (85%):</span>
                <span className="font-bold text-slate-900">₹{workerEscrow.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cooperative Welfare Pool (10%):</span>
                <span className="font-bold text-slate-900">₹{welfarePool.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Platform Tech & Insurance (5%):</span>
                <span className="font-bold text-slate-900">₹{techFee.toLocaleString("en-IN")}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Total Statutory Price:</span>
                <span className="text-base font-black text-[#00288e]">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* 2. Direct Worker / Union Chat Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#00288e]" />
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                  Direct Dispatch Chat
                </h3>
              </div>
              <span className="text-[10.5px] text-slate-400 font-semibold">End-to-End Logged</span>
            </div>

            {/* Chat Messages */}
            <div className="h-56 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {(booking.chat || []).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                  <MessageSquare size={22} className="opacity-40" />
                  <p className="text-xs font-semibold">No messages yet.</p>
                  <p className="text-[11px]">Send a message to coordinate with the worker.</p>
                </div>
              ) : (
                booking.chat.map((c, i) => {
                  const senderId = c.sender?._id?.toString() || c.sender?.toString() || "";
                  const isMe = senderId === user?.id?.toString() || senderId === user?._id?.toString();
                  return (
                    <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-0.5 ${
                          isMe
                            ? "bg-[#00288e] text-white rounded-br-xs"
                            : "bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200"
                        }`}
                      >
                        <p className={`text-[10px] font-bold ${isMe ? "text-blue-200" : "text-[#00288e]"}`}>
                          {isMe ? "You" : c.sender?.name || "Provider"}
                        </p>
                        <p className="leading-relaxed">{c.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Send Form */}
            <form onSubmit={sendChat} className="flex gap-2 pt-1 border-t border-slate-100">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type coordinate message..."
                className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 outline-none focus:border-[#00288e] focus:bg-white transition"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-[#00288e] hover:bg-[#173bab] text-white flex items-center justify-center transition shadow-xs cursor-pointer shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}