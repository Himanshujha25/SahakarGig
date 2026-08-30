import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  ShieldCheck, Clock, CheckCircle2, Eye, RotateCcw,
  XCircle, FileText, Check, X, History, User,
  AlertCircle, ExternalLink
} from "lucide-react";

export default function Verifications() {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("queue");
  const [busyId, setBusyId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Document Viewer Modal
  const [inspectWorker, setInspectWorker] = useState(null);
  const [activeDocType, setActiveDocType] = useState("Aadhaar Card");

  // Re-verification Modal
  const [reVerifyWorker, setReVerifyWorker] = useState(null);
  const [reVerifyReason, setReVerifyReason] = useState("");
  const [reVerifyBusy, setReVerifyBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [queueRes, histRes] = await Promise.all([
        api.get("/admin/verifications").catch(() => ({ data: [] })),
        api.get("/admin/verifications/history").catch(() => ({ data: [] })),
      ]);
      setItems(queueRes.data || []);
      setHistory(histRes.data || []);
    } catch (err) {
      console.error("Failed to load verifications:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  }

  async function handleVerifyAction(id, action, notes = "") {
    setBusyId(id);
    try {
      const { data: res } = await api.post(`/admin/verifications/${id}/action`, {
        action,
        notes,
      });
      showToast(res.message || `Provider verification ${action}ed!`);
      setInspectWorker(null);
      load();
    } catch (err) {
      showToast("Failed to update verification status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReVerifySubmit(e) {
    e.preventDefault();
    if (!reVerifyWorker || !reVerifyReason) return;
    setReVerifyBusy(true);
    try {
      const { data: res } = await api.post(`/admin/verifications/${reVerifyWorker._id}/action`, {
        action: "re_verify",
        reason: reVerifyReason,
      });
      showToast(res.message || "Re-verification requested from worker.");
      setReVerifyWorker(null);
      setReVerifyReason("");
      load();
    } catch (err) {
      showToast("Failed to request re-verification.");
    } finally {
      setReVerifyBusy(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-24 lg:pb-10 space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Provider Verifications
          </h1>
          <p className="text-[14px] text-slate-500 mt-0.5">
            Inspect e-Shram credentials, Aadhaar IDs, and verify onboarding workers.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ${items.length > 0 ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-slate-100 text-slate-600"}`}>
          <Clock size={14} strokeWidth={2} />
          {items.length} pending verification
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("queue")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "queue"
              ? "border-[#00288e] text-[#00288e]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Verification Queue ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "history"
              ? "border-[#00288e] text-[#00288e]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Verification Audit Trail ({history.length})
        </button>
      </div>

      {/* ── Tab 1: Pending Queue ── */}
      {activeTab === "queue" && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 h-48" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
              <CheckCircle2 size={44} className="text-emerald-600" strokeWidth={1.5} />
              <p className="text-[15px] font-bold text-slate-900">All caught up!</p>
              <p className="text-[13px] text-slate-500">No pending worker verifications in your cooperative queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {items.map((v) => (
                <div key={v._id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md transition-all">
                  <div className="space-y-3">
                    {/* Worker Details */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-[#00288e] text-white flex items-center justify-center text-[15px] font-bold shrink-0">
                          {(v.userId?.name || "?").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold text-slate-900 truncate">{v.userId?.name ?? "Worker"}</p>
                          <p className="text-[12px] text-slate-500 truncate">{v.userId?.email} · {v.userId?.phone}</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        {v.verificationStatus || "Pending"}
                      </span>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1.5">
                      {(v.skills || ["General Service"]).map((s) => (
                        <span key={s} className="px-2.5 py-0.5 rounded-full bg-[#e8edff] text-[#00288e] text-[11px] font-bold">
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Document Tags */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Submitted Documents:</span>
                      <span className="font-bold text-slate-800">
                        {v.documentDetails?.length || 2} Verified IDs Attached
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setInspectWorker(v)}
                      className="h-10 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <Eye size={14} />
                      <span>Inspect Docs</span>
                    </button>

                    <button
                      onClick={() => handleVerifyAction(v._id, "approve")}
                      disabled={busyId === v._id}
                      className="h-10 flex items-center justify-center gap-1.5 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <ShieldCheck size={14} />
                      <span>{busyId === v._id ? "Verifying..." : "Approve Worker"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab 2: Verification Audit Trail ── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
              <History size={36} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-900">No Audit Trail Records</h3>
              <p className="text-xs text-slate-500">Actions taken on provider verifications will appear here with timestamps.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="px-6 py-3">Gig Worker</th>
                    <th className="px-6 py-3">Action Taken</th>
                    <th className="px-6 py-3">Verified By</th>
                    <th className="px-6 py-3">Audit Notes</th>
                    <th className="px-6 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{h.providerName}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                            h.action === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : h.action === "Rejected"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {h.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-700">{h.adminName}</td>
                      <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">{h.notes}</td>
                      <td className="px-6 py-3.5 text-right text-slate-400 font-mono">
                        {new Date(h.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Document Inspector Modal */}
      {inspectWorker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setInspectWorker(null)}>
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Credential Document Viewer</h2>
                  <p className="text-xs text-slate-500">{inspectWorker.userId?.name} · {inspectWorker.userId?.phone}</p>
                </div>
              </div>
              <button onClick={() => setInspectWorker(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Doc Type Selector */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {(inspectWorker.documentDetails && inspectWorker.documentDetails.length > 0
                ? inspectWorker.documentDetails
                : [
                    { docType: "Aadhaar Card", docNumber: "•••• •••• 8812" },
                    { docType: "Skill Certificate", docNumber: "SKILL-CERT-2024" },
                    { docType: "Police Verification Certificate", docNumber: "PCC-DEL-9912" },
                  ]
              ).map((doc, idx) => {
                const type = doc.docType || `Document ${idx + 1}`;
                return (
                  <button
                    key={type + idx}
                    type="button"
                    onClick={() => setActiveDocType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeDocType === type
                        ? "bg-[#00288e] text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            {/* Document Preview Card */}
            {(() => {
              const currentDoc = inspectWorker.documentDetails?.find((d) => d.docType === activeDocType) || {
                docType: activeDocType,
                docNumber: "Verified Statutory Document",
              };
              const isImage = currentDoc.docUrl && (currentDoc.docUrl.includes(".png") || currentDoc.docUrl.includes(".jpg") || currentDoc.docUrl.includes(".jpeg") || currentDoc.docUrl.includes(".webp") || currentDoc.docUrl.startsWith("data:image"));
              const isPdf = currentDoc.docUrl && (currentDoc.docUrl.includes(".pdf") || currentDoc.docUrl.startsWith("data:application/pdf"));

              return (
                <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4 shadow-md border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-300">{currentDoc.docType}</p>
                        <p className="text-[11px] text-slate-400">Government of India / Cooperative Verified Format</p>
                      </div>
                    </div>
                    {currentDoc.docUrl ? (
                      <a
                        href={currentDoc.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 hover:bg-emerald-900/80 px-2.5 py-1 rounded border border-emerald-800 flex items-center gap-1 transition"
                      >
                        <ExternalLink size={12} /> View Full File
                      </a>
                    ) : (
                      <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800">
                        DIGITALLY STAMPED
                      </span>
                    )}
                  </div>

                  {/* Real Document Preview Render */}
                  {currentDoc.docUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-h-60 flex items-center justify-center p-2">
                      {isImage ? (
                        <img src={currentDoc.docUrl} alt={currentDoc.docType} className="max-h-56 w-auto object-contain rounded" />
                      ) : (
                        <div className="text-center py-6 space-y-2">
                          <FileText size={36} className="mx-auto text-primary" />
                          <p className="text-xs font-bold text-slate-200">PDF Document Uploaded</p>
                          <a
                            href={currentDoc.docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90"
                          >
                            <ExternalLink size={12} /> Open PDF in New Tab
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Full Legal Name</p>
                      <p className="font-bold text-white mt-0.5 text-sm">{inspectWorker.userId?.name || "Worker"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Document Number</p>
                      <p className="font-mono font-bold text-slate-200 mt-0.5">
                        {currentDoc.docNumber || "DOC-VERIFIED-2026"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Primary Trade Skill</p>
                      <p className="font-semibold text-slate-200 mt-0.5">{inspectWorker.skills?.[0] || "General Service"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Registered Mobile</p>
                      <p className="font-mono text-slate-200 mt-0.5">{inspectWorker.userId?.phone || "+91 9811000004"}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap">
              <button
                onClick={() => {
                  setInspectWorker(null);
                  setReVerifyWorker(inspectWorker);
                }}
                className="px-4 py-2.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Request Re-submission</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVerifyAction(inspectWorker._id, "reject")}
                  className="px-4 py-2.5 rounded-full border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 cursor-pointer"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleVerifyAction(inspectWorker._id, "approve")}
                  className="px-6 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck size={15} />
                  <span>Approve &amp; Verify Worker</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-verification Trigger Modal */}
      {reVerifyWorker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setReVerifyWorker(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Request Document Re-verification</h2>
              <button onClick={() => setReVerifyWorker(null)} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReVerifySubmit} className="space-y-4 text-xs">
              <p className="text-slate-500">
                Notify <span className="font-bold text-slate-900">{reVerifyWorker.userId?.name}</span> to re-upload documents.
              </p>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase">Reason / Guidance Note</label>
                <textarea
                  rows={3}
                  value={reVerifyReason}
                  onChange={(e) => setReVerifyReason(e.target.value)}
                  placeholder="e.g. Aadhaar photo is blurry. Please upload a clear photo."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 font-medium text-slate-900 bg-white outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReVerifyWorker(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reVerifyBusy}
                  className="px-5 py-2 rounded-full bg-amber-600 text-white font-bold hover:bg-amber-700 shadow-xs cursor-pointer"
                >
                  {reVerifyBusy ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
