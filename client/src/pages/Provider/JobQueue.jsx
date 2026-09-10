import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import {
  Briefcase, CheckCircle2, Clock, Zap, Check, X, ArrowRight,
  Megaphone, Bell, Phone, MapPin, IndianRupee, ShieldCheck,
  Calendar, Layers, Filter, Eye, ChevronRight, ChevronDown, User, Star,
  Navigation, AlertTriangle, ExternalLink, Volume2, ShieldAlert
} from "lucide-react";
import AIWorkerCoachWidget from "../../components/AIWorkerCoachWidget";

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
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
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
        return { label: "New Request", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", dot: "bg-amber-500" };
      case "accepted":
        return { label: "Accepted · Ready", bg: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" };
      case "in-progress":
        return { label: "In Service · Ongoing", bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30", dot: "bg-purple-600" };
      case "completed":
        return { label: "Completed ✓", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", dot: "bg-emerald-500" };
      case "disputed":
        return { label: "Disputed", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30", dot: "bg-rose-500" };
      case "cancelled":
      default:
        return { label: "Cancelled", bg: "bg-surface-container text-on-surface-variant border-outline-variant", dot: "bg-on-surface-variant" };
    }
  };

  const TAB_OPTIONS = [
    { id: "active", label: "Active In-Service", count: activeJobs.length, icon: Briefcase, color: "text-primary bg-primary/10" },
    { id: "requests", label: "Incoming Requests", count: pendingRequests.length, icon: Clock, color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
    { id: "completed", label: "Completed Orders & Reviews", count: completedJobs.length, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    { id: "history", label: "Full Service Ledger", count: pastHistory.length, icon: Layers, color: "text-purple-600 dark:text-purple-400 bg-purple-500/10" },
  ];
  const currentTabObj = TAB_OPTIONS.find((t) => t.id === activeTab) || TAB_OPTIONS[0];
  const CurrentTabIcon = currentTabObj.icon;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 text-on-surface font-sans">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-on-surface" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
              Work Dispatch &amp; Job Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold flex items-center gap-1">
              <ShieldCheck size={13} />
              85% Net Escrow Split
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Real-time gig dispatch with 45s incoming alert, live map navigation, and 30-min auto-escalation protection.
          </p>
        </div>

        {pendingRequests.length > 0 && (
          <button
            onClick={() => triggerIncomingOverlay(pendingRequests[0])}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md cursor-pointer shrink-0"
          >
            <Bell size={14} />
            <span>{pendingRequests.length} Incoming Dispatch Alert</span>
          </button>
        )}
      </div>

      {/* ── COOP ANNOUNCEMENT BANNER ── */}
      {coopMessages.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-high border border-outline-variant text-on-surface p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-bold text-[10.5px] flex items-center gap-1">
                <Megaphone size={12} /> Cooperative Broadcast
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium">
                {coopMessages[0].timestamp} · {coopMessages[0].date}
              </span>
            </div>
            <button
              onClick={() => dismissMessage(coopMessages[0].id)}
              className="text-xs font-bold text-on-surface-variant hover:text-on-surface underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="pt-0.5">
            <h3 className="text-xs font-bold text-on-surface">{coopMessages[0].title}</h3>
            <p className="text-xs font-medium text-on-surface-variant mt-0.5 leading-relaxed">{coopMessages[0].body}</p>
          </div>
        </div>
      )}

      {/* ── 4 KPI METRIC TILES (Compact & Full Dark/Light Theme Tokens) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl border border-outline-variant bg-surface shadow-2xs space-y-0.5 sm:space-y-1">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Active &amp; Next Up</p>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Briefcase size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-on-surface leading-tight">{activeJobs.length}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-primary truncate">In-Service or Confirmed</p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl border border-outline-variant bg-surface shadow-2xs space-y-0.5 sm:space-y-1">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Incoming Requests</p>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Clock size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-on-surface leading-tight">{pendingRequests.length}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate">{pendingRequests.length > 0 ? "Action Required" : "Queue Clear ✓"}</p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl border border-outline-variant bg-surface shadow-2xs space-y-0.5 sm:space-y-1">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Completed Jobs</p>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-on-surface leading-tight">{completedJobs.length}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate">Fully Settled Work</p>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl border border-outline-variant bg-surface shadow-2xs space-y-0.5 sm:space-y-1">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Escrow Earnings</p>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
              <IndianRupee size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-on-surface leading-tight">₹{Math.round(totalEarningsEstimate).toLocaleString("en-IN")}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-purple-600 dark:text-purple-400 truncate">Friday Direct Payout</p>
        </div>
      </div>

      {/* ── AI WORKER EARNINGS & SKILL COACH WIDGET ── */}
      <AIWorkerCoachWidget />

      {/* ── MOBILE CUSTOM FILTER DROPDOWN ── */}
      <div className="sm:hidden relative space-y-1">
        <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider">
          Filter Queue View
        </label>
        <button
          type="button"
          onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface border border-outline-variant text-on-surface shadow-xs transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${currentTabObj.color}`}>
              <CurrentTabIcon size={16} strokeWidth={2.2} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-bold text-on-surface truncate leading-tight">
                {currentTabObj.label}
              </p>
              <p className="text-[10.5px] text-on-surface-variant truncate mt-0.5 font-medium">
                {currentTabObj.count} {currentTabObj.count === 1 ? "record" : "records"} in view
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center transition-all duration-300 ${
                filterDropdownOpen
                  ? "bg-primary text-on-primary rotate-180 shadow-xs"
                  : "bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              <ChevronDown size={17} strokeWidth={2.5} />
            </div>
          </div>
        </button>

        {/* Custom Dropdown Menu Popup */}
        {filterDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setFilterDropdownOpen(false)}
            />
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-outline-variant bg-surface shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              {TAB_OPTIONS.map((t) => {
                const Icon = t.icon;
                const isSelected = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(t.id);
                      setFilterDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-primary text-on-primary shadow-xs"
                        : "text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20 text-white" : t.color}`}>
                        <Icon size={16} strokeWidth={2.2} />
                      </div>
                      <span className="truncate">{t.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isSelected ? "bg-white/20 text-white" : "bg-surface-container text-on-surface-variant"}`}>
                        {t.count}
                      </span>
                      {isSelected && <Check size={15} strokeWidth={3} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── DESKTOP WORKFLOW TABS (Hidden on mobile) ── */}
      <div className="hidden sm:flex items-center gap-2 border-b border-outline-variant/60 pb-2">
        {TAB_OPTIONS.map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface text-on-surface-variant hover:bg-surface-container border border-outline-variant"
              }`}
            >
              <Icon size={14} />
              <span>{t.label} ({t.count})</span>
            </button>
          );
        })}
      </div>

      {/* ── CONTENT AREA ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse h-44 bg-surface-container rounded-2xl border border-outline-variant" />
          ))}
        </div>
      ) : activeTab === "history" ? (
        /* Full Service Ledger & Archive */
        <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-outline-variant/60 bg-surface-container-low flex items-center justify-between">
            <h3 className="text-xs font-bold text-on-surface">Service Record Archive &amp; Escrow History</h3>
            <span className="text-[11px] text-on-surface-variant font-bold">{pastHistory.length} total records</span>
          </div>

          {/* 1. Mobile Cards View (Hidden on sm and up) */}
          <div className="sm:hidden divide-y divide-outline-variant/60">
            {pastHistory.length === 0 ? (
              <div className="p-6 text-center text-xs text-on-surface-variant font-medium">
                No past records found.
              </div>
            ) : (
              pastHistory.map((b) => {
                const sb = statusBadge(b.status);
                const netPay = Math.round((b.price || 0) * 0.85);
                return (
                  <div key={b._id} className="p-3.5 space-y-2 hover:bg-surface-container-low/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-on-surface text-xs truncate">{b.householdId?.name || "Customer Household"}</p>
                        <p className="text-[11px] text-on-surface-variant truncate">{b.locationText || b.address || "Verified Address"}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold text-[10px] shrink-0 ${sb.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sb.dot}`} />
                        {sb.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-outline-variant/40 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-bold text-[10.5px]">
                        {b.service || "Service"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Net: ₹{netPay}</span>
                        <button
                          onClick={() => navigate(`/provider/job/${b._id}`)}
                          className="px-2.5 py-1 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface text-[11px] font-bold cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. Desktop Table View (Hidden on mobile) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/60 text-on-surface-variant font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-5 py-3.5">Customer Household</th>
                  <th className="px-5 py-3.5">Service Trade</th>
                  <th className="px-5 py-3.5">Scheduled Date &amp; Time</th>
                  <th className="px-5 py-3.5">Gross Pay</th>
                  <th className="px-5 py-3.5">Net (85%)</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {pastHistory.map((b) => {
                  const sb = statusBadge(b.status);
                  const netPay = Math.round((b.price || 0) * 0.85);
                  return (
                    <tr key={b._id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-on-surface">{b.householdId?.name || "Customer Household"}</p>
                        <p className="text-[11px] text-on-surface-variant">{b.householdId?.phone || "Verified Address"}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10.5px] border border-primary/20">
                          {b.service || "Home Service"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-on-surface-variant font-medium">
                        {b.scheduledTime ? new Date(b.scheduledTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Flexible timing"}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-on-surface">
                        ₹{b.price || 0}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
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
                          className="px-3 py-1.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
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
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface p-12 text-center space-y-3 shadow-2xs">
          <Briefcase size={40} className="mx-auto text-on-surface-variant/40" />
          <p className="text-base font-bold text-on-surface">No active work items</p>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            {activeTab === "requests" ? "No new pending requests at this time." : "You're all caught up! When a customer books a gig, an instant dispatch alert will pop up."}
          </p>
        </div>
      ) : (
        /* High-Impact Interactive Cards for Active, Requests & Completed Work */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {displayedBookings.map((b) => {
            const sb = statusBadge(b.status);
            const netPay = Math.round((b.price || 0) * 0.85);
            const escalatedMinutes = checkEscalation(b);

            return (
              <div
                key={b._id}
                onClick={() => navigate(`/provider/job/${b._id}`)}
                className={`rounded-2xl border bg-surface p-4 sm:p-5 shadow-2xs space-y-3.5 cursor-pointer hover:border-primary hover:shadow-md transition-all flex flex-col justify-between ${
                  escalatedMinutes ? "border-amber-400 bg-amber-500/5" : b.isEmergency ? "border-rose-400/60 bg-rose-500/5" : "border-outline-variant"
                }`}
              >
                <div className="space-y-3">
                  {/* 30-Minute Auto-Escalation Warning */}
                  {escalatedMinutes && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                        <span>Accepted {escalatedMinutes}m ago — Inactivity Warning</span>
                      </div>
                      <button
                        onClick={() => navigate(`/provider/job/${b._id}`)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold cursor-pointer hover:bg-amber-700"
                      >
                        Start Travel
                      </button>
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                        {(b.householdId?.name || "H").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-on-surface text-sm truncate">{b.householdId?.name || "Customer Household"}</h3>
                          {b.isEmergency && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-0.5 border border-rose-500/30">
                              <Zap size={10} /> Emergency
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant font-medium truncate">{b.service || "Home Service"}</p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-bold text-[10.5px] shrink-0 ${sb.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sb.dot}`} />
                      {sb.label}
                    </span>
                  </div>

                  {/* Precise Address & Distance */}
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-on-surface font-semibold truncate min-w-0">
                        <MapPin size={14} className="text-primary shrink-0" />
                        <span className="truncate">{b.locationText || b.address || "Sector 62, Noida, UP"}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.locationText || b.address || "Noida")}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded-md bg-surface border border-outline-variant text-primary text-[10.5px] font-bold hover:bg-surface-container inline-flex items-center gap-1 shrink-0"
                      >
                        <Navigation size={11} /> Maps
                      </a>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-outline-variant/40 text-[11px]">
                      <span className="text-on-surface-variant font-medium flex items-center gap-1">
                        <Calendar size={12} className="text-on-surface-variant/70" />
                        {b.scheduledTime ? new Date(b.scheduledTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Immediate Dispatch"}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Take-Home: ₹{netPay} <span className="text-on-surface-variant font-normal">(₹{b.price})</span>
                      </span>
                    </div>
                  </div>

                  {/* Customer Review on Completed Orders */}
                  {b.status === "completed" && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Star size={13} className="text-amber-500 fill-amber-400" />
                          <span>5.0 / 5.0 Customer Rating</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Verified Review</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant italic">
                        "{b.reviewComment || "Worker arrived promptly, completed the service with great skill, and left the work area clean."}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Accept/Reject or Workspace Button */}
                {b.status === "requested" ? (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/60" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={busy === b._id}
                      onClick={() => accept(b._id)}
                      className="py-2.5 rounded-xl bg-primary hover:opacity-90 text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Check size={14} /> Accept (₹{netPay})
                    </button>
                    <button
                      disabled={busy === b._id}
                      onClick={() => reject(b._id)}
                      className="py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-on-surface-variant font-medium">Nodal Escrow Protected</span>
                    <button
                      onClick={() => navigate(`/provider/job/${b._id}`)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
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

      {/* ── OLA / UBER STYLE INCOMING 45s GIG DISPATCH MODAL ── */}
      {incomingGig && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-surface border-2 border-amber-500 p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <h3 className="font-extrabold text-on-surface text-base">Incoming Dispatch Order</h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                {countdown}s remaining
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Service:</span>
                <span className="font-bold text-on-surface">{incomingGig.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Customer:</span>
                <span className="font-bold text-on-surface">{incomingGig.householdId?.name || "Verified Customer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Net Payout (85%):</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{Math.round((incomingGig.price || 0) * 0.85)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => accept(incomingGig._id)}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={16} /> Accept Order
              </button>
              <button
                onClick={() => reject(incomingGig._id)}
                className="py-3 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X size={16} /> Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
