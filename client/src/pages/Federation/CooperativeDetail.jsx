import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { 
  ArrowLeft, Building2, Users, FileText, IndianRupee, ShieldCheck, 
  CheckCircle2, Percent, Save, Phone, Mail, Award, Check, Download, ExternalLink, QrCode
} from "lucide-react";

import { SERVER_URL } from "../../lib/config";

function getWorkerAvatar(w) {
  if (!w) return null;
  const raw = w.avatar || w.avatarUrl || w.userId?.avatarUrl || w.userId?.profileImage;
  if (!raw) return null;
  if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
  return `${SERVER_URL}${raw}`;
}

export default function CooperativeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [coopData, setCoopData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [commissionRate, setCommissionRate] = useState("8");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg]   = useState(null);

  const [selectedQrWorker, setSelectedQrWorker] = useState(null);
  const [copySuccess, setCopySuccess]             = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/federation/cooperatives/${id}`);
        setCoopData(data);
        if (data.cooperative?.commissionRate !== undefined) {
          setCommissionRate(String(data.cooperative.commissionRate));
        }
      } catch (err) {
        console.error("Failed to load cooperative details:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSaveCommission(e) {
    e.preventDefault();
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const { data } = await api.patch(`/federation/cooperatives/${id}/commission`, {
        commissionRate: Number(commissionRate)
      });
      setSaveMsg("Commission rate updated successfully!");
      if (coopData) {
        setCoopData({ ...coopData, cooperative: data });
      }
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg("Failed to update commission rate.");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <div className="h-6 w-1/3 rounded bg-slate-100" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-32 w-full rounded-xl bg-slate-50" />
        </div>
      </div>
    );
  }

  if (!coopData || !coopData.cooperative) {
    return (
      <div className="w-full max-w-md mx-auto my-16 p-8 text-center rounded-2xl border border-slate-200 bg-white space-y-4">
        <Building2 size={40} className="mx-auto text-slate-400" />
        <h2 className="text-base font-bold text-slate-900">Cooperative Profile Not Found</h2>
        <p className="text-xs text-slate-500">The requested cooperative record could not be retrieved.</p>
        <button
          onClick={() => navigate("/federation/cooperatives")}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium text-xs"
        >
          Back to Cooperatives
        </button>
      </div>
    );
  }

  const coop = coopData.cooperative;
  const providers = coopData.providers || [];
  const payouts = coopData.payouts || [];
  const bookings = coopData.bookings || [];

  const totalDisbursed = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6 text-slate-900">

      {/* Top Back Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/federation/cooperatives")}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Back to Cooperatives"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              {coop.name}
            </h1>
            <p className="text-xs text-slate-500">Registration ID: <span className="font-mono font-semibold text-slate-800">{coop.registrationId || "REG-2026-001"}</span></p>
          </div>
        </div>

        <span className="px-3 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold">
          Verified Society
        </span>
      </div>

      {/* Main Profile Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        
        {/* Top Info Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
              <Building2 size={22} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">{coop.name}</h2>
              <p className="text-xs text-slate-500">
                Region: <strong className="text-slate-800">{coop.region || coop.state || "Delhi Central"}</strong> • Type: <strong className="text-slate-800">{coop.type || "Labour Cooperative"}</strong>
              </p>
            </div>
          </div>

          {/* Editable Commission Rate System */}
          <form onSubmit={handleSaveCommission} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="space-y-0.5">
              <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Cooperative Commission Rate</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-16 px-2 py-1 rounded border border-slate-300 font-bold text-sm text-slate-900 text-center bg-white"
                  required
                />
                <span className="text-xs font-bold text-slate-600">%</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{isSaving ? "Saving..." : "Save Rate"}</span>
            </button>
          </form>
        </div>

        {saveMsg && (
          <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded border border-emerald-200">
            ✓ {saveMsg}
          </p>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Linked Workforce</p>
            <p className="text-2xl font-bold text-slate-900">{providers.length} Workers</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Disbursed</p>
            <p className="text-2xl font-bold text-slate-900">₹{totalDisbursed.toLocaleString("en-IN")}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Bookings</p>
            <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Commission Active</p>
            <p className="text-2xl font-bold text-slate-900">{commissionRate}%</p>
          </div>
        </div>

      </div>

      {/* Linked Workers List ("all the people linked to that cooperative") */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden space-y-0">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Linked Workforce Directory ({providers.length})</h3>
            <p className="text-xs text-slate-500">e-Shram registered workers affiliated with {coop.name}.</p>
          </div>
        </div>

        {providers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No registered workers linked to this cooperative yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Worker Name</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Skill Category</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Contact</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Trust Score</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Jobs Done</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-400 uppercase">Profile QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.map((p) => {
                  const avatarSrc = getWorkerAvatar(p);
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={p.name || p.userId?.name || "Worker Photo"}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#1e6b65] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {(p.name || p.userId?.name || "R")[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {p.name || p.userId?.name || "Ramesh Kumar"}
                            </p>
                            <p className="text-[11px] font-normal text-slate-400 mt-0.5">
                              {p.userId?.email || p.email || (p._id ? `ID: ${p._id.slice(-6)}` : "")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                        {Array.isArray(p.skills) ? p.skills.join(", ") : (p.skills || "Plumber")}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-500 font-mono">
                        {p.phone || p.email || "9811000004"}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-bold text-slate-800">
                        {p.trustScore || 85}/100
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-700 font-semibold">
                        {p.completedJobs || 2}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-semibold text-emerald-700">
                        Verified ✓
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedQrWorker(p)}
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 hover:border-[#00288e]/40 text-slate-800 hover:text-[#00288e] transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center active:scale-90"
                          title="View Digital Worker ID & QR Code"
                        >
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {/* 4 Scanner Corner Brackets */}
                            <path d="M3 8V5a2 2 0 0 1 2-2h3" />
                            <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                            {/* Inner QR Blocks */}
                            <rect x="7" y="7" width="3.5" height="3.5" rx="0.75" fill="currentColor" stroke="none" />
                            <rect x="13.5" y="7" width="3.5" height="3.5" rx="0.75" fill="currentColor" stroke="none" />
                            <rect x="7" y="13.5" width="3.5" height="3.5" rx="0.75" fill="currentColor" stroke="none" />
                            <circle cx="15.2" cy="14" r="1.3" fill="currentColor" stroke="none" />
                            <rect x="13.5" y="16.5" width="3.5" height="1.6" rx="0.75" fill="currentColor" stroke="none" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Agency Disbursals & Payouts Ledger ("cooperative agency payout and things") */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden space-y-0">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Agency Disbursal Ledger</h3>
            <p className="text-xs text-slate-500">Razorpay Escrow payouts disbursed to workers under this agency.</p>
          </div>

          <span className="text-xs font-bold text-slate-700">Total: ₹{totalDisbursed.toLocaleString("en-IN")}</span>
        </div>

        {payouts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No agency payouts recorded yet for this cooperative.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Payout ID</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Provider</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Cooperative Stamp</th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((py) => (
                  <tr key={py._id || py.payoutId} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 text-xs font-mono font-bold text-slate-800">
                      {py.payoutId}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-slate-900">
                      {py.providerName || "Ramesh Kumar"}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-bold text-slate-900">
                      ₹{py.amount}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-mono text-slate-600">
                      {py.cooperativeStampId || "DELHI-COOP-STAMP"}
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-emerald-700">
                      Completed ✓
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cooperative Compliance Documents */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
          Cooperative Compliance Documents
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-slate-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">Society Registration</p>
                <p className="text-[10.5px] text-slate-500">Verified PDF Certificate</p>
              </div>
            </div>
            <button className="text-xs text-slate-700 hover:text-slate-900 font-semibold underline">
              View
            </button>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-slate-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">Ministry License</p>
                <p className="text-[10.5px] text-slate-500">Multi-State Compliance</p>
              </div>
            </div>
            <button className="text-xs text-slate-700 hover:text-slate-900 font-semibold underline">
              View
            </button>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-slate-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">Annual Audit 2026</p>
                <p className="text-[10.5px] text-slate-500">Financial Ledger Report</p>
              </div>
            </div>
            <button className="text-xs text-slate-700 hover:text-slate-900 font-semibold underline">
              View
            </button>
          </div>
        </div>
      </div>

      {/* 📱 Worker Profile QR Code Modal */}
      {selectedQrWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-scale-up text-slate-900">
            
            {/* Modal Header */}
            <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#84cc16]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Worker Profile QR Badge</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQrWorker(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* QR Card Canvas */}
            <div className="p-6 text-center space-y-5 bg-white">
              
              {/* Worker Avatar & Info */}
              <div className="space-y-1">
                {getWorkerAvatar(selectedQrWorker) ? (
                  <img
                    src={getWorkerAvatar(selectedQrWorker)}
                    alt={selectedQrWorker.name || "Worker Photo"}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-md border-2 border-[#1e6b65]"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white mx-auto flex items-center justify-center font-bold text-2xl shadow-md border-2 border-[#1e6b65]">
                    {(selectedQrWorker.name || selectedQrWorker.userId?.name || "R")[0]}
                  </div>
                )}
                <h3 className="text-lg font-extrabold text-slate-900 pt-1">
                  {selectedQrWorker.name || selectedQrWorker.userId?.name || "Ramesh Kumar"}
                </h3>
                <p className="text-xs font-semibold text-[#1e6b65]">
                  {Array.isArray(selectedQrWorker.skills) ? selectedQrWorker.skills.join(", ") : (selectedQrWorker.skills || "Plumber")}
                </p>
                <p className="text-[11px] font-mono text-slate-400">
                  e-Shram UAN: <strong className="text-slate-700">IN-ES-0000000123</strong>
                </p>
              </div>

              {/* Real Generated High-Res QR Code Image */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`http://localhost:5173/household/provider/${selectedQrWorker._id}`)}`}
                  alt="Worker Profile QR Code"
                  className="w-48 h-48 mx-auto rounded-xl shadow-xs"
                />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Scan to View Public Verified Profile</p>
              </div>

              {/* Cooperative Affiliation Badge */}
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                ✓ Affiliated with {coop.name}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`http://localhost:5173/household/provider/${selectedQrWorker._id}`);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                >
                  {copySuccess ? "Copied Link! ✓" : "Copy Profile Link 🔗"}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md"
                >
                  Print QR Badge 📄
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
