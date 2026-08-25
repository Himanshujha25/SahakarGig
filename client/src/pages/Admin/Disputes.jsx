import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

export default function Disputes() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  async function load() {
    const { data } = await api.get("/admin/disputes");
    setItems(data || []);
  }

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function resolve(id, outcome) {
    setBusy(id);
    try {
      await api.patch(`/admin/resolve/${id}`, { outcome });
      setItems((prev) => prev.filter((d) => d._id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("disputes")}</h1>
      {items.length === 0 ? (
        <div className="card flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-secondary">check_circle</span>
          <span className="font-body-md">No active disputes.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((d) => (
            <div key={d._id} className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-headline-md text-headline-md text-on-surface">
                  {d.householdId?.name ?? "Household"}
                </span>
                <span className="status-pill bg-error-container text-on-error-container">
                  {d.status}
                </span>
              </div>
              <div className="font-body-md text-on-surface-variant">{d.service}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  className="btn-secondary"
                  disabled={busy === d._id}
                  onClick={() => resolve(d._id, "refund")}
                >
                  <span className="material-symbols-outlined mr-1 text-[18px]">undo</span>
                  Resolve (Refund)
                </button>
                <button
                  className="btn-primary"
                  disabled={busy === d._id}
                  onClick={() => resolve(d._id, "provider")}
                >
                  <span className="material-symbols-outlined mr-1 text-[18px]">handshake</span>
                  Resolve (Provider)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
