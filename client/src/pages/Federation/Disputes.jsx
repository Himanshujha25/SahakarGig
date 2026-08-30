import { useEffect, useState } from "react";
import api from "../../lib/api";
import {
  AlertTriangle, CheckCircle2, XCircle, ShieldAlert, MessageSquare,
  Search, RefreshCw, User, Users, IndianRupee, Clock, ArrowRight,
  BadgeAlert, ArrowUpRight, Scale, X, Send, CornerUpRight, ChevronDown
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

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Dispute Resolution Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              {disputes.length} Disputes
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Fair cooperative arbitration for service quality issues, escrow refunds, and worker penalties.
          </p>
        </div>

        <button
          onClick={load}
          className="p-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors cursor-pointer shadow-2xs shrink-0"
          title="Refresh disputes"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Tabs & Search (Dropdown on Mobile, Pills on Desktop) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Mobile Dropdown Select (< 640px) */}
        <div className="sm:hidden relative w-full">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full h-10 px-3.5 pr-8 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary shadow-2xs appearance-none"
          >
            <option value="all">All Disputes ({disputes.length})</option>
            <option value="open">Open &amp; Unassigned</option>
            <option value="investigating">Under Investigation</option>
            <option value="resolved">Resolved / Arbitrated</option>
            <option value="escalated">Escalated to Ministry</option>
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>

        {/* Desktop Segmented Pill Tabs (>= 640px) */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filter === tab.key
                  ? "bg-primary text-on-primary shadow-2xs"
                  : "text-on-surface-variant hover:bg-surface-container border border-outline-variant/40"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dispute, customer, worker..."
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-medium text-on-surface outline-none focus:border-primary shadow-2xs"
          />
        </div>
      </div>

      {/* ── MOBILE DISPUTES CARDS (< 768px) ── */}
      <div className="md:hidden space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-xs text-on-surface-variant">
            <RefreshCw size={22} className="animate-spin mx-auto text-primary mb-2" />
            Loading disputes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-outline-variant text-center text-xs text-on-surface-variant bg-surface">
            <ShieldAlert size={32} className="mx-auto text-emerald-500 mb-1.5" />
            <p className="font-bold text-on-surface">Zero active disputes in this queue</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Cooperative fulfillment is operating with high trust index.</p>
          </div>
        ) : (
          filtered.map((d) => {
            const resStatus = d.disputeResolution?.status || (d.status === "disputed" ? "open" : "resolved");
            return (
              <div
                key={d._id}
                className="p-3.5 rounded-2xl border border-outline-variant/60 bg-surface space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-primary">
                        #{d._id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-on-surface">
                        &middot; {d.service || d.targetCategory}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₹{d.price || 250} Escrow Protected
                    </p>
                  </div>

                  {resStatus === "open" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/20">
                      <BadgeAlert size={11} /> Open
                    </span>
                  ) : resStatus === "investigating" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20">
                      Investigating
                    </span>
                  ) : resStatus === "escalated" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-500/20">
                      Escalated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                      Resolved
                    </span>
                  )}
                </div>

                {/* Parties Details */}
                <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant">Customer:</span>
                    <span className="font-bold text-on-surface">{d.householdId?.name || "Customer"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant">Worker:</span>
                    <span className="font-bold text-on-surface">{d.providerId?.userId?.name || "Worker"} ({d.cooperativeId?.name || "Society"})</span>
                  </div>
                </div>

                {/* Issue reason */}
                <p className="text-[11.5px] text-on-surface font-medium line-clamp-2">
                  <strong className="text-on-surface-variant">Issue:</strong> {d.issue || d.disputeCategory || "Work quality issue"}
                </p>

                {/* Action button */}
                <div className="pt-2 border-t border-outline-variant/40 flex justify-end">
                  <button
                    onClick={() => openDetail(d)}
                    className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-98"
                  >
                    <span>Review &amp; Arbitrate</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── DESKTOP DISPUTES TABLE (>= 768px) ── */}
      <div className="hidden md:block rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
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
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" onClick={() => setSelectedDispute(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-outline-variant rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-error-container text-on-error-container flex items-center justify-center font-bold">
                  <Scale size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-on-surface">Arbitration Tribunal &middot; #{selectedDispute._id.slice(-6).toUpperCase()}</h2>
                  <p className="text-[11px] text-on-surface-variant">Escrow Value: ₹{selectedDispute.price} &middot; {selectedDispute.service}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDispute(null)} className="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Parties Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Household Customer</span>
                <p className="text-xs font-bold text-on-surface">{selectedDispute.householdId?.name || "Customer"}</p>
                <p className="text-[11px] text-on-surface-variant">{selectedDispute.householdId?.phone || selectedDispute.householdId?.email}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-on-surface-variant">Service Provider</span>
                <p className="text-xs font-bold text-on-surface">{selectedDispute.providerId?.userId?.name || "Worker"}</p>
                <p className="text-[11px] text-primary">{selectedDispute.cooperativeId?.name || "Cooperative Society"}</p>
              </div>
            </div>

            {/* Dispute Complaint Details & Evidence */}
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
              <span className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={12} /> Claimed Issue / Reason
              </span>
              <p className="text-xs font-semibold text-on-surface">
                {selectedDispute.issue || selectedDispute.disputeCategory || "Work not completed as promised"}
              </p>
              {selectedDispute.disputeEvidence?.length > 0 && (
                <div className="pt-1.5 border-t border-rose-500/10 flex items-center gap-2">
                  <span className="text-[10.5px] font-bold text-on-surface-variant">Evidence:</span>
                  {selectedDispute.disputeEvidence.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary underline">
                      Evidence #{idx + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Arbitration Decision Form */}
            <form onSubmit={handleArbitrationSubmit} className="space-y-3 border-t border-outline-variant/60 pt-3 text-xs">
              <span className="text-xs font-bold text-on-surface block">Arbitration Verdict &amp; Escrow Resolution</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: "refund_household", label: "Full / Partial Refund to Customer", desc: "Refund escrow back to customer wallet/card" },
                  { key: "release_provider", label: "Release Escrow to Provider", desc: "Dismiss dispute, pay worker with full earnings" },
                  { key: "penalty_provider", label: "Apply Penalty to Worker", desc: "Deduct penalty fee and record warning" },
                  { key: "warning", label: "Mutual Resolution & Warning", desc: "Mark resolved with formal warning notice" },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedDecision === opt.key
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-outline-variant/60 bg-surface-container-low hover:bg-surface-container"
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
                      <span className="text-[11.5px] font-bold">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mt-0.5 ml-5">{opt.desc}</p>
                  </label>
                ))}
              </div>

              {selectedDecision === "refund_household" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant">Refund Amount (₹)</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={selectedDispute.price}
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
              )}

              {selectedDecision === "penalty_provider" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant">Penalty Amount (₹)</label>
                  <input
                    type="number"
                    value={penaltyAmount}
                    onChange={(e) => setPenaltyAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant">Arbitration Reason &amp; Order Notes</label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  rows={2}
                  placeholder="State the regulatory basis and order details for this decision..."
                  className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-primary font-medium resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleEscalate}
                  disabled={actionBusy}
                  className="px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-all cursor-pointer flex items-center gap-1"
                >
                  <CornerUpRight size={13} /> Escalate
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDispute(null)}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {actionBusy ? "Executing…" : "Execute Order"}
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
