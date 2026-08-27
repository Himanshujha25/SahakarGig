import { useEffect, useState, useRef } from "react";
import api from "../../lib/api";
import VerifiedBadge from "../../components/VerifiedBadge";
import { Star, Save, Upload, CheckCircle2, Clock, Briefcase, IndianRupee, ShieldCheck, FileText, Trash2 } from "lucide-react";

const inputCls = "h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/40";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">{label}</label>
      {children}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, bg, ic }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={14} strokeWidth={2} className={ic} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-on-surface-variant font-medium">{label}</p>
        <p className="text-[14px] font-bold text-on-surface leading-tight">{value}</p>
      </div>
    </div>
  );
}

// Weekly availability editor — green toggle for free days, time range per day.
function AvailabilityEditor({ slots, onChange }) {
  const toggle = (i) =>
    onChange(slots.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)));
  const patch = (i, k, v) =>
    onChange(slots.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));

  return (
    <div className="space-y-2">
      {slots.map((s, i) => (
        <div
          key={s.day}
          className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
            s.enabled ? "border-[#006d30]/30 bg-[#e6f9ec]" : "border-outline-variant/50 bg-surface-container-lowest opacity-80"
          }`}
        >
          <button
            type="button"
            onClick={() => toggle(i)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${s.enabled ? "bg-[#006d30]" : "bg-outline-variant"}`}
            title={s.enabled ? "Available" : "Not available"}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
          <span className={`w-14 text-[14px] font-bold ${s.enabled ? "text-[#006d30]" : "text-on-surface-variant"}`}>{s.day}</span>
          {s.enabled ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="time"
                value={s.from}
                onChange={(e) => patch(i, "from", e.target.value)}
                className="h-9 flex-1 rounded-lg border border-[#006d30]/20 bg-surface px-2 text-[13px] font-semibold text-on-surface outline-none focus:border-[#006d30]"
              />
              <span className="text-[12px] text-on-surface-variant">to</span>
              <input
                type="time"
                value={s.to}
                onChange={(e) => patch(i, "to", e.target.value)}
                className="h-9 flex-1 rounded-lg border border-[#006d30]/20 bg-surface px-2 text-[13px] font-semibold text-on-surface outline-none focus:border-[#006d30]"
              />
            </div>
          ) : (
            <span className="flex-1 text-right text-[12px] text-on-surface-variant italic">Not available</span>
          )}
        </div>
      ))}
      <p className="text-[12px] text-on-surface-variant">
        Toggle days green when you're free. Households can only book you inside these slots.
      </p>
    </div>
  );
}

export default function ProviderProfile() {
  const fileRef = useRef(null);
  const [provider, setProvider]   = useState(null);
  const [form, setForm]           = useState({ skills: "", hourlyRate: "" });
  const [slots, setSlots]         = useState(() => DAYS.map((day) => ({ day, enabled: false, from: "09:00", to: "17:00" })));
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved]         = useState(false);
  const [fileName, setFileName]   = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: p } = await api.get("/providers/me");
        setProvider(p);
        setForm({
          skills: (p.skills || []).join(", "),
          hourlyRate: p.hourlyRate ?? "",
        });
        setSlots(DAYS.map((day) => {
          const existing = (p.availabilitySlots || []).find((s) => s.day === day);
          return existing
            ? { day, enabled: true, from: existing.from || "09:00", to: existing.to || "17:00" }
            : { day, enabled: false, from: "09:00", to: "17:00" };
        }));
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  async function save() {
    if (!provider) return;
    setSaving(true);
    try {
      await api.patch(`/providers/${provider._id}`, {
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
        hourlyRate: Number(form.hourlyRate) || 0,
        availabilitySlots: slots.filter(s => s.enabled).map(s => ({ day: s.day, from: s.from, to: s.to })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  async function upload() {
    if (!fileRef.current?.files?.[0] || !provider) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("doc", fileRef.current.files[0]);
      await api.post(`/providers/${provider._id}/docs`, fd);
      setFileName("");
      fileRef.current.value = "";
    } finally { setUploading(false); }
  }

  const initials = provider?.userId?.name
    ? provider.userId.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "PV";

  const skills = provider?.skills || [];

  if (loading) return (
    <div className="w-full px-6 pt-8 pb-10 space-y-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-xl bg-surface-container" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-outline-variant bg-surface h-80" />
          <div className="lg:col-span-2 rounded-2xl border border-outline-variant bg-surface h-80" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full px-6 pt-8 pb-10 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Profile
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Manage your professional details and verification documents.
          </p>
        </div>
        {provider && (
          provider.verified
            ? <VerifiedBadge label="Verified" />
            : <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#fff3e0] text-[#6b4200] text-[12px] font-bold border border-[#6b4200]/10">
                <Clock size={13} strokeWidth={2} /> Pending Verification
              </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: identity + stats ── */}
        <div className="space-y-4">

          {/* Avatar card */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface p-6 flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-white text-[28px] font-bold shadow-[0_4px_16px_rgba(0,40,142,0.2)]">
              {initials}
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <p className="text-[18px] font-bold text-on-surface">{provider?.userId?.name || "Provider"}</p>
                {provider?.verified && <VerifiedBadge />}
              </div>
              <p className="text-[13px] text-on-surface-variant mt-0.5">{provider?.userId?.email}</p>
              {provider?.cooperativeId?.name && (
                <span className="mt-2 inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#e8edff] text-[#00288e]">
                  {provider.cooperativeId.name}
                </span>
              )}
            </div>

            {/* Skills pills */}
            {skills.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 pt-1 border-t border-outline-variant/40 w-full">
                {skills.map(s => (
                  <span key={s} className="px-2.5 py-0.5 rounded-full bg-[#e8edff] text-[#00288e] text-[11px] font-semibold">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Stat pills */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface p-4 space-y-2">
            <p className="text-[11px] font-bold text-on-surface-variant/50 uppercase tracking-[0.1em] px-1 pb-1">Overview</p>
            <StatPill icon={Star}        label="Trust Score"  value={provider?.trustScore ?? "—"}    bg="bg-[#fff3e0]" ic="text-[#6b4200]" />
            <StatPill icon={IndianRupee} label="Hourly Rate"  value={provider?.hourlyRate ? `₹${provider.hourlyRate}/hr` : "Not set"} bg="bg-[#e8edff]" ic="text-[#00288e]" />
            <StatPill icon={Briefcase}   label="Skills"       value={skills.length > 0 ? `${skills.length} skill${skills.length > 1 ? "s" : ""}` : "None added"} bg="bg-[#e6f9ec]" ic="text-[#006d30]" />
            <StatPill icon={ShieldCheck} label="Status"       value={provider?.verified ? "Verified" : "Pending"} bg={provider?.verified ? "bg-[#e6f9ec]" : "bg-[#fff3e0]"} ic={provider?.verified ? "text-[#006d30]" : "text-[#6b4200]"} />
          </div>
        </div>

        {/* ── Right column: edit form + doc upload ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Professional details */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-on-surface">Professional Details</h2>
                <p className="text-[13px] text-on-surface-variant mt-0.5">Update your skills, rate, and availability.</p>
              </div>
              {saved && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e6f9ec] text-[#006d30] text-[12px] font-bold">
                  <CheckCircle2 size={13} strokeWidth={2.5} /> Saved
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Skills (comma-separated)">
                  <input className={inputCls} value={form.skills}
                    onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                    placeholder="e.g. Plumbing, Electrical, Cleaning" />
                </Field>
              </div>
              <Field label="Hourly Rate (₹)">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-on-surface-variant">₹</span>
                  <input className={inputCls + " pl-8"} type="number" value={form.hourlyRate}
                    onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                    placeholder="250" />
                </div>
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Weekly Availability">
                <AvailabilityEditor slots={slots} onChange={setSlots} />
              </Field>
            </div>

            <div className="pt-1">
              <button onClick={save} disabled={saving}
                className={`h-10 inline-flex items-center gap-2 px-5 rounded-xl border text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 ${
                  saved
                    ? "border-[#006d30]/30 bg-[#e6f9ec] text-[#006d30]"
                    : "border-outline-variant bg-surface text-on-surface hover:border-primary/40 hover:bg-[#e8edff] hover:text-[#00288e]"
                }`}>
                <Save size={14} strokeWidth={2.5} />
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Verification document */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-4">
            <div>
              <h2 className="text-[16px] font-bold text-on-surface">Verification Document</h2>
              <p className="text-[13px] text-on-surface-variant mt-0.5">
                Upload your Aadhaar, PAN, or certification for cooperative verification.
              </p>
            </div>

            {/* Custom file drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-outline-variant/60 bg-surface-container-lowest px-6 py-8 cursor-pointer hover:border-primary/40 hover:bg-[#e8edff]/30 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-[#e8edff] flex items-center justify-center">
                <FileText size={18} className="text-[#00288e]" strokeWidth={2} />
              </div>
              {fileName ? (
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-on-surface">{fileName}</p>
                  <button onClick={e => { e.stopPropagation(); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}
                    className="text-on-surface-variant hover:text-error transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-on-surface">Click to choose a file</p>
                  <p className="text-[11px] text-on-surface-variant">PDF, JPG, PNG up to 10MB</p>
                </>
              )}
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => setFileName(e.target.files?.[0]?.name || "")} />
            </div>

            <button onClick={upload} disabled={uploading || !fileName}
              className="h-10 inline-flex items-center gap-2 px-5 rounded-xl border border-outline-variant bg-surface text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:bg-[#e8edff] hover:text-[#00288e] transition-all duration-200 disabled:opacity-40">
              <Upload size={14} strokeWidth={2.5} />
              {uploading ? "Uploading…" : "Upload Document"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
