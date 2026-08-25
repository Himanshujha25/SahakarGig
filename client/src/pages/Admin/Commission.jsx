import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";

export default function Commission() {
  const { t } = useTranslation();
  const [rate, setRate] = useState("");
  const [savedRate, setSavedRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/admin/commission");
        setSavedRate(data.commissionRate ?? 0);
        setRate(String(data.commissionRate ?? 0));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/commission", { rate: Number(rate) });
      setSavedRate(data.commissionRate ?? Number(rate));
    } finally {
      setSaving(false);
    }
  }

  const booking = 500;
  const current = savedRate ?? 0;
  const commission = (booking * current) / 100;
  const provider = booking - commission;

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("commission")}</h1>

      <div className="card-lg flex flex-col gap-3">
        <label className="font-heading text-sm font-semibold text-on-surface-variant">
          {t("commission")} Rate (%)
        </label>
        <input
          type="number"
          className="input"
          value={rate}
          min="0"
          max="100"
          onChange={(e) => setRate(e.target.value)}
        />
        <button className="btn-primary self-start" disabled={saving} onClick={save}>
          <span className="material-symbols-outlined mr-1 text-[18px]">save</span>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="card-lg">
        <h2 className="font-headline-md text-headline-md text-on-surface">
          Worked example — ₹{booking} booking
        </h2>
        <div className="mt-4 flex flex-col gap-3 font-body-md text-on-surface">
          <div className="flex items-center justify-between">
            <span>Cooperative commission ({current}%)</span>
            <span className="font-heading font-semibold">₹{commission.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Provider earnings</span>
            <span className="rounded-lg bg-secondary-container px-3 py-1 font-heading font-semibold text-on-secondary-container">
              ₹{provider.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-outline-variant pt-3 font-heading font-bold">
            <span>Total</span>
            <span>₹{booking}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
