import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  ShieldCheck, CheckCircle2, XCircle, AlertCircle, FileText,
  Search, Filter, Check, Eye, RefreshCw, Users, IdCard, ExternalLink,
  ChevronRight, Building2, BadgeCheck, X, AlertTriangle, Layers
} from "lucide-react";

export default function FederationVerifications() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending"); // "all" | "pending" | "verified" | "re_verification"
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reVerifyModal, setReVerifyModal] = useState(null);
  const [reVerifyReason, setReVerifyReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/federation/verifications?status=${filterStatus}`);
      setProviders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load verifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setSelectedIds([]);
  }, [filterStatus]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  }

  // Handle single provider verify
  async function handleVerify(providerId, status = "verified", notes = "") {
    setActionBusy(true);
    try {
      await api.patch(`/federation/verifications/${providerId}/verify`, { status, notes });
      showToast(status === "verified" ? "Provider verified successfully!" : "Provider rejected.");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Action failed.");
    } finally {
      setActionBusy(false);
    }
  }

  // Handle Re-verification request
  async function handleReVerifySubmit(e) {
    e.preventDefault();
    if (!reVerifyModal || !reVerifyReason.trim()) return;
    setActionBusy(true);
    try {
      await api.patch(`/federation/verifications/${reVerifyModal._id}/re-verify`, {
        reason: reVerifyReason.trim(),
      });
      showToast("Re-verification notice sent to provider.");
      setReVerifyModal(null);
      setReVerifyReason("");
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to send re-verification request.");
    } finally {
      setActionBusy(false);
    }
  }

  // Handle Bulk Approve
  async function handleBulkApprove() {
    if (selectedIds.length === 0) return;
    setActionBusy(true);
    try {
      const { data } = await api.post("/federation/verifications/bulk-verify", {
        providerIds: selectedIds,
      });
      showToast(data.message || `Bulk-verified ${selectedIds.length} providers!`);
      setSelectedIds([]);
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Bulk verification failed.");
    } finally {
      setActionBusy(false);
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p) => p._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filtered = providers.filter((p) => {
    const name = p.userId?.name || "";
    const coop = p.cooperativeId?.name || "";
    const email = p.userId?.email || "";
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || coop.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <BadgeCheck size={18} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Bulk Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <ShieldCheck size={16} />
            <span>Federation Regulatory Oversight</span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-on-surface">
            Provider Verification Queue
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Audit identity credentials, e-Shram certifications, and approve worker memberships.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006d30] text-white text-xs font-bold hover:bg-[#005a26] transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>Bulk Approve ({selectedIds.length} Selected)</span>
            </button>
          )}
          <button
            onClick={load}
            className="p-2 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full sm:w-auto">
          {[
            { key: "pending", label: "Pending Review", count: providers.filter((p) => !p.verified).length },
            { key: "re_verification", label: "Re-Verification Req.", count: providers.filter((p) => p.verificationStatus === "re_verification_requested").length },
            { key: "verified", label: "Verified Active", count: providers.filter((p) => p.verified).length },
            { key: "all", label: "All Records", count: providers.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === tab.key
                  ? "bg-[#e8edff] text-[#00288e] border border-[#00288e]/30 shadow-2xs"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search provider, cooperative..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Verification Queue Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[750px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll}
                    className="rounded accent-primary cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="px-4 py-3">Provider / Worker</th>
                <th className="px-4 py-3">Affiliated Cooperative</th>
                <th className="px-4 py-3">Trade Skills</th>
                <th className="px-4 py-3">Submitted Docs</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-on-surface-variant">
                    <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
                    Loading provider credentials…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-sm text-on-surface-variant">
                    <ShieldCheck size={36} className="mx-auto text-on-surface-variant/40 mb-2" />
                    No provider verification requests matching this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isSelected = selectedIds.includes(p._id);
                  const isVer = !!p.verified;
                  const isReVer = p.verificationStatus === "re_verification_requested";

                  return (
                    <tr key={p._id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(p._id)}
                          className="rounded accent-primary cursor-pointer h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {p.userId?.name?.[0]?.toUpperCase() || "W"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface leading-tight">
                              {p.userId?.name || "Provider Member"}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              {p.userId?.phone || p.userId?.email || "ID: " + p._id.slice(-6)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
                          <Building2 size={14} className="text-primary shrink-0" />
                          <span>{p.cooperativeId?.name || "Independent"}</span>
                        </div>
                        <span className="text-[10.5px] text-on-surface-variant">
                          {p.cooperativeId?.region || "Delhi Region"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(p.skills || ["General"]).map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[11px] font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {(p.documentDetails || []).map((d, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedDoc({ ...d, providerName: p.userId?.name })}
                              className="px-2 py-1 rounded-lg border border-outline-variant bg-surface text-[11px] font-bold text-primary hover:bg-primary-container flex items-center gap-1 cursor-pointer transition-all"
                              title={`Preview ${d.docType}`}
                            >
                              <FileText size={12} />
                              <span>{d.docType?.split(" ")[0]}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {isVer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e6f9ec] text-[#006d30] text-[11.5px] font-bold">
                            <BadgeCheck size={13} /> Verified
                          </span>
                        ) : isReVer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11.5px] font-bold">
                            <AlertCircle size={13} /> Re-verify Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11.5px] font-bold">
                            Pending Audit
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isVer ? (
                            <button
                              onClick={() => handleVerify(p._id, "verified")}
                              disabled={actionBusy}
                              className="px-2.5 py-1.5 rounded-lg bg-[#006d30] text-white text-xs font-bold hover:bg-[#005a26] transition-all cursor-pointer flex items-center gap-1"
                              title="Approve verification"
                            >
                              <Check size={13} strokeWidth={2.5} /> Approve
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerify(p._id, "rejected", "Revoked by Federation")}
                              disabled={actionBusy}
                              className="px-2.5 py-1.5 rounded-lg border border-error text-error hover:bg-error-container text-xs font-bold transition-all cursor-pointer"
                              title="Revoke verification"
                            >
                              Revoke
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setReVerifyModal(p);
                              setReVerifyReason("");
                            }}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all cursor-pointer"
                            title="Request document re-upload"
                          >
                            <AlertTriangle size={15} className="text-amber-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Document Viewer Modal ── */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedDoc(null)}>
          <div className="w-full max-w-2xl bg-surface border border-outline-variant rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                  <IdCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">{selectedDoc.docType}</h3>
                  <p className="text-xs text-on-surface-variant">Worker: {selectedDoc.providerName || "Cooperative Provider"}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Document Preview Mock Card */}
            <div className="p-8 rounded-xl bg-surface-container-lowest border border-outline-variant text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <FileText size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{selectedDoc.docType}</p>
                <p className="text-xs font-mono text-on-surface-variant mt-1">Doc Number: {selectedDoc.docNumber || "REG-9921-2026"}</p>
                <p className="text-[11px] text-emerald-700 bg-emerald-50 inline-block px-3 py-1 rounded-full font-bold mt-2 border border-emerald-200">
                  ✓ Encrypted Digitally Signed Document
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-on-surface-variant">Verified with UIDAI / Ministry e-Shram API</span>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Re-Verification Reason Modal ── */}
      {reVerifyModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setReVerifyModal(null)}>
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                <h3 className="text-base font-bold text-on-surface">Request Document Re-Upload</h3>
              </div>
              <button onClick={() => setReVerifyModal(null)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReVerifySubmit} className="space-y-3">
              <p className="text-xs text-on-surface-variant">
                Explain what needs correction to <strong>{reVerifyModal.userId?.name}</strong>. An instant notification will be delivered to their portal.
              </p>
              <textarea
                value={reVerifyReason}
                onChange={(e) => setReVerifyReason(e.target.value)}
                placeholder="e.g. Aadhaar card image is blurry or expired trade license..."
                rows={4}
                className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none focus:border-primary font-medium"
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReVerifyModal(null)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy || !reVerifyReason.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {actionBusy ? "Sending…" : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
