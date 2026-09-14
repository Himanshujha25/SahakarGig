import { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
  Building2, Users, CalendarCheck, IndianRupee,
  ShieldCheck, AlertTriangle, ArrowUpRight, TrendingUp,
  Landmark, ChevronRight
} from 'lucide-react';
import { SkeletonStats } from '../../components/UIStateComponents';

export default function FederationDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get('/federation/dashboard')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonStats count={4} />
      </div>
    );
  }

  const coopCount = data?.totalCooperatives ?? 0;
  const provCount = data?.totalProviders ?? 0;
  const bookCount = data?.totalBookings ?? 0;
  const revAmount = data?.totalRevenue ?? 0;
  const coopRev = data?.totalCoopRevenue ?? 0;
  const provPayout = data?.totalProviderPayout ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">
      {/* ── Header ── */}
      <div className="border-b border-outline-variant/60 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            {data?.federationName || 'Nationwide Cooperative Mahasangh'}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
            Apex Federation
          </span>
        </div>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
          Federation Dashboard &middot; Aggregated across all linked state and district societies
        </p>
      </div>

      {/* ── 4 Sleek Compact Horizontal KPI Stat Tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Cooperatives</p>
            <p className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">{coopCount}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <Building2 size={15} />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Total Providers</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{provCount}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <Users size={15} />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Total Bookings</p>
            <p className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">{bookCount}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <CalendarCheck size={15} />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Apex Revenue</p>
            <p className="text-xl sm:text-2xl font-black text-primary tracking-tight">₹{revAmount.toFixed(0)}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
            <IndianRupee size={15} />
          </div>
        </div>
      </div>

      {/* ── Revenue Split (Compact 3-Card Row) ── */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-5 space-y-3 shadow-2xs">
        <h2 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1.5">
          <TrendingUp size={15} className="text-primary" />
          Nodal Fair Wage Revenue Split
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="rounded-xl bg-surface-container-low border border-outline-variant/40 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <p className="text-[11px] font-medium text-on-surface-variant">Federation Commission</p>
            </div>
            <p className="text-lg sm:text-xl font-black text-primary">₹{revAmount.toFixed(0)}</p>
          </div>

          <div className="rounded-xl bg-surface-container-low border border-outline-variant/40 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[11px] font-medium text-on-surface-variant">Cooperative Retention</p>
            </div>
            <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">₹{coopRev.toFixed(0)}</p>
          </div>

          <div className="rounded-xl bg-surface-container-low border border-outline-variant/40 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <p className="text-[11px] font-medium text-on-surface-variant">Provider Payouts (Direct)</p>
            </div>
            <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">₹{provPayout.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* ── Cooperative Breakdown ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1.5">
            <Landmark size={15} className="text-primary" />
            Affiliated Cooperatives Breakdown
          </h2>
          <span className="text-xs text-on-surface-variant font-medium">
            {(data?.coopStats || []).length} societies linked
          </span>
        </div>

        {/* ── Mobile Cooperative Cards (< 768px) ── */}
        <div className="md:hidden space-y-2.5">
          {(data?.coopStats || []).length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-outline-variant text-center text-xs text-on-surface-variant bg-surface">
              No cooperatives linked yet.
            </div>
          ) : (
            (data?.coopStats || []).map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl border border-outline-variant/60 bg-surface space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">{c.name}</h3>
                    <p className="text-[11px] text-on-surface-variant">{c.region || 'Delhi NCR'}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                    <ShieldCheck size={11} /> {c.verifiedProviders} Verified
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40 text-xs">
                  <div className="flex items-center gap-3 text-on-surface-variant text-[11.5px]">
                    <span><strong>{c.providers}</strong> Providers</span>
                    <span>&middot;</span>
                    <span><strong>{c.bookings}</strong> Bookings</span>
                  </div>
                  <span className="font-black text-primary">₹{c.revenue.toFixed(0)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop Table (>= 768px) ── */}
        <div className="hidden md:block rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/60 bg-surface-container-low text-[10.5px] font-bold text-on-surface-variant uppercase">
                  <th className="px-5 py-3">Cooperative</th>
                  <th className="px-5 py-3">Region</th>
                  <th className="px-5 py-3">Providers</th>
                  <th className="px-5 py-3">Verified</th>
                  <th className="px-5 py-3">Bookings</th>
                  <th className="px-5 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {(data?.coopStats || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-on-surface-variant">
                      No cooperatives linked yet.
                    </td>
                  </tr>
                ) : (
                  (data?.coopStats || []).map((c) => (
                    <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-5 py-3 font-bold text-on-surface">{c.name}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{c.region || '—'}</td>
                      <td className="px-5 py-3 text-on-surface font-semibold">{c.providers}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-500/20">
                          <ShieldCheck size={12} />
                          <span>{c.verifiedProviders}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-on-surface">{c.bookings}</td>
                      <td className="px-5 py-3 font-black text-primary text-right">₹{c.revenue.toFixed(0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
