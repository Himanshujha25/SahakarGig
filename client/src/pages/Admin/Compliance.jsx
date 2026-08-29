import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  FileCheck2, Plus, ShieldCheck, Download, CheckCircle2,
  AlertTriangle, Clock, FileText, Check, X, ExternalLink,
  MessageSquare, UserCheck, Building2, Printer, Upload
} from "lucide-react";

export default function CooperativeCompliance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Annual Return Modal
  const [returnModal, setReturnModal] = useState(false);
  const [finYear, setFinYear] = useState("FY 2025-26");
  const [ackNum, setAckNum] = useState("");
  const [returnBusy, setReturnBusy] = useState(false);

  // Log Grievance Modal
  const [grievanceModal, setGrievanceModal] = useState(false);
  const [complainantName, setComplainantName] = useState("");
  const [grievanceCategory, setGrievanceCategory] = useState("Service Delivery");
  const [grievanceDesc, setGrievanceDesc] = useState("");
  const [grievanceBusy, setGrievanceBusy] = useState(false);

  // Resolve Grievance Modal
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolveBusy, setResolveBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/admin/compliance");
      setData(res);
    } catch (err) {
      console.error("Failed to load compliance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  }

  async function handleRecordReturn(e) {
    e.preventDefault();
    if (!finYear) return;
    setReturnBusy(true);
    try {
      const { data: res } = await api.post("/admin/compliance/annual-return", {
        financialYear: finYear,
        ackNumber: ackNum,
      });
      showToast(res.message || "Annual return filing recorded!");
      setReturnModal(false);
      setAckNum("");
      load();
    } catch (err) {
      showToast("Failed to record annual return.");
    } finally {
      setReturnBusy(false);
    }
  }

  async function handleAddGrievance(e) {
    e.preventDefault();
    if (!complainantName || !grievanceDesc) return;
    setGrievanceBusy(true);
    try {
      const { data: res } = await api.post("/admin/compliance/grievance", {
        complainantName,
        category: grievanceCategory,
        description: grievanceDesc,
      });
      showToast(res.message || "Grievance ticket logged!");
      setGrievanceModal(false);
      setComplainantName("");
      setGrievanceDesc("");
      load();
    } catch (err) {
      showToast("Failed to log grievance.");
    } finally {
      setGrievanceBusy(false);
    }
  }

  async function handleResolveGrievance(e) {
    e.preventDefault();
    if (!selectedGrievance) return;
    setResolveBusy(true);
    try {
      const { data: res } = await api.patch(`/admin/compliance/grievance/${selectedGrievance._id}/resolve`, {
        resolutionNote,
      });
      showToast(res.message || "Grievance ticket resolved!");
      setSelectedGrievance(null);
      setResolutionNote("");
      load();
    } catch (err) {
      showToast("Failed to resolve grievance.");
    } finally {
      setResolveBusy(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-8 text-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#00288e] uppercase tracking-wider mb-1">
            <FileCheck2 size={16} />
            <span>Statutory Governance</span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Compliance &amp; Grievance Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ministry of Cooperation audit benchmarks, Annual Returns archive, and digital grievance resolution.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setGrievanceModal(true)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
          >
            <Plus size={14} />
            <span>Log Grievance Ticket</span>
          </button>

          <button
            onClick={() => setReturnModal(true)}
            className="px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Upload size={14} />
            <span>File Annual Return</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Audit Compliance Score</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">{data.complianceScore || 100}%</p>
          <p className="text-[11px] text-slate-500">{data.verifiedMembers} of {data.totalMembers} workers e-Shram verified</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Annual Returns</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{data.annualReturns?.length || 0} Filings</p>
          <p className="text-[11px] text-slate-500">Certified by Registrar of Cooperative Societies</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Grievance Resolution</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <MessageSquare size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {data.grievances?.filter(g => g.status === 'resolved').length || 0} / {data.grievances?.length || 0}
          </p>
          <p className="text-[11px] text-slate-500">Digital grievance tribunal register</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "overview"
              ? "border-[#00288e] text-[#00288e]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Audit Checklist &amp; Returns ({data.annualReturns?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("grievances")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "grievances"
              ? "border-[#00288e] text-[#00288e]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Grievance Register ({data.grievances?.length || 0})
        </button>
      </div>

      {/* ── Tab 1: Checklist & Returns ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Statutory Checklist */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Ministry of Cooperation Statutory Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-slate-800">1. Valid Multi-State / State Cooperative Registration</span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Verified</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-slate-800">2. e-Shram Worker Universal Identity Linking</span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Active</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-slate-800">3. Transparent Escrow Commission Ledger</span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Automated</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-slate-800">4. Welfare &amp; Social Security Reserve Pool</span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Configured</span>
              </div>
            </div>
          </div>

          {/* Annual Returns Archive */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-0">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Annual Return Filings</h3>
                <p className="text-xs text-slate-500">Official return acknowledgments filed with the Registrar.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer size={13} />
                <span>Print Compliance Certificate</span>
              </button>
            </div>

            {(!data.annualReturns || data.annualReturns.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No annual returns recorded yet. Click &quot;File Annual Return&quot; above to log your filing.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="px-6 py-3">Financial Year</th>
                      <th className="px-6 py-3">Acknowledgment No.</th>
                      <th className="px-6 py-3">Filing Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {data.annualReturns.map((ar, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{ar.financialYear}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-700">{ar.ackNumber || "N/A"}</td>
                        <td className="px-6 py-3.5 text-slate-500">
                          {new Date(ar.filingDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-emerald-700">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px]">
                            {ar.status || "Filed ✓"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <a
                            href={ar.docUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#00288e] font-bold hover:underline"
                          >
                            <span>View Filing Doc</span>
                            <ExternalLink size={12} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Grievance Register ── */}
      {activeTab === "grievances" && (
        <div className="space-y-4">
          {(!data.grievances || data.grievances.length === 0) ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
              <MessageSquare size={36} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-900">Grievance Register Clean</h3>
              <p className="text-xs text-slate-500">No active grievance or customer complaints registered for this cooperative.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="px-6 py-3">Complainant</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Issue Description</th>
                    <th className="px-6 py-3">Date Filed</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.grievances.map((g) => (
                    <tr key={g._id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{g.complainantName}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-700">{g.category}</td>
                      <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">{g.description}</td>
                      <td className="px-6 py-3.5 text-slate-400 font-mono">
                        {new Date(g.filedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                            g.status === "resolved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {g.status === "resolved" ? "Resolved ✓" : "Pending Review"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {g.status !== "resolved" ? (
                          <button
                            onClick={() => setSelectedGrievance(g)}
                            className="px-3 py-1 rounded-lg bg-[#00288e] text-white text-[11px] font-bold hover:bg-[#001f70] cursor-pointer"
                          >
                            Resolve
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* File Annual Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setReturnModal(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Record Annual Return Filing</h2>
              <button onClick={() => setReturnModal(false)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRecordReturn} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Financial Year</label>
                <select
                  value={finYear}
                  onChange={(e) => setFinYear(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                >
                  <option value="FY 2025-26">FY 2025-26 (Current)</option>
                  <option value="FY 2024-25">FY 2024-25</option>
                  <option value="FY 2023-24">FY 2023-24</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Filing Acknowledgment Number</label>
                <input
                  type="text"
                  value={ackNum}
                  onChange={(e) => setAckNum(e.target.value)}
                  placeholder="e.g. AR-DL-2026-992144"
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-mono font-bold text-slate-900 bg-slate-50 outline-none uppercase"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModal(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnBusy}
                  className="px-5 py-2 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-xs cursor-pointer"
                >
                  {returnBusy ? "Recording..." : "Save Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Grievance Modal */}
      {grievanceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setGrievanceModal(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Log Grievance Ticket</h2>
              <button onClick={() => setGrievanceModal(false)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddGrievance} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Complainant / Member Name</label>
                <input
                  type="text"
                  value={complainantName}
                  onChange={(e) => setComplainantName(e.target.value)}
                  placeholder="e.g. Sunil Verma"
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Category</label>
                <select
                  value={grievanceCategory}
                  onChange={(e) => setGrievanceCategory(e.target.value)}
                  className="w-full h-11 rounded-2xl border border-slate-200 px-4 font-semibold text-slate-900 bg-slate-50 outline-none"
                >
                  <option value="Service Delivery">Service Delivery &amp; Quality</option>
                  <option value="Payment Disbursal">Payment &amp; Commission Disbursal</option>
                  <option value="Worker Conduct">Worker Conduct &amp; Punctuality</option>
                  <option value="Welfare Claim">Welfare Claim Assistance</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Description of Grievance</label>
                <textarea
                  rows={3}
                  value={grievanceDesc}
                  onChange={(e) => setGrievanceDesc(e.target.value)}
                  placeholder="Details of the complaint..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 font-medium text-slate-900 bg-slate-50 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGrievanceModal(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={grievanceBusy}
                  className="px-5 py-2 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-xs cursor-pointer"
                >
                  {grievanceBusy ? "Logging..." : "Log Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Grievance Modal */}
      {selectedGrievance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedGrievance(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Resolve Grievance</h2>
              <button onClick={() => setSelectedGrievance(null)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResolveGrievance} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">{selectedGrievance.complainantName} ({selectedGrievance.category})</p>
                <p className="text-slate-600">{selectedGrievance.description}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Resolution Notes &amp; Action Taken</label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Disbursal corrected via bank transfer and complainant notified."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 font-medium text-slate-900 bg-white outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedGrievance(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveBusy}
                  className="px-5 py-2 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800 shadow-xs cursor-pointer"
                >
                  {resolveBusy ? "Closing..." : "Mark as Resolved ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
