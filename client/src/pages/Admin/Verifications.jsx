import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

export default function Verifications() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  async function load() {
    const { data } = await api.get("/admin/verifications");
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

  async function verify(id) {
    setBusy(id);
    try {
      await api.patch(`/admin/verify/${id}`);
      setItems((prev) => prev.filter((v) => v._id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("verifications")}</h1>
      {items.length === 0 ? (
        <div className="card flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-secondary">task_alt</span>
          <span className="font-body-md">No pending verifications.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((v) => (
            <div key={v._id} className="card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container font-heading font-bold text-on-primary-container">
                  {(v.userId?.name || "?").charAt(0)}
                </div>
                <div>
                  <div className="font-heading font-semibold text-on-surface">{v.userId?.name ?? "Unknown"}</div>
                  <div className="font-body-md text-sm text-on-surface-variant">
                    {v.userId?.email} · {v.userId?.phone}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(v.skills || []).map((s) => (
                  <span key={s} className="status-pill bg-surface-container text-on-surface-variant">
                    {s}
                  </span>
                ))}
              </div>
              <div className="font-body-md text-on-surface">Rate: ₹{v.hourlyRate ?? "—"}/hr</div>
              <button
                className="btn-primary mt-1 self-start"
                disabled={busy === v._id}
                onClick={() => verify(v._id)}
              >
                <span className="material-symbols-outlined mr-1 text-[18px]">verified</span>
                {busy === v._id ? "Verifying…" : "Verify Provider"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
