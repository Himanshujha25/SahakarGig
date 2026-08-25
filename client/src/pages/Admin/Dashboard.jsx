import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Dashboard() {
  const { t } = useTranslation();
  const [dash, setDash] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [d, l] = await Promise.all([
          api.get("/admin/dashboard"),
          api.get("/admin/leaderboard"),
        ]);
        if (!active) return;
        setDash(d.data);
        setLeaders(l.data || []);
      } catch (e) {
        setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;
  if (error) return <p className="font-body-md text-on-error-container">{error}</p>;

  const tiles = [
    { label: t("totalBookings"), value: dash.totalBookings, icon: "receipt_long", tone: "text-primary" },
    { label: t("revenue"), value: `₹${dash.revenue?.toLocaleString("en-IN") ?? 0}`, icon: "payments", tone: "text-secondary" },
    { label: t("pendingVerifications"), value: dash.pendingVerifications, icon: "verified_user", tone: "text-tertiary" },
    { label: t("activeDisputes"), value: dash.activeDisputes, icon: "gavel", tone: "text-error" },
  ];

  const bars = DAYS.map((_, i) => 30 + ((i * 37) % 70));
  const maxBar = 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((c) => (
          <div key={c.label} className="stat-tile">
            <div className="flex items-center justify-between">
              <span className="font-body-md text-sm text-on-surface-variant">{c.label}</span>
              <span className={`material-symbols-outlined ${c.tone}`}>{c.icon}</span>
            </div>
            <span className="font-heading text-3xl font-bold" style={{ fontWeight: 700 }}>
              {c.value}
            </span>
          </div>
        ))}
      </div>

      <div className="card-lg">
        <h2 className="font-headline-md text-headline-md text-on-surface">{t("revenue")} (₹)</h2>
        <p className="font-body-md text-sm text-on-surface-variant">Weekly trend</p>
        <div className="mt-4 flex h-40 items-end justify-between gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-lg bg-surface-tint"
                style={{ height: `${(h / maxBar) * 100}%` }}
              />
              <span className="font-body-md text-xs text-on-surface-variant">{DAYS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-lg">
        <h2 className="font-headline-md text-headline-md text-on-surface">{t("leaderboard")}</h2>
        {leaders.length === 0 ? (
          <p className="mt-3 font-body-md text-on-surface-variant">No providers yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-heading text-sm text-on-surface-variant">
                  <th className="py-2">{t("name")}</th>
                  <th className="py-2">Skill</th>
                  <th className="py-2">Trust</th>
                  <th className="py-2">{t("earnings")}</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((p) => (
                  <tr key={p.id} className="border-t border-outline-variant font-body-md text-on-surface">
                    <td className="py-3 font-heading font-semibold">{p.name}</td>
                    <td className="py-3">{p.skill}</td>
                    <td className="py-3">
                      <span className="status-pill bg-secondary-container text-on-secondary-container">
                        {p.trustScore}
                      </span>
                    </td>
                    <td className="py-3">₹{p.earnings?.toLocaleString("en-IN") ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
