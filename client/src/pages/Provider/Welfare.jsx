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
    <div className="w-full px-6 pt-8 pb-10 space-y-6">

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
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e6f9ec] border border-[#006d30]/20 text-[13px] font-bold text-[#006d30]">
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Form */}
          <div className="lg:col-span-3 rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-5">
            <h2 className="text-[16px] font-bold text-on-surface">Registration Details</h2>

            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.06em]">e-Shram ID</label>
              <div className="flex gap-2">
                <input className={inputCls} value={form.eShramId}
                  onChange={e => { setForm(f => ({ ...f, eShramId: e.target.value })); setVerifyError(''); }}
                  placeholder="e.g. UAN-851926293643 or ES12345678" />
                {form.eShramId && welfareData?.eShramVerificationStatus !== 'govt_verified' && (
                  <button onClick={verifyEShram} disabled={verifying}
                    className="shrink-0 h-11 px-4 rounded-xl border border-primary/25 bg-[#e8edff] text-[#00288e] text-[12px] font-bold hover:border-primary hover:bg-[#d7e3ff] disabled:opacity-50 transition-all inline-flex items-center gap-1.5">
                    {verifying ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} />}
                    {verifying ? 'Saving…' : 'Save ID'}
                  </button>
                )}
                {welfareData?.eShramVerificationStatus === 'govt_verified' && (
                  <span className="shrink-0 h-11 px-3 rounded-xl bg-[#e6f9ec] border border-[#006d30]/20 text-[#006d30] text-[12px] font-bold inline-flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Govt. Verified
                  </span>
                )}
              </div>
              {verifyError && <p className="text-[12px] text-error mt-1">{verifyError}</p>}
              {welfareData?.eShramVerificationStatus === 'self_declared' && (
                <p className="text-[11px] text-[#6b4200] mt-1">ID saved. Govt. verification pending — will auto-update when DigiLocker API is connected.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.06em]">Insurance Provider</label>
              <input className={inputCls} value={form.insuranceProvider}
                onChange={e => setForm(f => ({ ...f, insuranceProvider: e.target.value }))}
                placeholder="e.g. LIC, PMJJBY" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
              <div>
                <p className="text-[14px] font-semibold text-on-surface">Opt in to Insurance</p>
                <p className="text-[12px] text-on-surface-variant">Enable cooperative insurance coverage</p>
              </div>
              <button onClick={() => setForm(f => ({ ...f, insuranceOptIn: !f.insuranceOptIn }))}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 ${form.insuranceOptIn ? "bg-primary" : "bg-outline-variant"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${form.insuranceOptIn ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            <button onClick={save} disabled={saving}
              className={`h-10 inline-flex items-center gap-2 px-5 rounded-xl border text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 ${
                saved ? "border-[#006d30]/30 bg-[#e6f9ec] text-[#006d30]" : "border-outline-variant bg-surface text-on-surface hover:border-primary/40 hover:bg-[#e8edff] hover:text-[#00288e]"
              }`}>
              <Save size={14} strokeWidth={2.5} />
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
            </button>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 space-y-4">

            <WelfareBadge
              eshramId={form.eShramId}
              welfareScore={welfareData?.welfareScore || 0}
              insuranceOptIn={form.insuranceOptIn}
              insuranceProvider={form.insuranceProvider}
              verificationStatus={welfareData?.eShramVerificationStatus}
              verifiedAt={welfareData?.eShramVerifiedAt}
              verifiedName={welfareData?.eShramVerifiedName}
            />

            {/* Welfare score */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#e8edff] flex items-center justify-center">
                  <ShieldCheck size={15} className="text-[#00288e]" strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-bold text-on-surface">Welfare Score</h3>
              </div>
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#e8edff] border border-[#00288e]/10">
                <span className="text-[13px] font-bold text-[#00288e]">Current Score</span>
                <span className="text-[28px] font-bold text-[#00288e]">{welfareData?.welfareScore || 0}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-container-low overflow-hidden">
                <div className="h-full rounded-full bg-[#00288e] transition-all duration-500"
                  style={{ width: `${Math.max(welfareData?.welfareScore || 0, 2)}%` }} />
              </div>
              <p className="text-[11px] text-on-surface-variant">{welfareData?.welfareScore || 0}/100 — complete your profile to improve</p>
            </div>

            {/* Eligible schemes */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-on-surface">Eligible Schemes</h3>
              {(welfareData?.schemesEligible || []).length === 0 ? (
                <p className="text-[13px] text-on-surface-variant">No schemes matched yet. Complete your e-Shram registration.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {welfareData.schemesEligible.map(s => (
                    <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e6f9ec] text-[#006d30] text-[12px] font-semibold">
                      <CheckCircle2 size={11} strokeWidth={2.5} /> {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* QR card */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2 self-start">
                <div className="w-8 h-8 rounded-xl bg-[#e8edff] flex items-center justify-center">
                  <QrCode size={15} className="text-[#00288e]" strokeWidth={2} />
                </div>
                <h3 className="text-[15px] font-bold text-on-surface">Welfare ID Card</h3>
              </div>
              {qr ? (
                <>
                  <img src={qr} alt="Welfare QR Code" className="w-40 h-40 rounded-xl border border-outline-variant" />
                  <p className="text-[11px] text-on-surface-variant">Scan to verify identity &amp; welfare status</p>
                  <p className="text-[13px] font-bold text-on-surface">{form.eShramId || '—'}</p>
                  <button onClick={() => { const a = document.createElement('a'); a.href = qr; a.download = 'welfare-card.png'; a.click(); }}
                    className="h-9 px-4 rounded-xl border border-outline-variant text-[12px] font-semibold text-on-surface hover:bg-[#e8edff] hover:text-[#00288e] hover:border-primary/40 transition-colors">
                    Download Card
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-xl bg-surface-container-low flex items-center justify-center">
                    <QrCode size={32} className="text-on-surface-variant/40" strokeWidth={1.5} />
                  </div>
                  <p className="text-[12px] text-on-surface-variant">Generate your digital welfare card</p>
                  <button onClick={loadQR} disabled={qrLoading || !providerId}
                    className="h-9 px-4 rounded-xl border border-primary/25 bg-[#e8edff] text-[12px] font-semibold text-[#00288e] hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)] active:scale-[0.98] disabled:opacity-50 transition-all duration-200">
                    {qrLoading ? 'Generating…' : 'Generate QR Card'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
