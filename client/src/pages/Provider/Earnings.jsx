import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

export default function Earnings() {
  const { t } = useTranslation();
  const [provider, setProvider] = useState(null);
  const [welfare, setWelfare] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await api.get("/providers/me");
        setProvider(me.data);
        const w = await api.get(`/welfare/${me.data._id}`);
        setWelfare(w.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;
  if (!provider || !welfare) return <div className="card text-on-surface-variant">No data.</div>;

  const total = welfare.totalEarnings || 0;
  const days = welfare.daysWorked || 0;
  const score = welfare.welfareScore || 0;
  const avg = days > 0 ? total / days : 0;

  const bars = [
    { label: "Total Earnings", value: total, max: total || 1, color: "bg-secondary-container" },
    { label: "Days Worked", value: days, max: Math.max(days, 1), color: "bg-tertiary-container" },
    { label: "Welfare Score", value: score, max: 100, color: "bg-primary-container" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("earnings")}</h1>

      <div className="card-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body-md text-on-surface-variant">Total Earnings</p>
            <p className="font-heading text-4xl font-bold text-primary">₹{total.toLocaleString("en-IN")}</p>
          </div>
          <span className="material-symbols-outlined text-[40px] text-secondary">account_balance_wallet</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-tile">
          <span className="font-body-md text-sm text-on-surface-variant">{t("earnings")} / day</span>
          <span className="font-heading text-2xl font-bold text-on-surface">₹{avg.toFixed(0)}</span>
        </div>
        <div className="stat-tile">
          <span className="font-body-md text-sm text-on-surface-variant">Days Worked</span>
          <span className="font-heading text-2xl font-bold text-on-surface">{days}</span>
        </div>
      </div>

      <div className="card-lg flex flex-col gap-3">
        <h2 className="font-headline-md text-headline-md text-on-surface">Overview</h2>
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex justify-between font-body-md text-sm">
              <span className="text-on-surface-variant">{b.label}</span>
              <span className="font-heading font-semibold text-on-surface">{b.value}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div
                className={`h-full rounded-full ${b.color}`}
                style={{ width: `${Math.min(100, (b.value / b.max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
