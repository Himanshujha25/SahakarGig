import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  AlertTriangle, CheckCircle2, XCircle, ShieldAlert, MessageSquare,
  Search, RefreshCw, User, Users, IndianRupee, Clock, ArrowRight,
  BadgeAlert, ArrowUpRight, Scale, X, Send, CornerUpRight
} from "lucide-react";

export default function FederationDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "open" | "investigating" | "resolved" | "escalated"
  const [search, setSearch] = useState("");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [selectedDecision, setSelectedDecision] = useState("refund_household");
  const [refundAmount, setRefundAmount] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/federation/disputes");
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load disputes:", err);
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

  async function openDetail(dispute) {
    setSelectedDispute(dispute);
    setDecisionNotes("");
    setSelectedDecision("refund_household");
    setRefundAmount(dispute.price || 0);
    setPenaltyAmount(0);
  }

  async function handleArbitrationSubmit(e) {
    e.preventDefault();
    if (!selectedDispute) return;
    setActionBusy(true);
    try {
      const { data } = await api.post(`/federation/disputes/${selectedDispute._id}/resolve`, {
        decision: selectedDecision,
        notes: decisionNotes,
        refundAmount: Number(refundAmount) || 0,
        penaltyAmount: Number(penaltyAmount) || 0,
      });
      showToast(data.message || "Dispute arbitration decision executed successfully.");
      setSelectedDispute(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to execute decision.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleEscalate() {
    if (!selectedDispute) return;
    setActionBusy(true);
    try {
      const { data } = await api.post(`/federation/disputes/${selectedDispute._id}/escalate`, {
        notes: decisionNotes || "Escalated to Ministry Super-Admin for compliance review",
      });
      showToast(data.message || "Dispute escalated to Platform Super-Admin.");
      setSelectedDispute(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || "Escalation failed.");
    } finally {
      setActionBusy(false);
    }
  }

  const filtered = disputes.filter((d) => {
    const status = d.disputeResolution?.status || (d.status === "disputed" ? "open" : "resolved");
    const matchesFilter = filter === "all" || status === filter;

    const hName = d.householdId?.name || "";
    const pName = d.providerId?.userId?.name || "";
    const svc = d.service || d.targetCategory || "";
    const q = search.toLowerCase();
    const matchesSearch = hName.toLowerCase().includes(q) || pName.toLowerCase().includes(q) || svc.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <Scale size={16} />
            <span>Appellate Tribunal &amp; Arbitration</span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-on-surface">
            Dispute Resolution Center
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Fair cooperative arbitration for service quality issues, escrow refunds, and worker penalties.
          </p>
        </div>

        <button
          onClick={load}
          className="p-2 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh disputes"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full sm:w-auto">
          {[
            { key: "all", label: "All Disputes" },
            { key: "open", label: "Open & Unassigned" },
            { key: "investigating", label: "Under Investigation" },
            { key: "resolved", label: "Resolved / Arbitrated" },
            { key: "escalated", label: "Escalated to Ministry" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === tab.key
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
            placeholder="Search dispute, customer, worker..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface text-xs font-semibold text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Disputes Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[750px]">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-5 py-3">Booking ID</th>
                <th className="px-5 py-3">Service &amp; Price</th>
                <th className="px-5 py-3">Complainant / Household</th>
                <th className="px-5 py-3">Provider / Cooperative</th>
                <th className="px-5 py-3">Reason / Issue</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-on-surface-variant">
                    <RefreshCw size={24} className="animate-spin mx-auto text-primary mb-2" />
                    Loading dispute cases…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-sm text-on-surface-variant">
                    <ShieldAlert size={36} className="mx-auto text-emerald-500 mb-2" />
                    <p className="font-bold text-on-surface">Zero active disputes in this queue</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">Cooperative fulfillment is operating with high trust index.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const resStatus = d.disputeResolution?.status || (d.status === "disputed" ? "open" : "resolved");
                  return (
                    <tr key={d._id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-primary">
                        #{d._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-bold text-on-surface">{d.service || d.targetCategory}</div>
                        <div className="text-xs text-[#006d30] font-bold">₹{d.price || 250} Escrow</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-bold text-on-surface">{d.householdId?.name || "Household"}</div>
                        <div className="text-[11px] text-on-surface-variant">{d.householdId?.phone || d.householdId?.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs font-bold text-on-surface">{d.providerId?.userId?.name || "Assigned Worker"}</div>
                        <div className="text-[11px] text-primary">{d.cooperativeId?.name || "Cooperative Society"}</div>
                      </td>
                      <td className="px-5 py-3.5 max-w-[200px]">
                        <p className="text-xs text-on-surface truncate font-semibold">{d.issue || d.disputeCategory || "Quality / pricing dispute"}</p>
                        <p className="text-[11px] text-on-surface-variant">{new Date(d.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {resStatus === "open" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-bold">
                            <BadgeAlert size={12} /> Open
                          </span>
                        ) : resStatus === "investigating" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                            Investigating
                          </span>
                        ) : resStatus === "escalated" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[11px] font-bold">
                            Escalated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                            Resolved
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => openDetail(d)}
                          className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:shadow-md transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Review &amp; Arbitrate</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dispute Detail & Arbitration Decision Modal ── */}
      {selectedDispute && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedDispute(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 lg:p-8 space-y-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center font-bold">
                  <Scale size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Arbitration Tribunal — Dispute #{selectedDispute._id.slice(-6).toUpperCase()}</h2>
                  <p className="text-xs text-on-surface-variant">Service: {selectedDispute.service} · Escrow Value: ₹{selectedDispute.price}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDispute(null)} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Parties Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-1">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">Household Customer</span>
                <p className="text-sm font-bold text-on-surface">{selectedDispute.householdId?.name || "Customer"}</p>
                <p className="text-xs text-on-surface-variant">{selectedDispute.householdId?.phone || selectedDispute.householdId?.email}</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-1">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">Service Provider</span>
                <p className="text-sm font-bold text-on-surface">{selectedDispute.providerId?.userId?.name || "Worker"}</p>
                <p className="text-xs text-primary">{selectedDispute.cooperativeId?.name || "Cooperative Society"}</p>
              </div>
            </div>

            {/* Dispute Complaint Details & Evidence */}
            <div className="p-4 rounded-2xl bg-error/5 border border-error/20 space-y-2">
              <span className="text-xs font-bold text-error uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} /> Claimed Issue / Reason
              </span>
              <p className="text-sm font-semibold text-on-surface">
                {selectedDispute.issue || selectedDispute.disputeCategory || "Work not completed as promised"}
              </p>
              {selectedDispute.disputeEvidence?.length > 0 && (
                <div className="pt-2 border-t border-error/10 flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface-variant">Uploaded Evidence:</span>
                  {selectedDispute.disputeEvidence.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary underline">
                      Evidence #{idx + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Chat History Snippet */}
            {selectedDispute.chat?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare size={13} /> In-Booking Communication Log ({selectedDispute.chat.length} messages)
                </span>
                <div className="p-3 max-h-36 overflow-y-auto rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2 text-xs">
                  {selectedDispute.chat.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0">{c.sender?.name || "User"}:</span>
                      <span className="text-on-surface">{c.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Arbitration Decision Form */}
            <form onSubmit={handleArbitrationSubmit} className="space-y-4 border-t border-outline-variant pt-4">
              <span className="text-sm font-bold text-on-surface block">Federation Arbitration Verdict</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: "refund_household", label: "Full / Partial Refund to Customer", desc: "Refund escrow payment back to customer wallet/card" },
                  { key: "release_provider", label: "Release Escrow to Provider", desc: "Dismiss dispute, pay worker with full earnings" },
                  { key: "penalty_provider", label: "Apply Penalty to Worker", desc: "Deduct penalty fee and record warning on trust score" },
                  { key: "warning", label: "Mutual Resolution & Warning", desc: "Mark resolved with formal warning notice" },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      selectedDecision === opt.key
                        ? "border-primary bg-primary-container text-on-primary-container ring-1 ring-primary"
                        : "border-outline-variant bg-surface hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="decision"
                        checked={selectedDecision === opt.key}
                        onChange={() => setSelectedDecision(opt.key)}
                        className="accent-primary"
                      />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1 ml-5">{opt.desc}</p>
                  </label>
                ))}
              </div>

              {selectedDecision === "refund_household" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Refund Amount (₹)</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={selectedDispute.price}
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
              )}

              {selectedDecision === "penalty_provider" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant">Penalty Amount (₹)</label>
                  <input
                    type="number"
                    value={penaltyAmount}
                    onChange={(e) => setPenaltyAmount(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant">Arbitration Reason &amp; Order Notes</label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  rows={3}
                  placeholder="State the regulatory basis and order details for this decision..."
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface outline-none focus:border-primary font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleEscalate}
                  disabled={actionBusy}
                  className="px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50 text-purple-900 text-xs font-bold hover:bg-purple-100 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CornerUpRight size={14} /> Escalate to Super-Admin
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDispute(null)}
                    className="px-4 py-2.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionBusy ? "Executing Decision…" : "Execute Arbitration Order"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
