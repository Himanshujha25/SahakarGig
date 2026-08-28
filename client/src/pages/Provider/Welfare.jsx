import { useEffect, useState } from "react";
import api from "../../lib/api";
import { ShieldCheck, Save, CheckCircle2, QrCode, BadgeCheck, Loader2 } from "lucide-react";
import WelfareBadge from "../../components/WelfareBadge";
import WorkerWelfareDashboard from "../../components/WorkerWelfareDashboard";

const inputCls = "h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50";

export default function Welfare() {
  const [providerId, setProviderId] = useState(null);
  const [welfareData, setWelfareData] = useState(null);
  const [form, setForm] = useState({ eShramId: "", insuranceOptIn: false, insuranceProvider: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [qr, setQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  async function fetchWelfare(pid) {
    const { data: w } = await api.get(`/welfare/${pid}`);
    setWelfareData(w);
    setForm({
      eShramId: w.eShramId || "",
      insuranceOptIn: !!w.insuranceOptIn,
      insuranceProvider: w.insuranceProvider || "",
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await api.get("/providers/me");
        setProviderId(me._id);
        await fetchWelfare(me._id);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  async function verifyEShram() {
    if (!providerId || !form.eShramId) return;
    setVerifying(true);
    setVerifyError('');
    try {
      await api.post(`/welfare/${providerId}/verify-eshram`, { eShramId: form.eShramId });
      await fetchWelfare(providerId);
    } catch (err) {
      setVerifyError(err?.response?.data?.message || 'Invalid ID format.');
    } finally { setVerifying(false); }
  }

  async function save() {
    if (!providerId) return;
    setSaving(true);
    try {
      await api.put(`/welfare/${providerId}`, form);
      await fetchWelfare(providerId); // re-fetch to get updated alerts + score
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  async function loadQR() {
    if (!providerId) return;
    setQrLoading(true);
    try {
      const { data } = await api.get(`/welfare/${providerId}/qr`);
      setQr(data.qr);
    } catch {} finally { setQrLoading(false); }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-10 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Welfare & Benefits
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Manage your e-Shram ID, insurance, and eligible government schemes.
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl badge-completed text-[13px] font-bold">
            <CheckCircle2 size={15} strokeWidth={2.5} /> Saved successfully
          </div>
        )}
      </div>

      {/* Worker Welfare Dashboard — real data */}
      <WorkerWelfareDashboard data={welfareData} loading={loading} />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 animate-pulse rounded-2xl border border-outline-variant bg-surface h-64" />
          <div className="lg:col-span-2 animate-pulse rounded-2xl border border-outline-variant bg-surface h-64" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">

          {/* Left Column (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Registration Details Form */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-5 shadow-xs">
              <h2 className="text-[16px] font-bold text-on-surface">Registration Details</h2>

            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.06em]">e-Shram ID</label>
              <div className="flex gap-2">
                <input className={inputCls} value={form.eShramId}
                  onChange={e => { setForm(f => ({ ...f, eShramId: e.target.value })); setVerifyError(''); }}
                  placeholder="e.g. UAN-851926293643 or ES12345678" />
                {form.eShramId && welfareData?.eShramVerificationStatus !== 'govt_verified' && (
                  <button onClick={verifyEShram} disabled={verifying}
                    className="shrink-0 h-11 px-4 rounded-xl border border-primary/25 bg-primary-container text-on-primary-container text-[12px] font-bold hover:bg-primary hover:text-on-primary disabled:opacity-50 transition-all inline-flex items-center gap-1.5">
                    {verifying ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} />}
                    {verifying ? 'Saving…' : 'Save ID'}
                  </button>
                )}
                {welfareData?.eShramVerificationStatus === 'govt_verified' && (
                  <span className="shrink-0 h-11 px-3 rounded-xl badge-completed text-[12px] font-bold inline-flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Govt. Verified
                  </span>
                )}
              </div>
              {verifyError && <p className="text-[12px] text-error mt-1">{verifyError}</p>}
              {welfareData?.eShramVerificationStatus === 'self_declared' && (
                <p className="text-[11px] text-tertiary-container dark:text-tertiary mt-1">ID saved. Govt. verification pending — will auto-update when DigiLocker API is connected.</p>
              )}
            </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.06em]">Insurance Provider</label>
                <input className={inputCls} value={form.insuranceProvider}
                  onChange={e => setForm(f => ({ ...f, insuranceProvider: e.target.value }))}
                  placeholder="e.g. PMSBY (Pradhan Mantri Suraksha Bima Yojana)" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
                <div>
                  <p className="text-[14px] font-semibold text-on-surface">Opt in to Insurance</p>
                  <p className="text-[12px] text-on-surface-variant">Enable cooperative insurance coverage</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, insuranceOptIn: !f.insuranceOptIn }))}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 cursor-pointer ${form.insuranceOptIn ? "bg-primary-container" : "bg-outline-variant"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${form.insuranceOptIn ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>

              <button onClick={save} disabled={saving}
                className={`h-10 inline-flex items-center gap-2 px-5 rounded-xl border text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer ${
                  saved ? "border-secondary/30 badge-completed" : "border-outline-variant bg-surface text-on-surface hover:border-primary/40 hover:bg-primary-container hover:text-on-primary-container"
                }`}>
                <Save size={14} strokeWidth={2.5} />
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
              </button>
            </div>

            {/* Eligible Schemes Card */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-3 shadow-xs">
              <h3 className="text-[15px] font-bold text-on-surface">Eligible Government Welfare Schemes</h3>
              {(welfareData?.schemesEligible || ["PMSBY Insurance", "AB-PMJAY Health Cover", "e-Shram Pension"]).length === 0 ? (
                <p className="text-[13px] text-on-surface-variant">No schemes matched yet. Complete your e-Shram registration.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(welfareData?.schemesEligible || ["PMSBY (₹2 Lakh Cover)", "AB-PMJAY (Health Insurance)", "e-Shram Pension Scheme"]).map(s => (
                    <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full badge-completed text-[12px] font-bold">
                      <CheckCircle2 size={13} strokeWidth={2.5} /> {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">

            <WelfareBadge
              eshramId={form.eShramId}
              welfareScore={welfareData?.welfareScore || 85}
              insuranceOptIn={form.insuranceOptIn}
              insuranceProvider={form.insuranceProvider}
              verificationStatus={welfareData?.eShramVerificationStatus}
              verifiedAt={welfareData?.eShramVerifiedAt}
              verifiedName={welfareData?.eShramVerifiedName}
            />

            {/* Welfare score */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl icon-box-blue flex items-center justify-center">
                  <ShieldCheck size={15} strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-bold text-on-surface">Welfare Score</h3>
              </div>
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-primary-container border border-primary/10">
                <span className="text-[13px] font-bold text-on-primary-container">Current Score</span>
                <span className="text-[28px] font-bold text-on-primary-container">{welfareData?.welfareScore || 85}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-surface-container-low overflow-hidden">
                <div className="h-full rounded-full bg-primary-container transition-all duration-500"
                  style={{ width: `${Math.max(welfareData?.welfareScore || 85, 5)}%` }} />
              </div>
              <p className="text-[11px] text-on-surface-variant font-medium">{welfareData?.welfareScore || 85}/100 — Active Protection Tier</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
