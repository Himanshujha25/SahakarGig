import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import {
  CalendarDays, Users, ShieldAlert, IndianRupee,
  TrendingUp, CheckCircle2, Trophy, ArrowRight, BarChart3, ChevronDown, Zap
} from "lucide-react";

const TIMEFRAMES = [
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

function TimeframePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = TIMEFRAMES.find(t => t.value === value);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`h-9 inline-flex items-center gap-2 px-4 rounded-xl border text-[13px] font-semibold transition-all duration-200 ${
          open
            ? "border-primary bg-[#e8edff] text-[#00288e]"
            : "border-outline-variant bg-surface text-on-surface hover:border-primary/40 hover:bg-surface-container-low"
        }`}
      >
        {selected?.label}
        <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-40 rounded-2xl border border-outline-variant/60 bg-surface shadow-[0_8px_32px_rgba(0,40,142,0.12)] overflow-hidden">
          <div className="p-1.5 space-y-0.5">
            {TIMEFRAMES.map(t => (
              <button
                key={t.value}
                onClick={() => { onChange(t.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                  t.value === value
                    ? "bg-[#e8edff] text-[#00288e]"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                {t.label}
                {t.value === value && <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatMoney(value) {
  const n = Number(value) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

const STAT_META = {
  bookings:      { Icon: CalendarDays,  bg: "bg-[#e8edff]", ic: "text-[#00288e]" },
  providers:     { Icon: Users,         bg: "bg-[#e6f9ec]", ic: "text-[#006d30]" },
  verifications: { Icon: ShieldAlert,   bg: "bg-[#fce8e8]", ic: "text-[#ba1a1a]" },
  revenue:       { Icon: IndianRupee,   bg: "bg-[#fff3e0]", ic: "text-[#6b4200]" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState("week");
  const [stats, setStats] = useState(null);
  const [coopName, setCoopName] = useState("");
  const [disputes, setDisputes] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demand, setDemand] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ds }, { data: dp }, { data: vf }, { data: lb }, { data: dm }] = await Promise.all([
        api.get(`/admin/dashboard?range=${timeframe}`),
        api.get("/admin/disputes"),
        api.get("/admin/verifications"),
        api.get("/admin/leaderboard"),
        api.get("/ai/demand?range=7"),
      ]);
      setStats(ds);
      if (ds?.cooperativeName) setCoopName(ds.cooperativeName);
      setDisputes(dp || []);
      setVerifications(vf || []);
      setLeaderboard(lb || []);
      setDemand(dm || null);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => { load(); }, [load]);

  // Real-time polling every 30s
  useEffect(() => {
    const id = setInterval(() => { load(); }, 30000);
    return () => clearInterval(id);
  }, [load]);

  const cards = stats ? [
    { key: "bookings",      label: "Total Bookings",         value: (stats.totalBookings ?? 0).toLocaleString("en-IN") },
    { key: "providers",     label: "Active Providers",       value: (stats.providers ?? 0).toLocaleString("en-IN") },
    { key: "verifications", label: "Pending Verifications",  value: String(stats.pendingVerifications ?? 0), accent: true },
    { key: "revenue",       label: "Revenue",                value: formatMoney(stats.revenue ?? 0) },
  ] : [];

  const series = stats?.revenueSeries || [];
  const maxRevenue = Math.max(1, ...series.map((s) => s.value));

  return (
    <div className="w-full px-6 pt-8 pb-24 lg:pb-10 space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Dashboard
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            {coopName
              ? <><span className="font-semibold text-primary">{coopName}</span> · Cooperative Dashboard</>  
              : "System performance and network health for your cooperative."
            }
          </p>
        </div>
        <TimeframePicker value={timeframe} onChange={setTimeframe} />
      </div>

      {/* ── Stat cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0,1,2,3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface p-5 h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ key, label, value, accent }) => {
            const { Icon, bg, ic } = STAT_META[key];
            return (
              <div key={key}
                className="group relative overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface p-5 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] hover:border-outline transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">{label}</p>
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={17} strokeWidth={2} className={ic} />
                  </div>
                </div>
                <p className={`text-[28px] font-bold tracking-tight leading-none ${accent ? "text-error" : "text-on-surface"}`}>
                  {value}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left col */}
        <div className="space-y-6 lg:col-span-2">

          {/* Revenue chart */}
          <section className="rounded-2xl border border-outline-variant/60 bg-surface p-6" style={{ height: 340 }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#e8edff] flex items-center justify-center">
                  <BarChart3 size={16} className="text-[#00288e]" strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-bold text-on-surface">Revenue Growth</h3>
              </div>
              <span className="text-[12px] font-semibold text-on-surface-variant capitalize px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/50">
                {timeframe}ly
              </span>
            </div>

            {series.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 h-[220px] rounded-xl border border-dashed border-outline-variant/60 text-center">
                <TrendingUp size={36} className="text-outline-variant" strokeWidth={1.5} />
                <p className="text-[14px] text-on-surface-variant max-w-xs">
                  No revenue data yet. Data appears once bookings are paid.
                </p>
              </div>
            ) : (
              <div className="relative flex items-end justify-around gap-1 px-1 pb-1 pt-4" style={{ height: 220 }}>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 flex flex-col justify-between pb-1">
                  {[0,1,2,3].map((i) => <div key={i} className="h-px w-full bg-outline-variant/20" />)}
                </div>
                {series.map((s, i) => {
                  const h = Math.round((s.value / maxRevenue) * 100);
                  return (
                    <div key={i} className="group/bar relative flex h-full w-full flex-col items-center justify-end">
                      <div
                        className="w-full max-w-[28px] rounded-t-lg bg-[#e8edff] transition-all duration-300 group-hover/bar:bg-[#00288e]"
                        style={{ height: `${Math.max(h, 3)}%` }}
                      />
                      <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-on-surface px-2.5 py-1 text-[11px] text-surface opacity-0 transition-opacity group-hover/bar:opacity-100">
                        {s.label} · {formatMoney(s.value)}
                      </div>
                      <span className="mt-2 hidden text-[10px] text-on-surface-variant sm:block">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* AI Demand Forecast */}
          {demand && (
            <section className="rounded-2xl border border-outline-variant/60 bg-surface p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#fff3e0] flex items-center justify-center">
                    <Zap size={16} className="text-[#6b4200]" strokeWidth={2} />
                  </div>
                  <h3 className="text-[15px] font-bold text-on-surface">AI Demand Forecast</h3>
                </div>
                <span className="text-[12px] font-semibold text-on-surface-variant px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/50">
                  Last 7 days
                </span>
              </div>

              {/* Hourly demand bar chart */}
              <div className="mb-4">
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Bookings by Hour of Day</p>
                <div className="flex items-end gap-0.5 h-16">
                  {demand.hourlyTotals.map((h) => {
                    const max = Math.max(1, ...demand.hourlyTotals.map((x) => x.count));
                    const pct = Math.round((h.count / max) * 100);
                    return (
                      <div key={h.hour} className="group/h relative flex-1 flex flex-col items-center justify-end h-full">
                        <div
                          className="w-full rounded-t bg-[#e8edff] group-hover/h:bg-[#00288e] transition-colors"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        />
                        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-on-surface px-1.5 py-0.5 text-[10px] text-surface opacity-0 group-hover/h:opacity-100 z-10">
                          {h.hour}:00 · {h.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-on-surface-variant">
                  <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
                </div>
              </div>

              {/* Top services */}
              {demand.topServices.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Top Demanded Services</p>
                  <div className="space-y-2">
                    {demand.topServices.slice(0, 4).map((s) => {
                      const max = demand.topServices[0].total || 1;
                      return (
                        <div key={s.service} className="flex items-center gap-3">
                          <span className="text-[12px] font-semibold text-on-surface w-24 truncate shrink-0">{s.service}</span>
                          <div className="flex-1 h-2 rounded-full bg-surface-container-low overflow-hidden">
                            <div className="h-full rounded-full bg-[#00288e] transition-all"
                              style={{ width: `${Math.round((s.total / max) * 100)}%` }} />
                          </div>
                          <span className="text-[11px] text-on-surface-variant w-8 text-right shrink-0">{s.total}</span>
                          <span className="text-[10px] text-on-surface-variant shrink-0">peak {s.peakHour}:00</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Recent disputes */}
          <section className="rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#fce8e8] flex items-center justify-center">
                  <ShieldAlert size={15} className="text-[#ba1a1a]" strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-bold text-on-surface">Recent Disputes</h3>
              </div>
              <Link to="/admin/disputes" className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary-container transition-colors">
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {disputes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <CheckCircle2 size={40} className="text-secondary" strokeWidth={1.5} />
                <p className="text-[14px] text-on-surface-variant">No active disputes. Everything looks healthy.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left">
                  <thead>
                    <tr className="border-b border-outline-variant/40">
                      <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Household</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Service</th>
                      <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Status</th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {disputes.slice(0, 5).map((d) => (
                      <tr key={d._id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-[12px] font-bold text-on-primary-container shrink-0">
                              {(d.householdId?.name || "?").charAt(0)}
                            </div>
                            <span className="text-[14px] font-semibold text-on-surface">{d.householdId?.name ?? "Household"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-[13px] text-on-surface-variant">{d.service}</td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-error-container px-2.5 py-1 text-[11px] font-bold text-on-error-container">
                            <span className="w-1.5 h-1.5 rounded-full bg-error" />
                            Disputed
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-[14px] font-bold text-on-surface">₹{d.price ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right col */}
        <div className="space-y-6">

          {/* Pending verifications */}
          <section className="rounded-2xl border border-outline-variant/60 bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#e8edff] flex items-center justify-center">
                  <ShieldAlert size={15} className="text-[#00288e]" strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-bold text-on-surface">Verifications</h3>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${verifications.length > 0 ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface-variant"}`}>
                {verifications.length} new
              </span>
            </div>

            {verifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant/60 py-10 text-center">
                <CheckCircle2 size={32} className="text-secondary" strokeWidth={1.5} />
                <p className="text-[13px] text-on-surface-variant">No pending verifications.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {verifications.slice(0, 3).map((v) => (
                  <div key={v._id} className="flex items-center gap-3 rounded-xl border border-outline-variant/40 p-3 hover:border-primary/30 hover:bg-surface-container-low transition-all duration-200">
                    <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-[13px] font-bold text-primary shrink-0">
                      {(v.userId?.name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-on-surface truncate">{v.userId?.name ?? "Unknown"}</p>
                      <p className="text-[11px] text-on-surface-variant truncate">{(v.skills || [])[0] || "Provider"}</p>
                    </div>
                    <button onClick={() => navigate("/admin/verifications")}
                      className="shrink-0 text-[12px] font-bold text-primary bg-[#e8edff] px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all duration-200">
                      Review
                    </button>
                  </div>
                ))}
                {verifications.length > 3 && (
                  <button onClick={() => navigate("/admin/verifications")}
                    className="w-full pt-2 text-[13px] font-semibold text-primary hover:text-primary-container transition-colors text-center">
                    View all {verifications.length} pending →
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Top providers */}
          <section className="rounded-2xl border border-outline-variant/60 bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#fff3e0] flex items-center justify-center">
                  <Trophy size={15} className="text-[#6b4200]" strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-bold text-on-surface">Top Providers</h3>
              </div>
              <Link to="/admin/providers" className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary-container transition-colors">
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {leaderboard.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant/60 py-10 text-center">
                <Trophy size={32} className="text-outline-variant" strokeWidth={1.5} />
                <p className="text-[13px] text-on-surface-variant">No ranked providers yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {leaderboard.slice(0, 5).map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3 py-3 border-b border-outline-variant/30 last:border-0">
                    <span className={`w-5 text-center text-[13px] font-bold shrink-0 ${idx === 0 ? "text-[#6b4200]" : "text-on-surface-variant"}`}>
                      {idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-[12px] font-bold text-on-primary-container shrink-0">
                      {(p.name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-on-surface truncate">{p.name}</p>
                      <p className="text-[11px] text-on-surface-variant">★ {p.trustScore ?? "—"}</p>
                    </div>
                    <p className="text-[13px] font-bold text-on-surface shrink-0">{formatMoney(p.earnings)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
