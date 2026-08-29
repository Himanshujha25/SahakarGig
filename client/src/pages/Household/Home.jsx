import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import VerifiedBadge from "../../components/VerifiedBadge";
import {
  CalendarDays, Search, Star, IndianRupee, ArrowRight,
  CheckCircle2, Clock, AlertTriangle, MapPin, Zap, Mic, Heart, Sparkles, Building2
} from "lucide-react";
import AIVoiceSearchModal from "../../components/AIVoiceSearchModal";

function formatMoney(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

const STATUS_STYLE = {
  pending:   { bg: "bg-amber-50 text-amber-800 border-amber-200",   dot: "bg-amber-600",  label: "Pending"   },
  accepted:  { bg: "bg-[#e8edff] text-[#00288e] border-[#00288e]/20",  dot: "bg-[#00288e]", label: "Accepted"  },
  completed: { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-600", label: "Completed" },
  disputed:  { bg: "bg-red-50 text-red-800 border-red-200",   dot: "bg-red-600", label: "Disputed"  },
  cancelled: { bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", label: "Cancelled" },
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings]   = useState([]);
  const [providers, setProviders] = useState([]);
  const [recs, setRecs]           = useState([]);
  const [recReason, setRecReason] = useState("");
  const [loading, setLoading]     = useState(true);
  const [service, setService]     = useState("");
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ data: bk }, { data: pv }, recRes, wRes] = await Promise.all([
        api.get("/bookings/household/mine"),
        api.get("/providers"),
        api.get("/ai/recommend").catch(() => null),
        api.get("/wallet").catch(() => null),
      ]);
      setBookings(Array.isArray(bk) ? bk : (bk?.bookings ?? []));
      const list = Array.isArray(pv) ? pv : (pv?.providers ?? []);
      setProviders(list.slice(0, 6));
      if (recRes?.data?.recommendations) {
        setRecs(recRes.data.recommendations);
        setRecReason(recRes.data.hasHistory ? "" : "Getting started — here are top verified experts");
      }
      if (wRes?.data && typeof wRes.data.balance === "number") setWalletBalance(wRes.data.balance);
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
    { label: "Total Bookings",    value: total,              Icon: CalendarDays, bg: "bg-[#e8edff] text-[#00288e]" },
    { label: "Active",            value: active,             Icon: Clock,        bg: "bg-amber-50 text-amber-700", accent: active > 0 },
    { label: "Completed",         value: completed,          Icon: CheckCircle2, bg: "bg-emerald-50 text-emerald-700" },
    { label: "Total Spent",       value: formatMoney(spent), Icon: IndianRupee,  bg: "bg-blue-50 text-[#00288e]" },
  ];

  function goSearch(e) {
    e.preventDefault();
    if (!service.trim()) return;
    navigate(`/household/find?service=${encodeURIComponent(service)}`);
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-6">

      {/* ── Top Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#e8edff] text-[#00288e] text-xs font-bold border border-[#00288e]/20">
              <span className="w-2 h-2 rounded-full bg-[#00288e] animate-ping" />
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

        {/* Action Buttons & Search */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="h-9 inline-flex items-center gap-2 px-3.5 rounded-xl bg-[#00288e] text-white text-xs font-bold shadow-xs hover:bg-[#173bab] active:scale-98 transition-all cursor-pointer"
          >
            <Mic size={14} className="animate-bounce" />
            <span>Voice AI</span>
          </button>

          {walletBalance !== null && (
            <Link to="/household/wallet"
              className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-[#00288e]/40 hover:text-[#00288e] transition-all">
              <IndianRupee size={13} className="text-[#00288e]" strokeWidth={2.5} />
              <span>Wallet {formatMoney(walletBalance)}</span>
            </Link>
          )}

          <form onSubmit={goSearch} className="flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:border-[#00288e]/40 focus-within:border-[#00288e] transition-all">
            <Search size={14} className="text-slate-400 shrink-0" strokeWidth={2} />
            <input
              className="w-32 bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Search services…"
              value={service}
              onChange={e => setService(e.target.value)}
            />
          </form>

          <Link to="/household/bookings"
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-[#00288e] text-white text-xs font-bold shadow-xs hover:bg-[#173bab] transition-all">
            <CalendarDays size={14} strokeWidth={2} />
            <span>My Bookings</span>
          </Link>

          <Link to="/household/saved"
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-[#00288e]/40 hover:text-[#00288e] transition-all"
            title="Saved Providers">
            <Heart size={14} strokeWidth={2} />
            <span>Saved</span>
          </Link>
        </div>
        <AIVoiceSearchModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
      </div>

      {/* ── Blue-Themed Hero Banner Card (Crisp rounded-2xl) ── */}
      <div className="rounded-2xl border border-[#00288e]/20 bg-gradient-to-r from-[#e8edff]/90 via-blue-50/70 to-slate-50 p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-[#00288e]/30 text-[11px] font-bold text-[#00288e]">
              <CheckCircle2 size={12} /> 100% Escrow Protected
            </span>
            <span className="text-xs text-slate-500 font-semibold">• Up next · Today</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Your Care & Service Journey
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Instant geospatial AI dispatch connecting you with background-checked community experts in under 15 minutes.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Link to="/household/bulk" className="h-10 inline-flex items-center gap-1.5 px-4 rounded-xl border border-[#00288e]/30 bg-white text-[#00288e] text-xs font-bold shadow-xs hover:bg-[#e8edff] transition-all">
            <Building2 size={14} />
            <span>Bulk Crew RFP</span>
          </Link>
          <Link to="/household/find" className="h-10 inline-flex items-center gap-2 px-4 rounded-xl bg-[#00288e] hover:bg-[#173bab] text-white text-xs font-bold shadow-xs active:scale-98 transition-all">
            <span>Book Instant Service</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {/* ── Stat Cards (Crisp rounded-2xl) ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, Icon, bg, accent }) => (
            <div key={label}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-[#00288e]/40 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${bg} group-hover:scale-105 transition-transform`}>
                  <Icon size={16} strokeWidth={2} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <p className={`text-2xl font-black tracking-tight ${accent ? "text-[#00288e]" : "text-slate-900"}`}>
                  {value}
                </p>
                <span className="text-xs font-bold text-slate-300 group-hover:text-[#00288e] transition-colors">↗</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AI Recommended for You (Crisp rounded-2xl) ── */}
      {!loading && recs.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e8edff] text-[#00288e] flex items-center justify-center shrink-0">
                <Sparkles size={16} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>Recommended for You</h3>
                <p className="text-xs text-slate-400 font-medium">
                  {recReason || "Personalised picks from your booking history"}
                </p>
              </div>
            </div>
            <Link to="/household/find" className="text-xs font-bold text-[#00288e] hover:underline shrink-0">
              Browse all
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recs.slice(0, 3).map((p) => {
              let trust = p.trustScore || 50;
              if (p.verified) trust += 20;
              if (p.rating >= 4.5) trust += 15;
              if (p.completedJobs >= 10) trust += 15;
              trust = Math.min(100, trust);
              return (
                <div key={p._id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 hover:bg-white hover:border-[#00288e]/40 hover:shadow-xs transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00288e] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      {(p.userId?.name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">{p.userId?.name ?? "Provider"}</p>
                        {p.verified && <VerifiedBadge />}
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 truncate">
                        {(p.skills || [])[0] || "Service"} · ₹{p.hourlyRate}/hr
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Star size={11} fill="currentColor" /> {trust}
                    </span>
                    <span className="text-slate-500 font-medium truncate ml-2" title={p.reason}>
                      {p.reason}
                    </span>
                  </div>

                  <Link to={`/household/book/${p._id}`}
                    className="w-full h-8 flex items-center justify-center rounded-lg text-xs font-bold text-white bg-[#00288e] hover:bg-[#173bab] transition-colors">
                    Book
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Recent Bookings Card (Crisp rounded-2xl) */}
        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00288e] text-white flex items-center justify-center">
                <CalendarDays size={15} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>Recent Service Bookings</h3>
                <p className="text-xs text-slate-400 font-medium">Track active dispatches & history</p>
              </div>
            </div>
            <Link to="/household/bookings"
              className="flex items-center gap-1 text-xs font-bold text-[#00288e] hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 p-4">
              {[0,1,2].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 py-4">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-slate-200" />
                    <div className="h-3 w-1/4 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-14 px-6 text-center">
              <CheckCircle2 size={38} className="text-slate-300" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-slate-700">No active bookings yet</p>
              <p className="text-xs text-slate-400">Discover verified local providers in your neighborhood.</p>
              <Link to="/household/find" className="h-9 inline-flex items-center gap-1.5 px-4 rounded-xl bg-[#00288e] text-white text-xs font-bold mt-2 hover:bg-[#173bab] transition">
                Browse Categories ↗
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full min-w-[500px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/40">
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Service</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Provider</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.slice(0, 6).map(b => {
                    const s = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
                    return (
                      <tr key={b._id}
                        onClick={() => navigate(`/household/booking/${b._id}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#00288e] transition-colors">{b.service}</p>
                            {b.isEmergency && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                                <Zap size={9} /> Emergency
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-medium text-slate-500">
                          {b.providerId?.userId?.name || "Provider"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${s.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs sm:text-sm font-extrabold text-slate-900">
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

        {/* Top Verified Providers Card (Crisp rounded-2xl) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#e8edff] text-[#00288e] border border-[#00288e]/20 flex items-center justify-center">
                  <Star size={15} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>Top Verified Experts</h3>
                  <p className="text-xs text-slate-400 font-medium">Cooperative Endorsed</p>
                </div>
              </div>
              <Link to="/household/find" className="text-xs font-bold text-[#00288e] hover:underline">
                View all
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2.5 pt-3">
                {[0,1,2].map(i => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-2.5 rounded-xl border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 rounded bg-slate-200" />
                      <div className="h-3 w-1/3 rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Star size={32} className="text-slate-300" strokeWidth={1.5} />
                <p className="text-xs text-slate-500 font-medium">No providers registered yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-3">
                {providers.map(p => (
                  <div key={p._id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 bg-slate-50/70 hover:bg-white hover:border-[#00288e]/30 hover:shadow-xs transition-all">
                    <div className="w-9 h-9 rounded-xl bg-[#00288e] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      {(p.userId?.name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.userId?.name ?? "Provider"}</p>
                        {p.verified && <VerifiedBadge />}
                      </div>
                      <p className="text-[10.5px] font-medium text-slate-500 truncate">
                        {(p.skills || [])[0] || "Service"} · ₹{p.hourlyRate}/hr
                      </p>
                    </div>
                    <Link to={`/household/book/${p._id}`}
                      className="shrink-0 text-xs font-bold text-white bg-[#00288e] hover:bg-[#173bab] px-3 py-1 rounded-lg transition-colors">
                      Book
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 font-medium">100% Identity & Background Verified</span>
          </div>
        </section>
      </div>
    </div>
  );
}
