import { useEffect, useState } from 'react';
import api from '../../lib/api';
import Icon from '../../components/Icon';

const STAT_ICONS = {
  cooperatives: 'corporate_fare',
  providers: 'groups',
  bookings: 'calendar_month',
  revenue: 'payments',
};

function StatCard({ icon, label, value, sub, color = 'text-primary' }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl bg-[#e8edff] flex items-center justify-center shrink-0 ${color}`}>
        <Icon name={icon} className="text-[20px]" />
      </div>
      <div>
        <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
        <p className="font-heading text-2xl font-bold text-on-surface">{value}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

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

  if (loading)
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-64 rounded bg-surface-variant" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-surface-variant" />)}
          </div>
        </div>
      </div>
    );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-on-surface">{data?.federationName || 'Federation'}</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Federation Dashboard · Aggregated across all cooperatives</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="corporate_fare" label="Cooperatives" value={data?.totalCooperatives ?? 0} />
        <StatCard icon="groups" label="Total Providers" value={data?.totalProviders ?? 0}
          sub={`${data?.verifiedProviders ?? 0} verified`} />
        <StatCard icon="calendar_month" label="Total Bookings" value={data?.totalBookings ?? 0}
          sub={`${data?.activeDisputes ?? 0} disputes`} color="text-amber-600" />
        <StatCard icon="payments" label="Federation Revenue" value={`₹${(data?.totalRevenue ?? 0).toFixed(0)}`}
          sub={`Provider payouts ₹${(data?.totalProviderPayout ?? 0).toFixed(0)}`} color="text-[#006d30]" />
      </div>

      {/* Revenue split */}
      <div className="rounded-xl border border-outline-variant bg-surface p-5">
        <h2 className="font-heading text-base font-semibold text-on-surface mb-4">Revenue Split</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Federation Commission', value: data?.totalRevenue ?? 0, color: 'bg-primary' },
            { label: 'Cooperative Commission', value: data?.totalCoopRevenue ?? 0, color: 'bg-secondary' },
            { label: 'Provider Payouts', value: data?.totalProviderPayout ?? 0, color: 'bg-[#006d30]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-surface-container-low px-4 py-3">
              <div className={`w-2 h-2 rounded-full ${color} mb-2`} />
              <p className="text-xs text-on-surface-variant">{label}</p>
              <p className="font-heading text-xl font-bold text-on-surface">₹{value.toFixed(0)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cooperative breakdown table */}
      <div className="rounded-xl border border-outline-variant bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant">
          <h2 className="font-heading text-base font-semibold text-on-surface">Cooperative Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                {['Cooperative', 'Region', 'Providers', 'Verified', 'Bookings', 'Revenue'].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.coopStats || []).length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-on-surface-variant">No cooperatives linked yet.</td></tr>
              ) : (
                (data?.coopStats || []).map((c) => (
                  <tr key={c.id} className="border-b border-outline-variant hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-sm text-on-surface">{c.name}</td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">{c.region || '—'}</td>
                    <td className="px-5 py-3 text-sm text-on-surface">{c.providers}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f9ec] text-[#006d30] px-2.5 py-0.5 text-xs font-semibold">
                        <Icon name="verified" className="text-[12px]" />{c.verifiedProviders}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-on-surface">{c.bookings}</td>
                    <td className="px-5 py-3 font-semibold text-sm text-primary">₹{c.revenue.toFixed(0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
