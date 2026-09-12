import { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "../../lib/toast";
import {
  HeartHandshake, Plus, FileText, Clock,
  IndianRupee, Printer, X, CheckCircle2, ShieldCheck
} from "lucide-react";
import WorkerWelfareDashboard from "../../components/WorkerWelfareDashboard";

export default function Welfare() {
  const [providerId, setProviderId] = useState(null);
  const [welfareData, setWelfareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("schemes"); // 'schemes' | 'claims'

  // Society Schemes & Claims (100% Dynamic from MongoDB)
  const [schemes, setSchemes] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedCertClaim, setSelectedCertClaim] = useState(null);

  // Apply Form State
  const [applyAmount, setApplyAmount] = useState(5000);
  const [applyPurpose, setApplyPurpose] = useState("");
  const [applyDocName, setApplyDocName] = useState("Expense_Receipt_Bill.pdf");
  const [toastMsg, setToastMsg] = useState("");

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  }

  async function fetchWelfare(pid) {
    try {
      const [wRes, sRes, cRes] = await Promise.allSettled([
        api.get(`/welfare/${pid}`),
        api.get("/welfare/schemes"),
        api.get(`/welfare/claims?providerId=${pid}`),
      ]);

      if (wRes.status === "fulfilled" && wRes.value?.data) {
        setWelfareData(wRes.value.data);
      }

      if (sRes.status === "fulfilled" && Array.isArray(sRes.value?.data)) {
        setSchemes(sRes.value.data);
      } else {
        setSchemes([]);
      }

      if (cRes.status === "fulfilled" && Array.isArray(cRes.value?.data)) {
        setMyClaims(cRes.value.data);
      } else {
        setMyClaims([]);
      }
    } catch (err) {
      console.warn("Welfare sync:", err);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await api.get("/providers/me");
        setProviderId(me._id);
        await fetchWelfare(me._id);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleApplyClaim(e) {
    e.preventDefault();
    if (!providerId || !selectedScheme) return;

    try {
      const payload = {
        schemeId: selectedScheme._id,
        providerId: providerId,
        requestedAmount: Number(applyAmount),
        purposeDescription: applyPurpose,
        documentNames: [applyDocName, "eShram_Verified_Credential.pdf"],
      };

      const res = await api.post("/welfare/claims", payload);
      setMyClaims([res.data, ...myClaims]);
      setShowApplyModal(false);
      showToast("Welfare claim application submitted to cooperative review tribunal!");
      setApplyPurpose("");
      setActiveTab("claims"); // Automatically switch to claims tab to show their pending application!
      await fetchWelfare(providerId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Application rejected. Single active claim policy in effect.");
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-20 space-y-6 text-slate-900 font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[99999] px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── TOP EXECUTIVE SUMMARY & SOCIAL SECURITY METRICS ── */}
      <WorkerWelfareDashboard data={welfareData} loading={loading} />

      {/* ── CLEAN NON-SCROLL SECTION TABS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("schemes")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "schemes"
              ? "bg-[#00288e] text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <HeartHandshake size={15} />
          <span>Available Society Schemes ({schemes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("claims")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "claims"
              ? "bg-[#00288e] text-white shadow-md"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Clock size={15} />
          <span>My Applications &amp; Disbursed Grants ({myClaims.length})</span>
        </button>
      </div>

      {/* ── SECTION TAB 1: ACTIVE COOPERATIVE WELFARE SCHEMES ── */}
      {activeTab === "schemes" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cooperative Welfare Relief &amp; Subsidies
              </h3>
              <p className="text-xs text-slate-500">
                Funded by your cooperative reserve pool. Select an eligible scheme below to apply for cash relief or equipment grants.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#00288e] border border-blue-200 text-xs font-bold self-start sm:self-auto">
              {schemes.length} Scheme{schemes.length === 1 ? "" : "s"} Open
            </span>
          </div>

          {schemes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-2 shadow-2xs">
              <HeartHandshake size={36} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No active welfare schemes published yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your cooperative society administrator will publish welfare schemes here. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {schemes.map((s) => (
                <div
                  key={s._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-[#00288e] transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#00288e] font-bold text-[10.5px] border border-blue-200 uppercase">
                        {s.category || "General Welfare"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        ACTIVE POOL
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{s.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description || "Cooperative funded social security grant."}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Max Grant Cap:</span>
                      <span className="font-black text-emerald-700 text-base">₹{s.maxAmountPerMember?.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <p className="font-bold text-slate-700">Required Documentary Proof:</p>
                      <p className="text-slate-500 truncate">{(s.requiredDocs || []).join(", ") || "GST Invoice / Expense Bill"}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Cooperative Backed</span>
                    <button
                      onClick={() => {
                        setSelectedScheme(s);
                        setApplyAmount(s.maxAmountPerMember || 5000);
                        setShowApplyModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Apply for Grant</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION TAB 2: MY WELFARE APPLICATIONS & VERIFICATION STATUS ── */}
      {activeTab === "claims" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Application Review Status &amp; Disbursal Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Track tribunal approvals in real-time and download your verifiable grant certificates.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold self-start sm:self-auto">
              {myClaims.length} Application{myClaims.length === 1 ? "" : "s"}
            </span>
          </div>

          {myClaims.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3 shadow-2xs">
              <Clock size={36} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No applications submitted yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Browse open schemes in the first tab and click "Apply for Grant" to submit your application.
              </p>
              <button
                onClick={() => setActiveTab("schemes")}
                className="px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-bold cursor-pointer hover:bg-[#001f70] transition-all shadow-md"
              >
                Browse Open Schemes
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-5 py-3.5">Scheme Applied</th>
                      <th className="px-5 py-3.5">Submission Date</th>
                      <th className="px-5 py-3.5">Requested Amount</th>
                      <th className="px-5 py-3.5">Approved Relief</th>
                      <th className="px-5 py-3.5">Verification Status</th>
                      <th className="px-5 py-3.5 text-right">Official Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myClaims.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {c.schemeId?.title || "Welfare Scheme"}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          ₹{c.requestedAmount?.toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-emerald-700">
                          ₹{(c.approvedAmount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-3.5">
                          {c.status === "disbursed" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10.5px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Disbursed ✓
                            </span>
                          ) : c.status === "approved" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#00288e] border border-blue-200 font-bold text-[10.5px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />
                              Approved (Ready to Disburse)
                            </span>
                          ) : c.status === "rejected" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10.5px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Rejected: {c.rejectionReason || "Documentation insufficient"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10.5px] animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Under Board Review
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {c.status === "disbursed" ? (
                            <button
                              onClick={() => {
                                setSelectedCertClaim(c);
                                setShowCertModal(true);
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                            >
                              <Printer size={13} className="text-[#00288e]" />
                              <span>Digital Certificate</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Pending Release</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: APPLY FOR SCHEME GRANT ── */}
      {showApplyModal && selectedScheme && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowApplyModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-8 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Apply for: {selectedScheme.title}</h2>
                <p className="text-xs text-slate-500">Max permissible grant: ₹{selectedScheme.maxAmountPerMember}</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyClaim} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Requested Grant Amount (₹)</label>
                <input
                  type="number"
                  max={selectedScheme.maxAmountPerMember}
                  required
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Purpose Description &amp; Item Details</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specify tool model, medical diagnosis, or emergency reason..."
                  value={applyPurpose}
                  onChange={(e) => setApplyPurpose(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Proof Document Attachment</label>
                <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#00288e]" />
                    <span className="font-bold text-slate-800">{applyDocName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">Attached</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                ⚠️ Single Active Claim Rule: The worker must not have any other pending welfare claims in progress.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: VERIFIABLE DIGITAL PDF CERTIFICATE ── */}
      {showCertModal && selectedCertClaim && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowCertModal(false)}>
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Official Welfare Grant Certificate</h2>
              <button onClick={() => setShowCertModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-300 bg-slate-50 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-black text-slate-900">SAHAKARGIG COOPERATIVE FEDERATION</h3>
                  <p className="text-[11px] text-slate-500">Ministry of Cooperation Govt Registration: DL-COOP-2026-001</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10.5px]">
                  DISBURSED ✓
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Scheme</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedCertClaim.schemeId?.title || "Tool Subsidy"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Grant Ref</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedCertClaim.transactionRef || "WLF-88X92"}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Amount</span>
                  <p className="font-bold text-emerald-700 mt-0.5">₹{selectedCertClaim.approvedAmount || selectedCertClaim.requestedAmount}</p>
                </div>
              </div>

              <p className="text-slate-600 italic text-[11px]">
                "Funded directly from the 5-10% Cooperative Margin Reserve Pool under Section 12 of the Multi-State Cooperative Societies Act."
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowCertModal(false)}
                className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
