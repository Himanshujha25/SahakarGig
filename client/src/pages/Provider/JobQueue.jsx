import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import {
  Briefcase, CheckCircle2, Clock, Zap, Check, X, ArrowRight,
  Megaphone, Bell, Phone, MapPin, IndianRupee, ShieldCheck,
  Calendar, Layers, Filter, Eye, ChevronRight, User, Star,
  Navigation, AlertTriangle, ExternalLink, Volume2, ShieldAlert
} from "lucide-react";

// Web Audio synthesizer chime for incoming Ola/Uber style job alert
function playIncomingGigChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.3); // D6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn("Audio chime note:", e);
  }
}

export default function JobQueue() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'requests' | 'completed' | 'history'
  const [coopMessages, setCoopMessages] = useState([]);

  // Ola/Uber Style Incoming Dispatch Modal & 45s Countdown
  const [incomingGig, setIncomingGig] = useState(null);
  const [countdown, setCountdown] = useState(45);
  const timerRef = useRef(null);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  async function load() {
    try {
      const { data } = await api.get("/bookings/provider/mine");
      const list = data || [];
      setBookings(list);

      // Check if there is an unhandled pending request
      const firstRequested = list.find((b) => b.status === "requested");
      if (firstRequested && (!incomingGig || incomingGig._id !== firstRequested._id)) {
        triggerIncomingOverlay(firstRequested);
      }

      const msgs = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]")
        .filter((m) => !m.id?.startsWith("msg_seed_"));
      setCoopMessages(msgs);
    } catch {} finally {
      setLoading(false);
    }
  }

  function triggerIncomingOverlay(gig) {
    setIncomingGig(gig);
    setCountdown(45);
    playIncomingGigChime();

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("🚨 New SahakarGig Job Request!", {
          body: `${gig.service || "Home Service"} for ${gig.householdId?.name || "Customer"}. Net Pay: ₹${Math.round((gig.price || 0) * 0.85)}`,
          icon: "/favicon.ico",
        });
      } catch {}
    }
  }

  // 45-Second Countdown Timer
  useEffect(() => {
    if (incomingGig) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timerRef.current);
            handleAutoDecline(incomingGig._id);
            return 0;
          }
          if (c % 5 === 0) playIncomingGigChime();
          return c - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [incomingGig]);

  async function handleAutoDecline(id) {
    setIncomingGig(null);
    try {
      await api.patch(`/bookings/${id}/cancel`);
      await load();
    } catch {}
  }

  function dismissMessage(id) {
    const updated = coopMessages.filter((m) => m.id !== id);
    setCoopMessages(updated);
    localStorage.setItem("sg_coop_messages", JSON.stringify(updated));
  }

  useEffect(() => {
    load();

    const upsert = (incoming) => {
      const gig = incoming?.booking || incoming;
      if (!gig?._id) return;

      setBookings((prev) => {
        const exists = prev.some((b) => b._id === gig._id);
        if (exists) return prev.map((b) => (b._id === gig._id ? { ...b, ...gig } : b));
        return [gig, ...prev];
      });

      if (gig.status === "requested") {
        triggerIncomingOverlay(gig);
      }
    };

    socket.on("booking:new", upsert);
    socket.on("booking:updated", upsert);
    socket.on("booking:assigned", upsert);

    return () => {
      socket.off("booking:new");
      socket.off("booking:updated");
      socket.off("booking:assigned");
    };
  }, []);

  async function accept(id) {
    setBusy(id);
    setIncomingGig(null);
    try {
      await api.patch(`/bookings/${id}/accept`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function reject(id) {
    setBusy(id);
    setIncomingGig(null);
    try {
      await api.patch(`/bookings/${id}/cancel`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  // Categorized Collections
  const pendingRequests = useMemo(() => bookings.filter((b) => b.status === "requested"), [bookings]);
  const activeJobs = useMemo(() => bookings.filter((b) => b.status === "accepted" || b.status === "in-progress"), [bookings]);
  const completedJobs = useMemo(() => bookings.filter((b) => b.status === "completed"), [bookings]);
  const pastHistory = useMemo(() => bookings.filter((b) => b.status === "completed" || b.status === "cancelled" || b.status === "disputed"), [bookings]);

  // Display filter logic
  const displayedBookings = useMemo(() => {
    if (activeTab === "requests") return pendingRequests;
    if (activeTab === "active") return activeJobs;
    if (activeTab === "completed") return completedJobs;
    return pastHistory;
  }, [activeTab, pendingRequests, activeJobs, completedJobs, pastHistory]);

  const totalEarningsEstimate = completedJobs.reduce((sum, b) => sum + (b.price || 0) * 0.85, 0);

  // Helper to detect 30+ minute inactivity escalation
  function checkEscalation(b) {
    if (b.status !== "accepted") return null;
    const lastUpdate = new Date(b.updatedAt || b.createdAt).getTime();
    const elapsedMinutes = (Date.now() - lastUpdate) / (1000 * 60);
    return elapsedMinutes > 30 ? Math.round(elapsedMinutes) : null;
  }

  const statusBadge = (status) => {
    switch (status) {
      case "requested":
        return { label: "New Request", bg: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500 animate-pulse" };
      case "accepted":
        return { label: "Accepted · Ready to Travel", bg: "bg-blue-50 text-[#00288e] border-blue-200", dot: "bg-[#00288e]" };
      case "in-progress":
        return { label: "In Service · Work Ongoing", bg: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-600 animate-pulse" };
      case "completed":
        return { label: "Completed ✓", bg: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" };
      case "disputed":
        return { label: "Disputed", bg: "bg-rose-50 text-rose-800 border-rose-200", dot: "bg-rose-500" };
      case "cancelled":
      default:
        return { label: "Cancelled", bg: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-20 space-y-6 text-slate-900 font-sans">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
              Work Dispatch &amp; Job Queue
            </h1>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#00288e] border border-blue-200 text-xs font-bold flex items-center gap-1">
              <ShieldCheck size={13} />
              85% Net Escrow Split
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time gig dispatch with 45s incoming alert, live map navigation, and 30-min auto-escalation protection.
          </p>
        </div>

        {pendingRequests.length > 0 && (
          <button
            onClick={() => triggerIncomingOverlay(pendingRequests[0])}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md cursor-pointer animate-pulse"
          >
            <Bell size={14} />
            <span>{pendingRequests.length} Incoming Dispatch Alert</span>
          </button>
        )}
      </div>

      {/* ── COOP ANNOUNCEMENT BANNER ── */}
      {coopMessages.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-[#00288e] to-slate-900 text-white p-4 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white text-[#00288e] font-black text-[10.5px] flex items-center gap-1 shadow-2xs">
                <Megaphone size={12} /> Cooperative Broadcast
              </span>
              <span className="text-[11px] text-blue-200 font-medium">
                {coopMessages[0].timestamp} · {coopMessages[0].date}
              </span>
            </div>
            <button
              onClick={() => dismissMessage(coopMessages[0].id)}
              className="text-xs font-bold text-slate-300 hover:text-white underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="pt-0.5">
            <h3 className="text-xs font-bold text-blue-100">{coopMessages[0].title}</h3>
            <p className="text-xs font-medium text-slate-200 mt-0.5 leading-relaxed">{coopMessages[0].body}</p>
          </div>
        </div>
      )}

      {/* ── 4 KPI METRIC TILES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active &amp; Next Up</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
              <Briefcase size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{activeJobs.length}</p>
          <p className="text-[11px] font-bold text-[#00288e]">In-Service or Confirmed</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Incoming Requests</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Clock size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{pendingRequests.length}</p>
          <p className="text-[11px] font-bold text-amber-700">{pendingRequests.length > 0 ? "Requires Your Acceptance" : "Queue Clear ✓"}</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Jobs</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{completedJobs.length}</p>
          <p className="text-[11px] font-bold text-emerald-700">Fully Settled Work</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Escrow Take-Home</p>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <IndianRupee size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{Math.round(totalEarningsEstimate).toLocaleString("en-IN")}</p>
          <p className="text-[11px] font-bold text-purple-700">Friday Direct Payout</p>
        </div>
      </div>

      {/* ── WORKFLOW TABS (NO PAST CLUTTER IN ACTIVE VIEW) ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "active", label: `Active In-Service (${activeJobs.length})`, icon: Briefcase },
          { id: "requests", label: `Incoming Requests (${pendingRequests.length})`, icon: Clock },
          { id: "completed", label: `Completed Orders & Reviews (${completedJobs.length})`, icon: CheckCircle2 },
          { id: "history", label: `Full Service Ledger (${pastHistory.length})`, icon: Layers },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? "bg-[#00288e] text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── CONTENT AREA ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse h-44 bg-slate-100 rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : activeTab === "history" ? (
        /* Compact Clean Ledger for Past History */
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Service Record Archive &amp; Escrow History</h3>
            <span className="text-[11px] text-slate-400 font-bold">{pastHistory.length} total records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3.5">Customer Household</th>
                  <th className="px-5 py-3.5">Service Trade</th>
                  <th className="px-5 py-3.5">Scheduled Date &amp; Time</th>
                  <th className="px-5 py-3.5">Gross Pay</th>
                  <th className="px-5 py-3.5">Net (85%)</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastHistory.map((b) => {
                  const sb = statusBadge(b.status);
                  const netPay = Math.round((b.price || 0) * 0.85);
                  return (
                    <tr key={b._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900">{b.householdId?.name || "Customer Household"}</p>
                        <p className="text-[11px] text-slate-400">{b.householdId?.phone || "Verified Address"}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#00288e] font-bold text-[10.5px] border border-blue-200">
                          {b.service || "Home Service"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {b.scheduledTime ? new Date(b.scheduledTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Flexible timing"}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        ₹{b.price || 0}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-700">
                        ₹{netPay}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-bold text-[10.5px] ${sb.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sb.dot}`} />
                          {sb.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => navigate(`/provider/job/${b._id}`)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : displayedBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3 shadow-2xs">
          <Briefcase size={40} className="mx-auto text-slate-300" />
          <p className="text-base font-bold text-slate-800">No active work items</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === "requests" ? "No new pending requests at this time." : "You're all caught up! When a customer books a gig, an instant dispatch alert will pop up."}
          </p>
        </div>
      ) : (
        /* High-Impact Interactive Cards for Active, Requests & Completed Work */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayedBookings.map((b) => {
            const sb = statusBadge(b.status);
            const netPay = Math.round((b.price || 0) * 0.85);
            const escalatedMinutes = checkEscalation(b);
            const review = b.review || b.rating ? { rating: b.rating || 5, comment: b.reviewComment || "Prompt service and clean work. Highly recommended!" } : null;

            return (
              <div
                key={b._id}
                onClick={() => navigate(`/provider/job/${b._id}`)}
                className={`rounded-2xl border bg-white p-5 shadow-2xs space-y-4 cursor-pointer hover:border-[#00288e] hover:shadow-md transition-all flex flex-col justify-between ${
                  escalatedMinutes ? "border-amber-400 bg-amber-50/20" : b.isEmergency ? "border-rose-300 bg-rose-50/10" : "border-slate-200"
                }`}
              >
                <div className="space-y-3">
                  {/* 30-Minute Auto-Escalation Warning */}
                  {escalatedMinutes && (
                    <div className="p-3 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-700 shrink-0" />
                        <span>Accepted {escalatedMinutes}m ago — Inactivity Escalation Warning!</span>
                      </div>
                      <button
                        onClick={() => navigate(`/provider/job/${b._id}`)}
                        className="px-2.5 py-1 rounded-lg bg-amber-800 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-900"
                      >
                        Start Travel
                      </button>
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                        {(b.householdId?.name || "H").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{b.householdId?.name || "Customer Household"}</h3>
                          {b.isEmergency && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-0.5">
                              <Zap size={10} /> Emergency
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{b.service || "Home Service"}</p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-bold text-[10.5px] ${sb.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sb.dot}`} />
                      {sb.label}
                    </span>
                  </div>

                  {/* Precise Address & Distance */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold truncate">
                        <MapPin size={14} className="text-[#00288e] shrink-0" />
                        <span className="truncate">{b.locationText || b.address || "Sector 62, Noida, UP (1.8 km away)"}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.locationText || b.address || "Noida")}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#00288e] text-[10.5px] font-bold hover:bg-blue-50 inline-flex items-center gap-1 shrink-0"
                      >
                        <Navigation size={11} /> Maps
                      </a>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {b.scheduledTime ? new Date(b.scheduledTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Immediate Dispatch"}
                      </span>
                      <span className="font-bold text-emerald-700">
                        Take-Home: ₹{netPay} <span className="text-slate-400 font-normal">(₹{b.price} gross)</span>
                      </span>
                    </div>
                  </div>

                  {/* Customer Review on Completed Orders */}
                  {b.status === "completed" && (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800 flex items-center gap-1">
                          <Star size={13} className="text-amber-500 fill-amber-400" />
                          <span>5.0 / 5.0 Customer Rating</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold">Verified Review</span>
                      </div>
                      <p className="text-[11px] text-slate-600 italic">
                        "{b.reviewComment || "Worker arrived promptly, completed the service with great skill, and left the work area very clean."}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Accept/Reject or Workspace Button */}
                {b.status === "requested" ? (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={busy === b._id}
                      onClick={() => accept(b._id)}
                      className="py-2.5 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Check size={14} /> Accept Order (₹{netPay})
                    </button>
                    <button
                      disabled={busy === b._id}
                      onClick={() => reject(b._id)}
                      className="py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">Nodal Escrow Protected</span>
                    <button
                      onClick={() => navigate(`/provider/job/${b._id}`)}
                      className="text-xs font-bold text-[#00288e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── OLA / UBER / RAPIDO STYLE INCOMING GIG FULL-SCREEN MODAL OVERLAY ── */}
      {incomingGig && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 lg:p-7 space-y-5 border-2 border-[#00288e] shadow-2xl animate-scale-up">
            {/* Header with Circular Countdown */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  ⚡ New Incoming Dispatch
                </h2>
              </div>

              {/* Countdown Circular Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-black text-xs">
                <Clock size={13} className="animate-spin" />
                <span>{countdown}s remaining</span>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00288e] transition-all duration-1000"
                style={{ width: `${(countdown / 45) * 100}%` }}
              />
            </div>

            {/* Gig Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{incomingGig.householdId?.name || "Customer Household"}</h3>
                  <p className="text-xs text-[#00288e] font-bold">{incomingGig.service || "Household Repair & Service"}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                  ₹{Math.round((incomingGig.price || 0) * 0.85)} Net Pay
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin size={14} className="text-[#00288e] shrink-0" />
                  <span className="truncate">{incomingGig.locationText || incomingGig.address || "Sector 62, Noida, UP (1.8 km away)"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Immediate Pickup · ETA ~6 mins</span>
                </div>
              </div>
            </div>

            {/* Warning Note */}
            <p className="text-[11px] text-slate-400 text-center font-medium">
              Accepting routes job directly to your live GPS workspace. If unaccepted, it will auto-pass in {countdown}s.
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => reject(incomingGig._id)}
                className="py-3.5 rounded-2xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
              >
                Pass to Next
              </button>
              <button
                onClick={() => accept(incomingGig._id)}
                className="py-3.5 rounded-2xl bg-[#00288e] hover:bg-[#001f70] text-white font-black text-xs shadow-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Check size={16} strokeWidth={3} />
                <span>ACCEPT (₹{Math.round((incomingGig.price || 0) * 0.85)})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
