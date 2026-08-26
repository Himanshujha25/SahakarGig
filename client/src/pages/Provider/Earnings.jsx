import { useEffect, useState } from "react";
import api from "../../lib/api";
import { IndianRupee, CalendarDays, TrendingUp, Star, CheckCircle2 } from "lucide-react";

function formatMoney(v) {
  const n = Number(v) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export default function Earnings() {
  const [provider, setProvider] = useState(null);
  const [welfare, setWelfare]   = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: me } = await api.get("/providers/me");
        const [{ data: w }, { data: bk }] = await Promise.all([
          api.get(`/welfare/${me._id}`),
          api.get("/bookings/provider/mine"),
        ]);
        setProvider(me);
        setWelfare(w);
        setBookings(bk || []);
      } catch {} finally { setLoading(false); }
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const total     = welfare?.totalEarnings || 0;
  const days      = welfare?.daysWorked || 0;
  const score     = welfare?.welfareScore || 0;
  const avg       = days > 0 ? total / days : 0;
  const completed = bookings.filter(b => b.status === "completed").length;

  const STAT_CARDS = [
    { label: "Total Earnings", value: formatMoney(total), Icon: IndianRupee,  bg: "bg-[#e8edff]", ic: "text-[#00288e]" },
    { label: "Days Worked",    value: days,               Icon: CalendarDays, bg: "bg-[#fff3e0]", ic: "text-[#6b4200]" },
    { label: "Avg / Day",      value: formatMoney(avg),   Icon: TrendingUp,   bg: "bg-[#e6f9ec]", ic: "text-[#006d30]" },
    { label: "Jobs Done",      value: completed,          Icon: CheckCircle2, bg: "bg-[#e8edff]", ic: "text-[#00288e]" },
  ];

  const completedBookings = bookings.filter(b => b.status === "completed");

  return (
    <div className="w-full px-6 pt-8 pb-10 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
          style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
          Earnings
        </h1>
        <p className="text-[14px] text-on-surface-variant mt-0.5">
          Track your income and contributions across completed jobs.
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ label, value, Icon, bg, ic }) => (
            <div key={label}
              className="rounded-2xl border border-outline-variant/60 bg-surface p-5 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">{label}</p>
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={17} strokeWidth={2} className={ic} />
                </div>
              </div>
              <p className="text-[28px] font-bold tracking-tight leading-none text-on-surface">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Welfare score + breakdown */}
        <div className="lg:col-span-2 rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-5">
          <h2 className="text-[16px] font-bold text-on-surface">Welfare Overview</h2>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#e8edff] border border-[#00288e]/10">
            <span className="text-[13px] font-bold text-[#00288e]">Welfare Score</span>
            <span className="text-[22px] font-bold text-[#00288e]">{score}</span>
          </div>

          <div className="space-y-3">
            {[
              { label: "Total Earnings", value: `₹${total.toLocaleString("en-IN")}`, pct: 100 },
              { label: "Days Worked",    value: String(days),                          pct: Math.min(100, days * 3) },
              { label: "Welfare Score",  value: `${score}/100`,                        pct: score },
            ].map(({ label, value, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-bold text-on-surface">{value}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-container-low overflow-hidden">
                  <div className="h-full rounded-full bg-[#00288e] transition-all duration-500"
                    style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed jobs table */}
        <div className="lg:col-span-3 rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-outline-variant/40">
            <div className="w-8 h-8 rounded-xl bg-[#e6f9ec] flex items-center justify-center">
              <CheckCircle2 size={15} className="text-[#006d30]" strokeWidth={2} />
            </div>
            <h3 className="text-[15px] font-bold text-on-surface">Completed Jobs</h3>
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
          ) : completedBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <CheckCircle2 size={40} className="text-outline-variant" strokeWidth={1.5} />
              <p className="text-[14px] text-on-surface-variant">No completed jobs yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-left">
                <thead>
                  <tr className="border-b border-outline-variant/40 bg-surface-container-low">
                    <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Service</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Household</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {completedBookings.map(b => (
                    <tr key={b._id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-3.5 text-[14px] font-semibold text-on-surface">{b.service}</td>
                      <td className="px-6 py-3.5 text-[13px] text-on-surface-variant">{b.householdId?.name || "—"}</td>
                      <td className="px-6 py-3.5 text-right text-[14px] font-bold text-[#006d30]">₹{b.price ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
