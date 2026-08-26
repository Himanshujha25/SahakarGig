import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import VerifiedBadge from "../../components/VerifiedBadge";
import {
  CalendarDays, Search, Star, IndianRupee, ArrowRight,
  CheckCircle2, Clock, AlertTriangle, MapPin, Zap
} from "lucide-react";

function formatMoney(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

const STATUS_STYLE = {
  pending:   { bg: "bg-[#fff3e0] text-[#6b4200]",   dot: "bg-[#6b4200]",  label: "Pending"   },
  accepted:  { bg: "bg-[#e8edff] text-[#00288e]",   dot: "bg-[#00288e]",  label: "Accepted"  },
  completed: { bg: "bg-[#e6f9ec] text-[#006d30]",   dot: "bg-[#006d30]",  label: "Completed" },
  disputed:  { bg: "bg-[#fce8e8] text-[#ba1a1a]",   dot: "bg-[#ba1a1a]",  label: "Disputed"  },
  cancelled: { bg: "bg-surface-container text-on-surface-variant", dot: "bg-outline", label: "Cancelled" },
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings]   = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [service, setService]     = useState("");

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
    { label: "Total Bookings",    value: total,            Icon: CalendarDays, bg: "bg-[#e8edff]", ic: "text-[#00288e]" },
    { label: "Active",            value: active,           Icon: Clock,        bg: "bg-[#fff3e0]", ic: "text-[#6b4200]", accent: active > 0 },
    { label: "Completed",         value: completed,        Icon: CheckCircle2, bg: "bg-[#e6f9ec]", ic: "text-[#006d30]" },
    { label: "Total Spent",       value: formatMoney(spent), Icon: IndianRupee, bg: "bg-[#e8edff]", ic: "text-[#00288e]" },
  ];

  function goSearch(e) {
    e.preventDefault();
    navigate(`/household/find?service=${encodeURIComponent(service)}`);
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="w-full px-6 pt-8 pb-10 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Find verified cooperative service providers near you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={goSearch} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-outline-variant bg-surface hover:border-primary/40 transition-all duration-200">
            <Search size={13} className="text-outline shrink-0" strokeWidth={2} />
            <input
              className="w-36 bg-transparent text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant/50"
              placeholder="Search services…"
              value={service}
              onChange={e => setService(e.target.value)}
            />
          </form>
          <Link to="/household/bookings"
            className="h-9 inline-flex items-center gap-2 px-4 rounded-xl border border-outline-variant bg-surface text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:bg-[#e8edff] hover:text-[#00288e] transition-all duration-200">
            <CalendarDays size={14} strokeWidth={2} />
            My Bookings
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, Icon, bg, ic, accent }) => (
            <div key={label}
              className="group relative overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface p-5 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] hover:border-outline transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">{label}</p>
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={17} strokeWidth={2} className={ic} />
                </div>
              </div>
              <p className={`text-[28px] font-bold tracking-tight leading-none ${accent ? "text-[#6b4200]" : "text-on-surface"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Recent bookings */}
        <section className="lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#e8edff] flex items-center justify-center">
                <CalendarDays size={15} className="text-[#00288e]" strokeWidth={2} />
              </div>
              <h3 className="text-[15px] font-bold text-on-surface">Recent Bookings</h3>
            </div>
            <Link to="/household/find"
              className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-[#173bab] transition-colors">
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-outline-variant/30">
              {[0,1,2].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-full bg-surface-container shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-surface-container" />
                    <div className="h-3 w-1/4 rounded bg-surface-container" />
                  </div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <CheckCircle2 size={40} className="text-outline-variant" strokeWidth={1.5} />
              <p className="text-[14px] text-on-surface-variant">No bookings yet. Find a provider to get started.</p>
              <Link to="/household/bookings"
                className="text-[13px] font-semibold text-primary hover:underline">Browse providers →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead>
                  <tr className="border-b border-outline-variant/40 bg-surface-container-low">
                    <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Service</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Provider</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Status</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {bookings.slice(0, 6).map(b => {
                    const s = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
                    return (
                      <tr key={b._id}
                        onClick={() => navigate(`/household/booking/${b._id}`)}
                        className="hover:bg-surface-container-low/50 transition-colors cursor-pointer">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold text-on-surface">{b.service}</p>
                            {b.isEmergency && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fce8e8] text-[#ba1a1a] text-[10px] font-bold">
                                <Zap size={10} /> Emergency
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-[13px] text-on-surface-variant">
                          {b.providerId?.userId?.name || "Provider"}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${s.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-[14px] font-bold text-on-surface">
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

        {/* Verified providers */}
        <section className="rounded-2xl border border-outline-variant/60 bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#e6f9ec] flex items-center justify-center">
                <Star size={15} className="text-[#006d30]" strokeWidth={2} />
              </div>
              <h3 className="text-[15px] font-bold text-on-surface">Top Providers</h3>
            </div>
            <Link to="/household/find"
              className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-[#173bab] transition-colors">
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl border border-outline-variant/40">
                  <div className="w-9 h-9 rounded-full bg-surface-container shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-surface-container" />
                    <div className="h-3 w-1/3 rounded bg-surface-container" />
                  </div>
                </div>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant/60 py-10 text-center">
              <Star size={32} className="text-outline-variant" strokeWidth={1.5} />
              <p className="text-[13px] text-on-surface-variant">No providers available yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {providers.map(p => (
                <div key={p._id}
                  className="flex items-center gap-3 rounded-xl border border-outline-variant/40 p-3 hover:border-primary/30 hover:bg-surface-container-low transition-all duration-200">
                  <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-[13px] font-bold text-on-primary-container shrink-0">
                    {(p.userId?.name || "?").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-on-surface truncate">{p.userId?.name ?? "Provider"}</p>
                      {p.verified && <VerifiedBadge />}
                    </div>
                    <p className="text-[11px] text-on-surface-variant truncate">
                      {(p.skills || [])[0] || "Service"} · ₹{p.hourlyRate}/hr
                    </p>
                  </div>
                  <Link to={`/household/book/${p._id}`}
                    className="shrink-0 text-[12px] font-bold text-[#00288e] bg-[#e8edff] px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all duration-200">
                    Book
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
