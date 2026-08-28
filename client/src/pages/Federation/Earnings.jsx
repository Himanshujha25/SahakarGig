import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  IndianRupee, Building2, TrendingUp, Users,
  BarChart3, ArrowUpRight
} from "lucide-react";

function formatMoney(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

export default function FederationEarnings() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: dash } = await api.get("/federation/dashboard");
        setData(dash);
      } catch (err) {
        console.error("Failed to load federation earnings:", err);
        setError("Failed to load earnings data.");
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const STAT_CARDS = data
    ? [
        {
          label: "Federation Revenue",
          value: formatMoney(data.totalRevenue),
          sub: "Your commission earnings",
          Icon: IndianRupee,
          bg: "bg-[#e8edff]",
          ic: "text-[#00288e]",
        },
        {
          label: "Cooperative Earnings",
          value: formatMoney(data.totalCoopRevenue),
          sub: "Across all cooperatives",
          Icon: Building2,
          bg: "bg-[#fff3e0]",
          ic: "text-[#6b4200]",
        },
        {
          label: "Provider Payouts",
          value: formatMoney(data.totalProviderPayout),
          sub: "Total disbursed to providers",
          Icon: TrendingUp,
          bg: "bg-[#e6f9ec]",
          ic: "text-[#006d30]",
        },
        {
          label: "Total Providers",
          value: data.totalProviders,
          sub: `${data.verifiedProviders} verified`,
          Icon: Users,
          bg: "bg-[#f3e8ff]",
          ic: "text-[#5b0093]",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-16 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="animate-pulse h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 pt-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-16 space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
          >
            Earnings &amp; Payouts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Federation-wide revenue overview — aggregated across all cooperatives.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <ArrowUpRight size={14} className="text-emerald-700" />
          <span className="text-xs font-semibold text-emerald-800">
            {data.totalBookings} total bookings
          </span>
        </div>
      </div>

      {/* Revenue Summary Banner */}
      <div className="rounded-xl border bg-gradient-to-br from-[#001a5e] to-[#0039a6] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">
          Total Federation Revenue
        </p>
        <p className="text-4xl font-bold">
          {formatMoney(data.totalRevenue)}
        </p>
        <p className="text-xs opacity-60 mt-1">
          Your commission on all cooperative transactions
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, sub, Icon, bg, ic }) => (
          <div key={label} className="rounded-xl border bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase">
                {label}
              </p>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={15} className={ic} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-[11px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Cooperative Revenue Breakdown */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Revenue by Cooperative</h3>
          </div>
          <span className="text-xs text-slate-500">
            {data.coopStats?.length || 0} cooperatives
          </span>
        </div>

        {!data.coopStats || data.coopStats.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No cooperatives found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-slate-50/80">
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Cooperative</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Region</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Providers</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Bookings</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-400 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.coopStats.map((coop) => (
                  <tr key={coop.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-900">{coop.name}</td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">{coop.region || "-"}</td>
                    <td className="px-6 py-3.5 text-xs text-slate-700">
                      {coop.providers}{" "}
                      <span className="text-slate-400">({coop.verifiedProviders} verified)</span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-700">{coop.bookings}</td>
                    <td className="px-6 py-3.5 text-right text-sm font-bold text-slate-900">
                      {formatMoney(coop.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-slate-50">
                  <td colSpan={4} className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">
                    Total Cooperative Revenue
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-slate-900">
                    {formatMoney(data.totalCoopRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}