import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  TrendingUp, BarChart3, Users, Award, MapPin, Star,
  ShieldCheck, ArrowUpRight, Flame, Layers, Sparkles, RefreshCw,
  BadgeCheck, ChevronRight
} from "lucide-react";

const COLORS = ["#00288e", "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#dc2626", "#9333ea"];

export default function FederationAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/federation/analytics");
      setData(res);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-surface-container rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-surface-container rounded-2xl animate-pulse" />
          <div className="h-64 bg-surface-container rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Operational Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              Business Intelligence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Real-time fulfillment metrics, provider leaderboards, and geographic demand heatmaps.
          </p>
        </div>

        <button
          onClick={load}
          className="p-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors cursor-pointer shadow-2xs shrink-0"
          title="Refresh analytics"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
        {/* 1. Monthly Booking Growth & GMV */}
        <div className="lg:col-span-7 rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1.5">
                <TrendingUp size={15} className="text-primary" /> Monthly Booking Volume &amp; Demand
              </h3>
              <p className="text-[11px] text-on-surface-variant">Continuous aggregate demand across all member cooperatives</p>
            </div>
            <span className="text-[10.5px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-lg border border-outline-variant/40">
              Live Trajectory
            </span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend}>
                <defs>
                  <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00288e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00288e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="month" stroke="currentColor" opacity={0.6} fontSize={11} tickLine={false} />
                <YAxis stroke="currentColor" opacity={0.6} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface, #ffffff)",
                    color: "var(--color-on-surface, #0f172a)",
                    borderRadius: "12px",
                    border: "1px solid var(--color-outline-variant, #e2e8f0)",
                    fontSize: "12px"
                  }}
                />
                <Area type="monotone" dataKey="bookings" stroke="#00288e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGmv)" name="Bookings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Top Performing Trade Categories */}
        <div className="lg:col-span-5 rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-5 space-y-3 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1.5">
              <Layers size={15} className="text-primary" /> Top Service Demand Share
            </h3>
            <p className="text-[11px] text-on-surface-variant">Breakdown by customer requests across trades</p>
          </div>

          <div className="h-44 sm:h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.topCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="bookings"
                >
                  {data.topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface, #ffffff)",
                    color: "var(--color-on-surface, #0f172a)",
                    borderRadius: "12px",
                    border: "1px solid var(--color-outline-variant, #e2e8f0)",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center pt-1">
            {data.topCategories.slice(0, 4).map((c, i) => (
              <span key={c.name} className="inline-flex items-center gap-1.5 text-[11px] text-on-surface font-medium bg-surface-container-low px-2 py-0.5 rounded-md border border-outline-variant/30">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {c.name} ({c.bookings})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Provider Leaderboard ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-amber-500" />
            <h2 className="text-xs sm:text-sm font-bold text-on-surface">
              Federation Provider Leaderboard
            </h2>
          </div>
          <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded-full border border-outline-variant/40">
            Top 10 Performers
          </span>
        </div>

        {/* ── Mobile Leaderboard Cards (< 768px) ── */}
        <div className="md:hidden space-y-2.5">
          {(data.leaderboard || []).length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-outline-variant text-center text-xs text-on-surface-variant bg-surface">
              No worker performance records yet.
            </div>
          ) : (
            (data.leaderboard || []).map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl border border-outline-variant/60 bg-surface space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        p.rank === 1
                          ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                          : p.rank === 2
                          ? "bg-slate-300 text-slate-900 font-bold"
                          : p.rank === 3
                          ? "bg-amber-700 text-white font-bold"
                          : "bg-surface-container text-on-surface"
                      }`}
                    >
                      #{p.rank}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-on-surface">{p.name}</h3>
                        {p.verified && <ShieldCheck size={13} className="text-emerald-500" />}
                      </div>
                      <p className="text-[11px] text-on-surface-variant">{p.cooperativeName}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/40">
                    <Star size={11} fill="currentColor" /> {p.trustScore}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-xs border-t border-outline-variant/40">
                  <div className="p-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 space-y-0.5">
                    <span className="text-[9.5px] text-on-surface-variant font-medium">Trade Skill</span>
                    <p className="font-bold text-on-surface truncate">{p.skills?.[0] || "General"}</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 space-y-0.5">
                    <span className="text-[9.5px] text-on-surface-variant font-medium">Jobs Done</span>
                    <p className="font-bold text-on-surface">{p.jobsCompleted}</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 space-y-0.5">
                    <span className="text-[9.5px] text-on-surface-variant font-medium">Total Payout</span>
                    <p className="font-bold text-on-surface">₹{p.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop Leaderboard Table (>= 768px) ── */}
        <div className="hidden md:block rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-5 py-3 w-16">Rank</th>
                  <th className="px-5 py-3">Gig Worker</th>
                  <th className="px-5 py-3">Affiliated Cooperative</th>
                  <th className="px-5 py-3">Primary Skill</th>
                  <th className="px-5 py-3">Trust Score</th>
                  <th className="px-5 py-3">Jobs Done</th>
                  <th className="px-5 py-3 text-right">Total Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {(data.leaderboard || []).map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-5 py-3">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          p.rank === 1
                            ? "bg-amber-400 text-slate-950 font-black shadow-2xs"
                            : p.rank === 2
                            ? "bg-slate-300 text-slate-900 font-bold"
                            : p.rank === 3
                            ? "bg-amber-700 text-white font-bold"
                            : "bg-surface-container text-on-surface"
                        }`}
                      >
                        {p.rank}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-on-surface">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.verified && <ShieldCheck size={14} className="text-emerald-500" />}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant font-medium">{p.cooperativeName}</td>
                    <td className="px-5 py-3 font-semibold text-primary">{p.skills?.[0] || "General"}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/40 text-xs">
                        <Star size={11} className="text-amber-500 fill-amber-500" /> {p.trustScore}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-on-surface">{p.jobsCompleted}</td>
                    <td className="px-5 py-3 text-right font-black text-on-surface">
                      ₹{p.totalEarnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 4. Geographic Demand Heatmap ── */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-on-surface">Geographic Demand &amp; Regional Heatmap</h3>
              <p className="text-[11px] text-on-surface-variant">Live geospatial concentration of service requests across NCT districts.</p>
            </div>
          </div>
          <span className="text-[11px] text-on-surface-variant font-medium">GPS Telemetry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
          {(data.geographicHeatmap || []).map((item, idx) => (
            <div
              key={item.pinCode || idx}
              className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/50 space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-on-surface truncate">{item.area}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/40 shrink-0">
                  {item.density} Density
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-xs pt-1 border-t border-outline-variant/40">
                <div className="space-y-0.5">
                  <p className="text-[9.5px] text-on-surface-variant font-semibold uppercase">PIN Code</p>
                  <p className="font-mono font-bold text-on-surface text-[11px]">{item.pinCode || "110001"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9.5px] text-on-surface-variant font-semibold uppercase">Bookings</p>
                  <p className="font-bold text-on-surface text-[11px]">{item.bookings}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9.5px] text-on-surface-variant font-semibold uppercase">Avg Response</p>
                  <p className="font-bold text-on-surface text-[11px]">{item.avgResponseMin} mins</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
