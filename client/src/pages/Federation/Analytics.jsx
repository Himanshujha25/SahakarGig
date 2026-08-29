import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import {
  TrendingUp, BarChart3, Users, Award, MapPin, Star,
  ShieldCheck, ArrowUpRight, Flame, Layers, Sparkles, RefreshCw
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
      <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="h-10 w-72 bg-surface-container-low rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-surface-container-low rounded-2xl animate-pulse" />
          <div className="h-72 bg-surface-container-low rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <BarChart3 size={16} />
            <span>Operational Business Intelligence</span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-on-surface">
            Federation Market Analytics
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Real-time fulfillment metrics, provider leaderboards, and geographic demand heatmaps.
          </p>
        </div>

        <button
          onClick={load}
          className="p-2.5 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw size={15} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Monthly Booking Growth & GMV (Col-7) */}
        <div className="lg:col-span-7 rounded-2xl border border-outline-variant bg-surface p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-bold text-on-surface flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" /> Monthly Booking Volume &amp; GMV Trend
              </h3>
              <p className="text-xs text-on-surface-variant">Continuous aggregate demand across all member cooperatives</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              +38% MoM Growth
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend}>
                <defs>
                  <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00288e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00288e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}
                />
                <Area type="monotone" dataKey="bookings" stroke="#00288e" strokeWidth={3} fillOpacity={1} fill="url(#colorGmv)" name="Bookings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Top Performing Trade Categories (Col-5) */}
        <div className="lg:col-span-5 rounded-2xl border border-outline-variant bg-surface p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-on-surface flex items-center gap-2">
              <Layers size={18} className="text-primary" /> Top Service Demand Share
            </h3>
            <p className="text-xs text-on-surface-variant">Breakdown by total customer service requests</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.topCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="bookings"
                >
                  {data.topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {data.topCategories.slice(0, 4).map((c, i) => (
              <span key={c.name} className="inline-flex items-center gap-1.5 text-xs text-on-surface font-semibold">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {c.name} ({c.bookings})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Provider Leaderboard & High Performers */}
      <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Award size={18} />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-on-surface">Federation Provider Leaderboard</h3>
              <p className="text-xs text-on-surface-variant">Top rated cooperative workers ranked by verified completions &amp; customer trust score.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary bg-[#e8edff] px-3 py-1 rounded-full border border-[#00288e]/20">
            Top 10 High Performers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-6 py-3 w-16">Rank</th>
                <th className="px-6 py-3">Gig Worker</th>
                <th className="px-6 py-3">Affiliated Cooperative</th>
                <th className="px-6 py-3">Primary Skill</th>
                <th className="px-6 py-3">Trust Score</th>
                <th className="px-6 py-3">Jobs Done</th>
                <th className="px-6 py-3 text-right">Total Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 text-xs">
              {data.leaderboard.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        p.rank === 1
                          ? "bg-amber-400 text-slate-950 shadow-md font-extrabold"
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
                  <td className="px-6 py-3.5 font-bold text-sm text-on-surface">
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      {p.verified && <ShieldCheck size={14} className="text-[#006d30]" />}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-on-surface-variant font-semibold">{p.cooperativeName}</td>
                  <td className="px-6 py-3.5 font-semibold text-primary">{p.skills[0]}</td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Star size={12} fill="currentColor" /> {p.trustScore}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-bold text-on-surface">{p.jobsCompleted}</td>
                  <td className="px-6 py-3.5 text-right font-extrabold text-sm text-[#006d30]">
                    ₹{p.totalEarnings.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Geographic Heatmap / Area Fulfillment Density */}
      <div className="rounded-2xl border border-outline-variant bg-surface p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-on-surface">Geographic Demand Density &amp; Response Heatmap</h3>
              <p className="text-xs text-on-surface-variant">Live geospatial concentration of service requests across NCR districts.</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-on-surface-variant">Updated hourly via GPS telemetry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {data.geographicHeatmap.map((item) => (
            <div
              key={item.pinCode}
              className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-all space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-on-surface">{item.area}</span>
                <span
                  className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                    item.density === "Very High"
                      ? "bg-red-100 text-red-800"
                      : item.density === "High"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {item.density} Density
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-outline-variant/60">
                <div>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase">PIN Code</p>
                  <p className="font-mono font-bold text-on-surface mt-0.5">{item.pinCode}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase">Bookings</p>
                  <p className="font-bold text-primary mt-0.5">{item.bookings}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase">Avg Arrival</p>
                  <p className="font-bold text-[#006d30] mt-0.5">{item.avgResponseMin} mins</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
