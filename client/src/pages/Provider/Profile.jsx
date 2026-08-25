import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import TrustRing from "../../components/TrustRing";
import VerifiedBadge from "../../components/VerifiedBadge";

export default function Profile() {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [provider, setProvider] = useState(null);
  const [form, setForm] = useState({
    skills: "",
    hourlyRate: "",
    availabilityNote: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await api.get("/providers/me");
        const p = me.data;
        setProvider(p);
        setForm({
          skills: (p.skills || []).join(", "),
          hourlyRate: p.hourlyRate ?? "",
          availabilityNote: (p.availabilitySlots || [])
            .map((s) => `${s.day} ${s.from}-${s.to}`)
            .join(", "),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update(k, v) {
    setForm({ ...form, [k]: v });
  }

  async function save() {
    if (!provider) return;
    setSaving(true);
    try {
      await api.patch(`/providers/${provider._id}`, {
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        hourlyRate: Number(form.hourlyRate) || 0,
        availabilitySlots: form.availabilityNote
          .split(",")
          .map((seg) => seg.trim())
          .filter(Boolean)
          .map((seg) => {
            const m = seg.match(/(\w+)\s*(\d{1,2}:?\d{0,2})?-?(\d{1,2}:?\d{0,2})?/);
            return m ? { day: m[1], from: m[2] || "", to: m[3] || "" } : { day: seg, from: "", to: "" };
          }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function upload() {
    if (!fileRef.current?.files?.[0] || !provider) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("doc", fileRef.current.files[0]);
      await api.post(`/providers/${provider._id}/docs`, fd);
      fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;
  if (!provider) return <div className="card text-on-surface-variant">No profile.</div>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("profile")}</h1>

      <div className="card-lg flex items-center gap-4">
        <TrustRing score={provider.trustScore ?? 0} />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-headline-md text-headline-md text-on-surface">
              {provider.userId?.name || t("profile")}
            </p>
            {provider.verified && <VerifiedBadge label="Verified" />}
          </div>
          <p className="font-body-md text-on-surface-variant">
            {t("trust")}: {provider.trustScore ?? "—"}
          </p>
          {provider.cooperativeId?.name && (
            <p className="font-body-md text-on-surface-variant">{provider.cooperativeId.name}</p>
          )}
        </div>
      </div>

      <div className="card-lg flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block font-heading text-sm font-semibold text-on-surface-variant">
            Skills (comma-separated)
          </span>
          <input className="input" value={form.skills} onChange={(e) => update("skills", e.target.value)} />
        </label>

        <label className="block">
          <span className="mb-1 block font-heading text-sm font-semibold text-on-surface-variant">
            Hourly Rate (₹)
          </span>
          <input
            type="number"
            className="input"
            value={form.hourlyRate}
            onChange={(e) => update("hourlyRate", e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-heading text-sm font-semibold text-on-surface-variant">
            Availability (e.g. Mon 09:00-17:00)
          </span>
          <input
            className="input"
            value={form.availabilityNote}
            onChange={(e) => update("availabilityNote", e.target.value)}
            placeholder="Mon 09:00-17:00, Tue 10:00-14:00"
          />
        </label>

        <button className="btn-primary self-start" disabled={saving} onClick={save}>
          <span className="material-symbols-outlined mr-1 text-[18px]">save</span>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="card-lg flex flex-col gap-2">
        <span className="font-heading text-sm font-semibold text-on-surface">Verification Document</span>
        <input ref={fileRef} type="file" className="input" />
        <button className="btn-secondary self-start" disabled={uploading} onClick={upload}>
          <span className="material-symbols-outlined mr-1 text-[18px]">upload</span>
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}
