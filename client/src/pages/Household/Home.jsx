import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  CalendarDays, Star, ArrowRight, CheckCircle2, Clock,
  Zap, ShieldCheck, Users, Plus, FileText, Calendar,
  ChevronRight, ChevronLeft, MoreHorizontal,
  Activity, Package,
  IndianRupee, Sparkles, BadgeCheck, Wallet,
} from "lucide-react";
import AIVoiceSearchModal from "../../components/AIVoiceSearchModal";
import HouseholdTopbar from "../../components/HouseholdTopbar";
import { SERVER_URL } from "../../lib/config";

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBQ-dpYJMEXWGjKVWEtlFNYAPrFrGMUncXsN08msvogjefS62LwnCQ1bUeItkSrlQSZYpq5JrB8qKHNifnjbW0rHcNkbQY9x_gnoxQqWcWi-cqXBPtYQcopyEOxc1pQc4HyPUfW753FHhzpHa1Q7iqyfvjr5CMRSKmil9ODYutUqHafvNbhWSptBy9GXzM09Au9PHyKYYpeMrAayssGeRytpEpRtDvUHzfHKsko5gpP7qzGC8T3jA";

function formatMoney(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

/* Tiny decorative sparkline (same shape language as target dashboard) */
function Spark({ points, stroke = "#22c55e", fill = "rgba(34,197,94,0.15)" }) {
  const id = useRef(`sg${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <svg viewBox="0 0 100 32" className="w-20 h-8 shrink-0" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,32 ${points} 100,32`} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Real month-over-month trend + weekly sparkline, computed from live bookings */
function trendOf(cur, prev) {
  if (!prev && !cur) return { text: "— 0%", up: null };
  if (!prev && cur > 0) return { text: "+100%", up: true };
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return { text: "— 0%", up: null };
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, up: pct > 0 };
}
function toSpark(values) {
  const vs = values.length ? values : [0];
  const max = Math.max(...vs, 1);
  const n = vs.length;
  return vs.map((v, i) => `${((i / Math.max(n - 1, 1)) * 100).toFixed(1)},${(30 - (v / max) * 26).toFixed(1)}`).join(" ");
}
function useBookingInsights(bookings) {
  return useMemo(() => {
    const now = new Date();
    const thisM = now.getMonth();
    const thisY = now.getFullYear();
    const prevD = new Date(thisY, thisM - 1, 1);
    const prevM = prevD.getMonth();
    const prevY = prevD.getFullYear();
    const inMonth = (b, m, y) => {
      const d = b?.createdAt ? new Date(b.createdAt) : null;
      return d && !isNaN(d) && d.getMonth() === m && d.getFullYear() === y;
    };
    const curAll = bookings.filter((b) => inMonth(b, thisM, thisY));
    const prevAll = bookings.filter((b) => inMonth(b, prevM, prevY));
    const isActive = (b) => ["pending", "accepted"].includes(b.status);
    const isDone = (b) => b.status === "completed";
    const sum = (arr) => arr.reduce((s, b) => s + (Number(b.price) || 0), 0);
    /* last 10 weeks buckets for sparklines */
    const weeks = Array.from({ length: 10 }, () => ({ n: 0, active: 0, done: 0, spend: 0 }));
    const start = new Date(now);
    start.setDate(start.getDate() - 69);
    for (const b of bookings) {
      const d = b?.createdAt ? new Date(b.createdAt) : null;
      if (!d || isNaN(d)) continue;
      const idx = Math.floor((d - start) / (7 * 864e5));
      if (idx < 0 || idx > 9) continue;
      weeks[idx].n++;
      if (isActive(b)) weeks[idx].active++;
      if (isDone(b)) weeks[idx].done++;
      if (isDone(b)) weeks[idx].spend += Number(b.price) || 0;
    }
    return {
      totalTrend: trendOf(curAll.length, prevAll.length),
      activeTrend: trendOf(curAll.filter(isActive).length, prevAll.filter(isActive).length),
      doneTrend: trendOf(curAll.filter(isDone).length, prevAll.filter(isDone).length),
      spendTrend: trendOf(sum(curAll.filter(isDone)), sum(prevAll.filter(isDone))),
      sparkTotal: toSpark(weeks.map((w) => w.n)),
      sparkActive: toSpark(weeks.map((w) => w.active)),
      sparkDone: toSpark(weeks.map((w) => w.done)),
      sparkSpend: toSpark(weeks.map((w) => w.spend)),
    };
  }, [bookings]);
}

const STATUS_META = {
  pending:   { label: "Pending",   Icon: Clock,        tone: "text-amber-500" },
  accepted:  { label: "Confirmed", Icon: CheckCircle2, tone: "text-emerald-500" },
  completed: { label: "Completed", Icon: BadgeCheck,   tone: "text-blue-500" },
  disputed:  { label: "Disputed",  Icon: Zap,          tone: "text-red-500" },
  cancelled: { label: "Cancelled", Icon: Clock,        tone: "text-on-surface-variant" },
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [recIdx, setRecIdx] = useState(0);

  const load = useCallback(async () => {
    try {
      const [{ data: bk }, recRes, wRes] = await Promise.all([
        api.get("/bookings/household/mine"),
        api.get("/ai/recommend").catch(() => null),
        api.get("/wallet").catch(() => null),
      ]);
      setBookings(Array.isArray(bk) ? bk : (bk?.bookings ?? []));
      if (recRes?.data?.recommendations) setRecs(recRes.data.recommendations);
      if (wRes?.data && typeof wRes.data.balance === "number") setWalletBalance(wRes.data.balance);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  const total = bookings.length;
  const active = bookings.filter((b) => ["pending", "accepted"].includes(b.status)).length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const spent = bookings.filter((b) => b.status === "completed").reduce((s, b) => s + (b.price || 0), 0);
  const ins = useBookingInsights(bookings);

  const STATS = [
    { label: "Total Bookings", value: total, Icon: CalendarDays, iconClass: "text-blue-500", trend: ins.totalTrend, sub: "vs last month", spark: ins.sparkTotal, color: "#3b82f6" },
    { label: "Active", value: active, Icon: Activity, iconClass: "text-emerald-500", trend: ins.activeTrend, sub: "Providers on duty", spark: ins.sparkActive, color: "#22c55e" },
    { label: "Completed", value: completed, Icon: CheckCircle2, iconClass: "text-purple-400", trend: ins.doneTrend, sub: "vs last month", spark: ins.sparkDone, color: "#a855f7" },
  ];

  /* Real recent activity derived from live bookings (falls back gracefully) */
  const recentActivity = bookings.slice(0, 4).map((b) => {
    const m = STATUS_META[b.status] || STATUS_META.pending;
    const when = b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "recently";
    return {
      title: b.status === "completed" ? "Booking Completed" : b.status === "accepted" ? "Booking Confirmed" : `Booking ${m.label}`,
      desc: `${b.service || "Service"}${b.providerId?.userId?.name ? ` · ${b.providerId.userId.name}` : ""}`,
      time: when, Icon: m.Icon, tone: m.tone,
    };
  });

  const firstName = user?.name?.split(" ")[0] || "there";
  const visibleRecs = recs.slice(recIdx, recIdx + 3);

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10 space-y-5">

        {/* ── Topbar (dedicated component, target mock) ── */}
        <HouseholdTopbar onVoice={() => setIsVoiceOpen(true)} />
        <AIVoiceSearchModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />

        {/* ── Hero + quick actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Hero banner — sunset crew photo + curved quote panel, like target */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-outline-variant bg-[#12173a] min-h-[240px] grid grid-cols-1 md:grid-cols-5">
            <div className="relative z-10 md:col-span-3 p-6 sm:p-8 flex flex-col justify-center">
              <h2 className="text-[26px] sm:text-[32px] font-extrabold text-white tracking-tight flex items-center gap-2.5" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                Hey, {firstName}
                <span className="inline-flex w-9 h-9 rounded-full bg-amber-400/15 text-amber-300 items-center justify-center shrink-0">
                  <Sparkles size={19} />
                </span>
              </h2>
              <p className="text-[14px] text-white/65 mt-1.5">Your trusted platform for household services and skilled providers.</p>
              <div className="flex flex-nowrap gap-1.5 mt-4 overflow-x-auto no-scrollbar">
                {[
                  { Icon: ShieldCheck, label: "Verified Providers" },
                  { Icon: Wallet, label: "Secure Payments" },
                  { Icon: Users, label: "Community Driven" },
                ].map(({ Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/40 border border-white/15 text-white/85 text-[11.5px] font-semibold whitespace-nowrap shrink-0">
                    <Icon size={13} /> {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative md:col-span-2 min-h-[180px] md:min-h-0">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2b2358] via-[#1a1740] to-[#0d0b24]" />
              <img
                src={HERO_IMG}
                alt="Cooperative workers at sunset"
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              {/* S-curve divider with violet glow, like target */}
              <svg className="absolute inset-y-0 left-0 h-full w-20 md:w-24 pointer-events-none" viewBox="0 0 96 240" preserveAspectRatio="none" aria-hidden>
                <path d="M96,0 C48,55 44,110 62,150 C76,182 66,212 48,240 L0,240 L0,0 Z" fill="#12173a" />
                <path d="M96,0 C48,55 44,110 62,150 C76,182 66,212 48,240" fill="none" stroke="#8b5cf6" strokeOpacity="0.55" strokeWidth="2" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a]/60 via-transparent to-transparent pointer-events-none" />
              <p className="absolute left-5 top-1/2 -translate-y-1/2 max-w-[190px] text-[13px] italic leading-snug text-white/90">
                &ldquo;Stronger Communities Through Better Support&rdquo;
              </p>
            </div>
          </div>

          {/* Quick action cards */}
          <div className="flex flex-col gap-3">
            <Link to="/household/dispatch" className="group flex items-center gap-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] hover:bg-emerald-500/[0.12] p-4 transition-all hh-hover">
              <Zap size={22} strokeWidth={2.2} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-bold text-on-surface">Book Instant Service</span>
                <span className="block text-[12px] text-on-surface-variant truncate">Find skilled providers near you</span>
              </span>
              <ChevronRight size={18} className="text-on-surface-variant group-hover:translate-x-0.5 group-hover:text-emerald-500 transition-all shrink-0" />
            </Link>
            <Link to="/household/bulk" className="group flex items-center gap-3.5 rounded-2xl border border-purple-500/30 bg-purple-500/[0.07] hover:bg-purple-500/[0.12] p-4 transition-all hh-hover">
              <Users size={22} strokeWidth={2.2} className="text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-bold text-on-surface">Create Bulk Request</span>
                <span className="block text-[12px] text-on-surface-variant truncate">For multiple workers</span>
              </span>
              <ChevronRight size={18} className="text-on-surface-variant group-hover:translate-x-0.5 group-hover:text-purple-400 transition-all shrink-0" />
            </Link>
            <Link to="/household/bookings" className="group flex items-center gap-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/[0.07] hover:bg-blue-500/[0.12] p-4 transition-all hh-hover">
              <Calendar size={22} strokeWidth={2.2} className="text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-bold text-on-surface">View Bookings</span>
                <span className="block text-[12px] text-on-surface-variant truncate">Track your active &amp; past bookings</span>
              </span>
              <ChevronRight size={18} className="text-on-surface-variant group-hover:translate-x-0.5 group-hover:text-blue-500 transition-all shrink-0" />
            </Link>
          </div>
        </div>

        {/* ── Stats + Total spent ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {loading ? (
              [0, 1, 2].map((i) => <div key={i} className="card h-[132px] animate-pulse" />)
            ) : (
              STATS.map(({ label, value, Icon, iconClass, trend, sub, spark, color }) => (
                <div key={label} className="card hh-hover !p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon size={20} strokeWidth={2.2} className={iconClass} />
                      <span className="text-[13px] font-semibold text-on-surface-variant">{label}</span>
                    </div>
                    <MoreHorizontal size={16} className="text-on-surface-variant/50" />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[30px] leading-none font-extrabold text-on-surface tracking-tight">{value}</p>
                      <p className="text-[12px] mt-1.5">
                        <span className={`font-bold ${trend.up === false ? "text-red-400" : "text-emerald-500"}`}>{trend.text}</span>
                        <span className="text-on-surface-variant"> · {sub}</span>
                      </p>
                    </div>
                    <Spark points={spark} stroke={color} />
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Total spent card */}
          <div className="card hh-hover !p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2.5 mb-3">
              <IndianRupee size={20} strokeWidth={2.2} className="text-amber-500" />
              <span className="text-[13px] font-semibold text-on-surface-variant">Total Spent</span>
              <Link to="/household/wallet" className="ml-auto text-[12px] font-bold text-primary hover:opacity-80">View →</Link>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[30px] leading-none font-extrabold text-on-surface tracking-tight">{formatMoney(spent)}</p>
                <p className="text-[12px] mt-1.5">
                  <span className={`font-bold ${ins.spendTrend.up === false ? "text-red-400" : "text-emerald-500"}`}>{ins.spendTrend.up === null ? "—" : "↑"} {ins.spendTrend.text.replace("+", "")}</span>
                  <span className="text-on-surface-variant"> · vs last month</span>
                </p>
              </div>
              <Spark points={ins.sparkSpend} stroke="#f59e0b" />
            </div>
            {walletBalance !== null && (
              <Link to="/household/wallet" className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary">
                <Wallet size={14} /> Wallet {formatMoney(walletBalance)}
              </Link>
            )}
          </div>
        </div>

        {/* ── Recommended + Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recommended carousel */}
          <section className="lg:col-span-2 card hh-hover !p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sparkles size={19} strokeWidth={2.2} className="text-primary" />
                <div>
                  <h3 className="text-[15px] font-bold text-on-surface">Recommended for You</h3>
                  <p className="text-[12px] text-on-surface-variant">Trusted and verified providers based on your past bookings &amp; preferences.</p>
                </div>
              </div>
              <Link to="/household/find" className="text-[12.5px] font-bold text-primary hover:opacity-80 flex items-center gap-1 shrink-0">Browse all <ArrowRight size={14} /></Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {[0, 1, 2].map((i) => <div key={i} className="h-56 rounded-xl bg-surface-container animate-pulse" />)}
              </div>
            ) : visibleRecs.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-outline-variant p-8 text-center">
                <p className="text-[13.5px] font-semibold text-on-surface">No recommendations yet</p>
                <p className="text-[12.5px] text-on-surface-variant mt-1">Book a service and we will personalise picks for you.</p>
                <Link to="/household/find" className="btn-primary !h-10 !text-[13px] mt-4">Find providers <ArrowRight size={15} /></Link>
              </div>
            ) : (
              <>
                <div className="relative mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {visibleRecs.map((p) => {
                      const rawAvatar = p.avatar || p.userId?.avatarUrl || "";
                      const avatar = rawAvatar
                        ? (rawAvatar.startsWith("http") || rawAvatar.startsWith("data:")
                          ? rawAvatar
                          : `${SERVER_URL}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`)
                        : "";
                      return (
                      <div key={p._id} className="group rounded-2xl border border-outline-variant bg-surface-container-low p-4 flex flex-col hover:border-primary/50 hover:shadow-[0_16px_44px_rgba(0,0,0,0.35)] hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
                        <div className="flex items-start gap-3 relative">
                          <div className="relative shrink-0">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={p.userId?.name || "Provider"}
                                loading="lazy"
                                onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
                                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/30 group-hover:ring-primary/60 group-hover:scale-105 transition-all duration-300"
                              />
                            ) : null}
                            <div
                              className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-fixed-dim text-on-primary items-center justify-center text-[18px] font-bold ring-2 ring-primary/30 ${avatar ? "hidden" : "flex"}`}
                              style={{ display: avatar ? "none" : undefined }}
                            >
                              {(p.userId?.name || "?").charAt(0)}
                            </div>
                            {p.verified && (
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface-container-low flex items-center justify-center">
                                <CheckCircle2 size={11} className="text-white" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-bold text-on-surface truncate">{p.userId?.name ?? "Provider"}</p>
                            <p className="text-[11.5px] text-on-surface-variant truncate">{(p.skills || [])[0] || "Service Provider"} · {p.completedJobs || 0}+ yrs exp</p>
                            {p.verified && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-[10.5px] font-bold"><CheckCircle2 size={11} /> Verified</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-[12px] relative">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-500"><Star size={13} fill="currentColor" strokeWidth={0} />{(p.rating || 4.5).toFixed(1)}</span>
                          <span className="text-on-surface-variant">({p.completedJobs || 0}+)</span>
                          <span className="ml-auto font-extrabold text-on-surface text-[14px]">₹{p.hourlyRate || 250}<span className="font-medium text-on-surface-variant text-[11px]">/hr</span></span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2.5 relative">
                          {(p.skills || []).slice(0, 3).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">{s}</span>
                          ))}
                        </div>
                        <Link to={`/household/book/${p._id}`} className="relative mt-3 h-10 rounded-xl bg-white text-[#0b1020] text-[13px] font-bold flex items-center justify-center gap-1.5 hover:brightness-95 hover:shadow-lg active:scale-[0.98] transition-all">
                          Book Now <ArrowRight size={14} />
                        </Link>
                      </div>
                      );
                    })}
                  </div>
                  {recs.length > 3 && (
                    <>
                      <button onClick={() => setRecIdx(Math.max(0, recIdx - 3))} disabled={recIdx === 0} aria-label="Previous providers" className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant items-center justify-center text-on-surface hover:text-primary disabled:opacity-30 transition-all">
                        <ChevronLeft size={16} />
                      </button>
                      <button onClick={() => setRecIdx(recIdx + 3 >= recs.length ? 0 : recIdx + 3)} aria-label="Next providers" className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant items-center justify-center text-on-surface hover:text-primary transition-all">
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </div>
                {recs.length > 3 && (
                  <div className="flex justify-center gap-1.5 mt-4">
                    {Array.from({ length: Math.ceil(recs.length / 3) }).map((_, i) => (
                      <span key={i} className={`h-1.5 rounded-full transition-all ${Math.floor(recIdx / 3) === i ? "w-6 bg-primary" : "w-1.5 bg-outline-variant"}`} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Activity column */}
          <div className="space-y-4">
            <section className="card hh-hover !p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-on-surface-variant" />
                  <h3 className="text-[14px] font-bold text-on-surface">Recent Activity</h3>
                </div>
                <Link to="/household/bookings" className="text-[12px] font-bold text-primary hover:opacity-80">View all →</Link>
              </div>
              {recentActivity.length === 0 ? (
                <p className="text-[12.5px] text-on-surface-variant">No activity yet — your bookings will appear here.</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex gap-2.5">
                      <a.Icon size={19} strokeWidth={2.2} className={`${a.tone} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-bold text-on-surface truncate">{a.title}</p>
                          <span className="text-[11px] text-on-surface-variant shrink-0">{a.time}</span>
                        </div>
                        <p className="text-[12px] text-on-surface-variant truncate">{a.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-outline-variant">
                <Link to="/household/find" className="flex items-center gap-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25 p-3 hover:bg-emerald-500/[0.14] transition-all group">
                  <ShieldCheck size={20} strokeWidth={2.2} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-bold text-on-surface">Your safety matters</span>
                    <span className="block text-[11.5px] text-on-surface-variant leading-snug">All providers are verified and background checked for your peace of mind.</span>
                  </span>
                  <ChevronRight size={16} className="text-on-surface-variant group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              </div>
            </section>

            {/* Wallet strip */}
            <Link to="/household/wallet" className="card hh-hover !p-4 flex items-center gap-3 hover:border-primary/40 transition-all group">
              <Package size={20} strokeWidth={2.2} className="text-primary shrink-0" />
              <span className="flex-1">
                <span className="block text-[13px] font-bold text-on-surface">Wallet {walletBalance !== null ? `· ${formatMoney(walletBalance)}` : ""}</span>
                <span className="block text-[11.5px] text-on-surface-variant">Top-up, refunds &amp; credits</span>
              </span>
              <ChevronRight size={16} className="text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
