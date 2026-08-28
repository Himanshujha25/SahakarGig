import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import VerifiedBadge from "../../components/VerifiedBadge";
import {
  CalendarDays, Search, Star, IndianRupee, ArrowRight,
  CheckCircle2, Clock, AlertTriangle, MapPin, Zap, Mic
} from "lucide-react";
import AIVoiceSearchModal from "../../components/AIVoiceSearchModal";
import ThemeToggle from "../../components/ThemeToggle";

function formatMoney(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

const STATUS_STYLE = {
  pending:   { bg: "badge-pending",   dot: "bg-amber-600 dark:bg-amber-400",  label: "Pending"   },
  accepted:  { bg: "badge-accepted",  dot: "bg-primary-container",       label: "Accepted"  },
  completed: { bg: "badge-completed", dot: "bg-secondary-container",     label: "Completed" },
  disputed:  { bg: "badge-disputed",  dot: "bg-error",                   label: "Disputed"  },
  cancelled: { bg: "bg-surface-container text-on-surface-variant border border-outline-variant/40", dot: "bg-outline", label: "Cancelled" },
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings]   = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [service, setService]     = useState("");
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: bk }, { data: pv }] = await Promise.all([
        api.get("/bookings/household/mine"),
        api.get("/providers"),
      ]);
      setBookings(Array.isArray(bk) ? bk : (bk?.bookings ?? []));
      // Backend responds with { providers, total, page, pages }
      const list = Array.isArray(pv) ? pv : (pv?.providers ?? []);
      setProviders(list.slice(0, 6));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  // Derived stats from real bookings
  const total     = bookings.length;
  const active    = bookings.filter(b => ["pending","accepted"].includes(b.status)).length;
  const completed = bookings.filter(b => b.status === "completed").length;
  const spent     = bookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.price || 0), 0);

  const STAT_CARDS = [
    { label: "Total Bookings",    value: total,            Icon: CalendarDays, bg: "icon-box-blue",  ic: "text-current" },
    { label: "Active",            value: active,           Icon: Clock,        bg: "icon-box-amber", ic: "text-current", accent: active > 0 },
    { label: "Completed",         value: completed,        Icon: CheckCircle2, bg: "icon-box-green", ic: "text-current" },
    { label: "Total Spent",       value: formatMoney(spent), Icon: IndianRupee, bg: "icon-box-blue",  ic: "text-current" },
  ];

  function goSearch(e) {
    e.preventDefault();
    navigate(`/household/find?service=${encodeURIComponent(service)}`);
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-6">

      {/* ── Orvia Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="orvia-badge-lime">
              <span className="w-2 h-2 rounded-full bg-[#65a30d] animate-pulse" />
              Live Cooperative Network
            </span>
            <span className="text-xs text-slate-400 font-medium">• {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Hey, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Book verified service providers endorsed by your local cooperative society.
          </p>
        </div>

        {/* Orvia Pill Search & Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="h-10 inline-flex items-center gap-2 px-4 rounded-full bg-[#1e6b65] text-white text-xs font-bold shadow-md hover:bg-[#145e58] hover:shadow-lg transition-all"
          >
            <Mic size={14} className="animate-bounce" />
            <span>Voice AI</span>
          </button>

          <form onSubmit={goSearch} className="flex items-center gap-2 h-10 px-4 rounded-full border border-slate-200 bg-white shadow-sm hover:border-[#1e6b65]/40 transition-all">
            <Search size={14} className="text-slate-400 shrink-0" strokeWidth={2} />
            <input
              className="w-36 bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Search services…"
              value={service}
              onChange={e => setService(e.target.value)}
            />
          </form>

          <Link to="/household/bookings"
            className="orvia-pill-selected inline-flex items-center gap-2">
            <CalendarDays size={14} strokeWidth={2} />
            <span>My Bookings</span>
          </Link>
        </div>
        <AIVoiceSearchModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
      </div>

      {/* ── Orvia Insight Hero Banner Card ── */}
      <div className="orvia-insight-card flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="orvia-badge-lime">
              <CheckCircle2 size={13} /> 100% Escrow Protected
            </span>
            <span className="text-xs text-slate-500 font-semibold">• Up next · Today</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Your Care & Service Journey</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Instant geospatial AI dispatch connecting you with background-checked community experts in under 15 minutes.
          </p>
        </div>
        <Link to="/household/find" className="orvia-btn-primary shrink-0">
          <span>Book Instant Service</span>
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>

      {/* ── Orvia Stat Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="animate-pulse rounded-[28px] border border-slate-200 bg-white h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, Icon, accent }) => (
            <div key={label}
              className="orvia-card flex flex-col justify-between group">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <div className="w-9 h-9 rounded-full bg-[#e6f4f1] text-[#145e58] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Icon size={17} strokeWidth={2} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className={`text-2xl md:text-3xl font-extrabold tracking-tight ${accent ? "text-[#1e6b65]" : "text-slate-900"}`}>
                  {value}
                </p>
                <span className="text-xs font-bold text-slate-400 group-hover:text-[#1e6b65] transition-colors">↗</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Recent Bookings Card */}
        <section className="lg:col-span-2 orvia-card p-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#0f172a] text-white flex items-center justify-center">
                <CalendarDays size={16} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Service Bookings</h3>
                <p className="text-xs text-slate-400 font-medium">Track active dispatches & history</p>
              </div>
            </div>
            <Link to="/household/find"
              className="flex items-center gap-1 text-xs font-bold text-[#1e6b65] hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 p-4">
              {[0,1,2].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-slate-200" />
                    <div className="h-3 w-1/4 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <CheckCircle2 size={44} className="text-slate-300" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-slate-700">No active bookings yet</p>
              <p className="text-xs text-slate-400">Discover verified local providers in your neighborhood.</p>
              <Link to="/household/find" className="orvia-btn-primary mt-2">
                Browse Categories ↗
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full min-w-[500px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.slice(0, 6).map(b => {
                    const s = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
                    return (
                      <tr key={b._id}
                        onClick={() => navigate(`/household/booking/${b._id}`)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-[#1e6b65] transition-colors">{b.service}</p>
                            {b.isEmergency && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold">
                                <Zap size={10} /> Emergency
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                          {b.providerId?.userId?.name || "Provider"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="orvia-badge-lime">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#65a30d]" />
                            {s.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-extrabold text-slate-900">
                          ₹{b.price ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Top Verified Providers Card */}
        <section className="orvia-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#f7fee7] text-[#4d7c0f] border border-[#d9f99d] flex items-center justify-center">
                  <Star size={16} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Top Verified Experts</h3>
                  <p className="text-xs text-slate-400 font-medium">Cooperative Endorsed</p>
                </div>
              </div>
              <Link to="/household/find" className="text-xs font-bold text-[#1e6b65] hover:underline">
                View all
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 pt-3">
                {[0,1,2].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 rounded bg-slate-200" />
                      <div className="h-3 w-1/3 rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Star size={36} className="text-slate-300" strokeWidth={1.5} />
                <p className="text-xs text-slate-500 font-medium">No providers registered yet.</p>
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                {providers.map(p => (
                  <div key={p._id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 bg-slate-50/60 hover:bg-white hover:border-[#1e6b65]/30 hover:shadow-sm transition-all">
                    <div className="w-10 h-10 rounded-full bg-[#1e6b65] text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm">
                      {(p.userId?.name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.userId?.name ?? "Provider"}</p>
                        {p.verified && <VerifiedBadge />}
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 truncate">
                        {(p.skills || [])[0] || "Service"} · ₹{p.hourlyRate}/hr
                      </p>
                    </div>
                    <Link to={`/household/book/${p._id}`}
                      className="shrink-0 text-xs font-bold text-white bg-[#0f172a] hover:bg-[#1e6b65] px-3.5 py-1.5 rounded-full transition-colors">
                      Book
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400 font-medium">100% Identity & Background Verified</span>
          </div>
        </section>
      </div>
    </div>
  );
}
