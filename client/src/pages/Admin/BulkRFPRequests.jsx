import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../lib/toast";
import FileUpload from "../../components/FileUpload";
import {
  Users,
  Calendar,
  CheckCircle2,
  FileText,
  MessageSquare,
  Send,
  X,
  Edit3,
  UserCheck,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Upload,
  DollarSign,
  Eye,
} from "lucide-react";
import { SkeletonCard, EmptyState, ErrorState } from "../../components/UIStateComponents";

function timeAgo(dateString) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(seconds) || seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function BulkRFPRequests() {
  const { user } = useAuth();
  const [rfps, setRfps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [coopProviders, setCoopProviders] = useState([]);

  // Modal State
  const [selectedRfp, setSelectedRfp] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState("chat"); // 'chat' | 'quote' | 'allocate' | 'payout'

  // Chat & Quote
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [revisedPrice, setRevisedPrice] = useState("");
  const [revisedNotes, setRevisedNotes] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const chatBottomRef = useRef(null);

  // Worker Allocation Matrix state
  // Map of slotIndex/roleKey -> providerId
  const [allocationSelections, setAllocationSelections] = useState({});
  const [allocating, setAllocating] = useState(false);

  // Re-allocation Modal State
  const [reallocTarget, setReallocTarget] = useState(null); // { allocationId, role, currentProviderId }
  const [newReallocProviderId, setNewReallocProviderId] = useState("");
  const [reallocating, setReallocating] = useState(false);

  // Worker Payout SS Proof State
  const [payoutTarget, setPayoutTarget] = useState(null); // { allocationId, role, providerName, amount }
  const [payoutSsUrl, setPayoutSsUrl] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutTxnRef, setPayoutTxnRef] = useState("");
  const [uploadingPayout, setUploadingPayout] = useState(false);

  const loadRfps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rfpRes, provRes] = await Promise.all([
        api.get("/admin/rfp").catch((err) => { throw err; }),
        api.get("/admin/providers").catch(() => ({ data: [] })),
      ]);
      const list = rfpRes.data || [];
      setRfps(list);

      const pList = provRes.data?.providers || (Array.isArray(provRes.data) ? provRes.data : []);
      setCoopProviders(pList);

      setSelectedRfp((prev) => (prev ? list.find((x) => x._id === prev._id) || prev : null));
    } catch (err) {
      setError("Failed to fetch RFP requests. Please check your network connection and try again.");
      setRfps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRfps();
    if (!socket.connected) socket.connect();
    socket.on("rfp:new", loadRfps);
    socket.on("booking:new", loadRfps);
    socket.on("booking:updated", loadRfps);
    socket.on("rfp:worker_response", loadRfps);
    socket.on("booking:chat", ({ bookingId, message }) => {
      setSelectedRfp((prev) => {
        if (!prev) return prev;
        const id = prev._id?.toString?.() ?? prev._id;
        if (id !== bookingId?.toString?.() && id !== bookingId) return prev;
        return { ...prev, chat: [...(prev.chat || []), message] };
      });
    });
    return () => {
      socket.off("rfp:new");
      socket.off("booking:new");
      socket.off("booking:updated");
      socket.off("rfp:worker_response");
      socket.off("booking:chat");
    };
  }, [loadRfps]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedRfp?.chat?.length]);

  const openModal = (rfp, tab = "chat") => {
    setSelectedRfp(rfp);
    setActiveModalTab(tab);
    setRevisedPrice(rfp.price ?? "");
    setRevisedNotes("");
    setChatMessage("");
    setAllocationSelections({});
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedRfp) return;
    setSendingChat(true);
    try {
      await api.post(`/bookings/${selectedRfp._id}/chat`, { message: chatMessage });
      setChatMessage("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not send message.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleSendQuotation = async (e) => {
    e.preventDefault();
    if (!revisedPrice || !selectedRfp) return;
    setSubmittingQuote(true);
    try {
      await api.patch(`/admin/rfp/${selectedRfp._id}/quotation`, {
        price: Number(revisedPrice),
        notes: revisedNotes,
      });
      toast.success("Institutional Quotation sent to Household successfully!");
      setActiveModalTab("chat");
      loadRfps();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update quotation.");
    } finally {
      setSubmittingQuote(false);
    }
  };

  // Build allocation payload from role requirements
  const handleAllocateWorkersSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRfp) return;

    // Convert selections object into array of { role, providerId }
    const allocationsArray = Object.entries(allocationSelections)
      .filter(([_, pId]) => !!pId)
      .map(([key, providerId]) => {
        const roleName = key.split("__")[0];
        return { role: roleName, providerId };
      });

    if (allocationsArray.length === 0) {
      toast.warning("Please select at least 1 worker to allocate.");
      return;
    }

    setAllocating(true);
    try {
      await api.post(`/admin/rfp/${selectedRfp._id}/allocate`, { allocations: allocationsArray });
      toast.success("Workers allocated successfully! Notifications sent to each worker.");
      loadRfps();
      setActiveModalTab("allocate");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Allocation failed.");
    } finally {
      setAllocating(false);
    }
  };

  const handleReallocateSubmit = async (e) => {
    e.preventDefault();
    if (!reallocTarget || !newReallocProviderId) return;

    setReallocating(true);
    try {
      await api.post(`/admin/rfp/${selectedRfp._id}/reallocate`, {
        allocationId: reallocTarget.allocationId,
        providerId: newReallocProviderId,
        sameWorker: newReallocProviderId === reallocTarget.currentProviderId,
      });
      toast.success("Slot re-allocated successfully! Reassignment notification sent.");
      setReallocTarget(null);
      loadRfps();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reallocation failed.");
    } finally {
      setReallocating(false);
    }
  };

  const handleVerifyHouseholdPayment = async (rfpId) => {
    try {
      await api.patch(`/admin/rfp/${rfpId}/verify-payment`);
      toast.success("Household payment screenshot proof VERIFIED! Funds recorded in Escrow.");
      loadRfps();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Verification failed.");
    }
  };

  const handleWorkerPayoutProofSubmit = async (e) => {
    e.preventDefault();
    if (!payoutTarget || !payoutSsUrl) {
      toast.warning("Please upload the payout screenshot proof.");
      return;
    }

    setUploadingPayout(true);
    try {
      await api.post(`/admin/rfp/${selectedRfp._id}/payout-proof`, {
        allocationId: payoutTarget.allocationId,
        payoutProofUrl: payoutSsUrl,
        amount: Number(payoutAmount) || payoutTarget.amount || 2000,
        txnRef: payoutTxnRef || `PAYOUT-SS-${Date.now().toString().slice(-6)}`,
      });
      toast.success("Worker Payout screenshot proof recorded and disbursed in ledger!");
      setPayoutTarget(null);
      setPayoutSsUrl("");
      setPayoutTxnRef("");
      loadRfps();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record payout proof.");
    } finally {
      setUploadingPayout(false);
    }
  };

  const filtered = rfps.filter((r) => {
    if (activeFilter === "requested") return r.status === "requested";
    if (activeFilter === "accepted") return r.status === "accepted" || r.status === "in-progress";
    if (activeFilter === "completed") return r.status === "completed";
    return true;
  });

  const myId = user?.id?.toString() || user?._id?.toString();

  // Helper to generate unallocated slots array from rolesNeeded and active allocations
  const generateRoleSlots = (rfp) => {
    const rolesNeeded = rfp.bulkDetails?.rolesNeeded || [];
    const allocations = rfp.bulkDetails?.allocations || [];
    const activeAllocations = allocations.filter((a) => a.status !== "rejected");

    if (rolesNeeded.length === 0) {
      // Fallback
      const count = rfp.groupBooking?.memberCount || 1;
      const allocatedCount = activeAllocations.length;
      const remainingCount = Math.max(0, count - allocatedCount);
      return Array.from({ length: remainingCount }, (_, i) => ({
        role: "Labour",
        index: allocatedCount + i,
        key: `Labour__${allocatedCount + i}`,
      }));
    }

    const slots = [];
    rolesNeeded.forEach((r) => {
      const activeForRole = activeAllocations.filter((a) => a.role === r.role).length;
      const remainingForRole = Math.max(0, r.count - activeForRole);
      for (let i = 0; i < remainingForRole; i++) {
        const slotIdx = activeForRole + i;
        slots.push({ role: r.role, index: slotIdx, key: `${r.role}__${slotIdx}` });
      }
    });
    return slots;
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface"
              style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
              Institutional Bulk RFPs &amp; Multi-Worker Allocation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              {rfps.length} Orders
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Review multi-role bulk orders, send quotations, allocate society workers, handle reallocations, and upload payout proof SS.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/60 overflow-x-auto scrollbar-none self-start sm:self-auto">
          {[
            { key: "all", label: "All RFPs" },
            { key: "requested", label: "Pending" },
            { key: "accepted", label: "Mobilized" },
            { key: "completed", label: "Completed" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                activeFilter === f.key
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RFP Cards ── */}
      {loading ? (
        <SkeletonCard count={3} />
      ) : error ? (
        <ErrorState title="RFP Requests Unavailable" message={error} onRetry={loadRfps} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No RFPs in This Category"
          description="Institutional crew requests from verified households and businesses will appear here in real time."
        />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filtered.map((rfp) => {
            const isPending = rfp.status === "requested";
            const memberCount = rfp.groupBooking?.memberCount || 2;
            const rolesNeeded = rfp.bulkDetails?.rolesNeeded || [];
            const allocations = rfp.bulkDetails?.allocations || [];
            const rejectedAllocations = allocations.filter((a) => a.status === "rejected");
            const paymentProof = rfp.bulkDetails?.householdPaymentProof;

            return (
              <div
                key={rfp._id}
                onClick={() => openModal(rfp, "chat")}
                className={`rounded-2xl border transition-all p-4 sm:p-5 cursor-pointer hover:shadow-sm ${
                  isPending ? "border-primary/40 bg-surface shadow-2xs" : "border-outline-variant/60 bg-surface"
                }`}
              >
                {/* Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-outline-variant/40">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary text-[11px] font-bold flex items-center gap-1">
                        <Users size={11} /> {memberCount} Workers Requested
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[11px] font-bold border border-outline-variant/60 flex items-center gap-1">
                        <Calendar size={11} /> {timeAgo(rfp.createdAt)}
                      </span>

                      {/* Status Badges */}
                      {rfp.bulkDetails?.quotation?.status === "sent" && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
                          📑 Quotation Sent
                        </span>
                      )}
                      {rfp.bulkDetails?.quotation?.status === "accepted" && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          ✓ Quotation Accepted by Client
                        </span>
                      )}

                      {rejectedAllocations.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[11px] font-bold animate-pulse">
                          ⚠️ {rejectedAllocations.length} Worker Rejected - Reallocate Needed
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-on-surface leading-snug truncate">{rfp.service}</h3>
                    <p className="text-xs text-on-surface-variant truncate">
                      Client: <span className="font-bold text-on-surface">{rfp.householdId?.name || "Household"}</span>
                      {rfp.householdId?.phone && <span> &middot; {rfp.householdId.phone}</span>}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right mr-1">
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Escrow Budget</p>
                      <p className="text-lg sm:text-xl font-black text-primary">₹{(rfp.price || 0).toLocaleString("en-IN")}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(rfp, "quote"); }}
                        className="h-8 sm:h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 size={13} className="text-primary" />
                        <span>Quote</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(rfp, "allocate"); }}
                        className="h-8 sm:h-9 px-3 rounded-xl bg-primary hover:opacity-90 text-on-primary font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      >
                        <UserCheck size={13} />
                        <span>Allocate ({allocations.length}/{memberCount})</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Multi-role requirements breakdown display */}
                {rolesNeeded.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {rolesNeeded.map((r, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-surface-container-low border border-outline-variant text-[11px] font-bold text-on-surface">
                        {r.count}x {r.role} (₹{r.dailyRate}/day)
                      </span>
                    ))}
                  </div>
                )}

                {/* Household Payment Proof Alert Banner */}
                {paymentProof && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between text-emerald-950">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                      <div>
                        <p className="font-bold">
                          Household Payment Screenshot Uploaded (Amount: ₹{((paymentProof.amount && paymentProof.amount > 0) ? paymentProof.amount : (rfp.price || 0)).toLocaleString("en-IN")})
                        </p>
                        <p className="text-[10.5px]">Ref: {paymentProof.txnRef || "SS-Proof"}</p>
                      </div>
                    </div>
                    {!paymentProof.verifiedByCoop ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleVerifyHouseholdPayment(rfp._id); }}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                      >
                        Verify Payment Proof
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10.5px] font-extrabold">
                        ✓ Verified by Coop
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MULTI-FUNCTIONAL MODAL (CHAT, QUOTE, ALLOCATE, PAYOUT)
          ══════════════════════════════════════════════════════ */}
      {selectedRfp && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedRfp(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-outline-variant bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container-low">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-on-surface text-sm sm:text-base truncate">
                    {selectedRfp.service}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary text-[10px] font-bold shrink-0">
                    {selectedRfp.groupBooking?.memberCount || 2} Crew
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant truncate">
                  Client: {selectedRfp.householdId?.name} ({selectedRfp.householdId?.phone || "App Contact"})
                </p>
              </div>

              {/* Navigation Bar inside modal */}
              <div className="flex items-center gap-1.5">
                {[
                  { key: "chat", label: "Chat", icon: MessageSquare },
                  { key: "quote", label: "Send Quote", icon: Edit3 },
                  { key: "allocate", label: "Allocate Crew", icon: UserCheck },
                ].map((tab) => {
                  const IconComp = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveModalTab(tab.key)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                        activeModalTab === tab.key
                          ? "bg-primary text-on-primary shadow-xs"
                          : "border border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      <IconComp size={13} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedRfp(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeModalTab === "quote" ? (
                /* ── QUOTATION FORM ── */
                <form onSubmit={handleSendQuotation} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-on-surface">
                    <p className="font-bold text-primary">Total Estimated Escrow Budget: ₹{(selectedRfp.price || 0).toLocaleString("en-IN")}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Construct formal quotation with breakdown for the household.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface">Total Quotation Price (₹)</label>
                    <input
                      type="number"
                      value={revisedPrice}
                      onChange={(e) => setRevisedPrice(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm font-bold text-on-surface outline-none focus:border-primary"
                      placeholder="e.g. 45000"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface">Quotation Breakdown & Justification Notes</label>
                    <textarea
                      rows={4}
                      value={revisedNotes}
                      onChange={(e) => setRevisedNotes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-primary"
                      placeholder="e.g. Rate breakdown: 3 Labourers @ ₹600/day + 2 Plumbers @ ₹700/day + 1 Carpenter @ ₹800/day for 3 Days. Includes safety gear and society welfare fund."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={submittingQuote}
                      className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                    >
                      {submittingQuote ? "Sending Quotation..." : "Transmit Formal Quotation"}
                    </button>
                  </div>
                </form>
              ) : activeModalTab === "allocate" ? (
                /* ── WORKER ALLOCATION MATRIX ── */
                <div className="space-y-5">
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-on-surface">
                    <p className="font-bold text-primary">Assign Verified Society Members to RFP Slots</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Allocated gig workers can ACCEPT or REJECT assignments. Rejections will trigger reallocation alerts.
                    </p>
                  </div>

                  {/* Existing Allocations Tracker */}
                  {selectedRfp.bulkDetails?.allocations && selectedRfp.bulkDetails.allocations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Active Crew Allocations &amp; Worker Responses:</h4>
                      <div className="space-y-2">
                        {selectedRfp.bulkDetails.allocations.map((alloc) => {
                          const pObj = alloc.providerId;
                          const pName = pObj?.userId?.name || "Worker";
                          const pPhone = pObj?.userId?.phone || "";
                          const isRejected = alloc.status === "rejected";
                          const isAccepted = alloc.status === "accepted";
                          const hasPayoutProof = alloc.payoutStatus === "paid" || !!alloc.payoutProofUrl;

                          return (
                            <div
                              key={alloc._id}
                              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                                isRejected
                                  ? "border-rose-300 bg-rose-50/70"
                                  : hasPayoutProof
                                  ? "border-emerald-300 bg-emerald-50/70"
                                  : isAccepted
                                  ? "border-emerald-300 bg-emerald-50/50"
                                  : "border-outline-variant bg-surface-container-low"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-on-surface">{alloc.role}:</span>
                                  <span className="font-bold text-primary">{pName}</span>
                                  {pPhone && <span className="text-on-surface-variant">({pPhone})</span>}
                                </div>

                                {isRejected && (
                                  <p className="text-rose-700 font-semibold text-[11px] mt-0.5">
                                    ❌ Rejected by worker. Reason: {alloc.rejectionReason || "Unavailable"}
                                  </p>
                                )}

                                {hasPayoutProof && (
                                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] mt-1 flex-wrap">
                                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                    <span>Payout SS Recorded (₹{(alloc.payoutAmount || 2000).toLocaleString("en-IN")})</span>
                                    {alloc.payoutTxnRef && (
                                      <span className="text-on-surface-variant font-medium">&middot; Ref: {alloc.payoutTxnRef}</span>
                                    )}
                                    {alloc.payoutProofUrl && (
                                      <a
                                        href={alloc.payoutProofUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline text-[10.5px] font-semibold"
                                      >
                                        [View SS Proof]
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  hasPayoutProof
                                    ? "bg-emerald-200 text-emerald-950 border border-emerald-300 font-extrabold"
                                    : isAccepted
                                    ? "bg-emerald-200 text-emerald-900"
                                    : isRejected
                                    ? "bg-rose-200 text-rose-900"
                                    : "bg-amber-200 text-amber-900"
                                }`}>
                                  {hasPayoutProof
                                    ? "✓ Payout SS Recorded"
                                    : isAccepted
                                    ? "✓ Accepted"
                                    : isRejected
                                    ? "❌ Rejected"
                                    : "● Pending Response"}
                                </span>

                                {isRejected && (
                                  <button
                                    type="button"
                                    onClick={() => setReallocTarget({ allocationId: alloc._id, role: alloc.role, currentProviderId: pObj?._id })}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition cursor-pointer shadow-xs flex items-center gap-1"
                                  >
                                    <RotateCcw size={12} /> Reallocate Slot
                                  </button>
                                )}

                                {isAccepted && !hasPayoutProof && (
                                  <button
                                    type="button"
                                    onClick={() => setPayoutTarget({ allocationId: alloc._id, role: alloc.role, providerName: pName, amount: alloc.payoutAmount || 2000 })}
                                    className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-bold text-[11px] hover:opacity-90 transition cursor-pointer shadow-xs flex items-center gap-1"
                                  >
                                    <Upload size={12} /> Payout SS
                                  </button>
                                )}

                                {isAccepted && hasPayoutProof && (
                                  <button
                                    type="button"
                                    onClick={() => setPayoutTarget({ allocationId: alloc._id, role: alloc.role, providerName: pName, amount: alloc.payoutAmount || 2000 })}
                                    className="px-2 py-1 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-semibold text-[10.5px] transition cursor-pointer flex items-center gap-1"
                                  >
                                    <Eye size={12} className="text-primary" /> Update SS
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Allocate New Crew Form / Completion Banner */}
                  {generateRoleSlots(selectedRfp).length > 0 ? (
                    <form onSubmit={handleAllocateWorkersSubmit} className="space-y-4 pt-2 border-t border-outline-variant/60">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        Allocate Remaining Crew Slots from Society Directory:
                      </h4>

                      <div className="space-y-2.5">
                        {generateRoleSlots(selectedRfp).map((slot) => (
                          <div key={slot.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-outline-variant bg-surface">
                            <span className="text-xs font-bold text-on-surface w-36 shrink-0">
                              {slot.role} Slot #{slot.index + 1}:
                            </span>

                            <select
                              value={allocationSelections[slot.key] || ""}
                              onChange={(e) =>
                                setAllocationSelections((prev) => ({ ...prev, [slot.key]: e.target.value }))
                              }
                              className="flex-1 h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
                            >
                              <option value="">-- Select Verified Member from Cooperative --</option>
                              {coopProviders.map((p) => {
                                const pName = p.userId?.name || "Worker";
                                const pSkills = Array.isArray(p.skills) ? p.skills.join(", ") : "";
                                return (
                                  <option key={p._id} value={p._id}>
                                    {pName} ({pSkills || "Verified Worker"})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={allocating}
                          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <UserCheck size={14} />
                          <span>{allocating ? "Allocating Workers..." : "Dispatch Worker Allocations"}</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="pt-3 border-t border-outline-variant/60">
                      <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-bold text-sm text-emerald-900">All Required Crew Slots Fully Allocated</p>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              All worker slots for this bulk RFP have been dispatched. You can track worker responses above or reallocate if a worker rejects.
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 text-[11px] font-extrabold shrink-0 self-start sm:self-auto">
                          ✓ Fully Staffed
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── CHAT THREAD ── */
                <div className="flex flex-col min-h-[300px] max-h-[450px]">
                  <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
                    {(!selectedRfp.chat || selectedRfp.chat.length === 0) ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                        <MessageSquare size={32} className="text-primary/40 mb-2" />
                        <p className="text-xs font-bold">No messages yet</p>
                        <p className="text-[11px]">Send a message to coordinate crew deployment with the client.</p>
                      </div>
                    ) : (
                      selectedRfp.chat.map((msg, idx) => {
                        const isMe = msg.senderId?.toString() === myId || msg.senderRole === "admin";
                        return (
                          <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                              isMe ? "bg-primary text-on-primary rounded-br-xs shadow-2xs" : "bg-surface-container-low border border-outline-variant text-on-surface rounded-bl-xs"
                            }`}>
                              <p className="text-[10px] font-bold opacity-75 mb-0.5">{msg.senderName || (isMe ? "You (Cooperative)" : "Client")}</p>
                              <p>{msg.text || msg.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleSendChat} className="p-3 border-t border-outline-variant/60 bg-surface-container-low flex items-center gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message to the client..."
                      className="flex-1 h-10 px-3.5 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={sendingChat || !chatMessage.trim()}
                      className="h-10 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1 shadow-2xs hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Send size={13} />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Re-allocation Modal */}
      {reallocTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleReallocateSubmit} className="w-full max-w-md rounded-2xl bg-surface p-6 space-y-4 shadow-2xl border border-outline-variant">
            <h3 className="text-base font-bold text-on-surface">Reallocate {reallocTarget.role} Slot</h3>
            <p className="text-xs text-on-surface-variant">
              Select a new worker or re-assign the same worker for the rejected {reallocTarget.role} slot.
            </p>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">Select Replacement Worker:</label>
              <select
                value={newReallocProviderId}
                onChange={(e) => setNewReallocProviderId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
                required
              >
                <option value="">-- Choose Member --</option>
                {coopProviders.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.userId?.name || "Worker"} ({Array.isArray(p.skills) ? p.skills.join(", ") : "Worker"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReallocTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reallocating || !newReallocProviderId}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
              >
                {reallocating ? "Reallocating..." : "Confirm Reallocation"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Worker Payout SS Proof Upload Modal */}
      {payoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleWorkerPayoutProofSubmit} className="w-full max-w-md rounded-2xl bg-surface p-6 space-y-4 shadow-2xl border border-outline-variant">
            <h3 className="text-base font-bold text-on-surface">Record Payout SS Proof for {payoutTarget.providerName}</h3>
            <p className="text-xs text-on-surface-variant">
              Upload payment screenshot proof (SS) of worker payout for {payoutTarget.role}.
            </p>

            <FileUpload
              label="Upload Payout Screenshot Proof (SS)"
              onSelect={(url) => setPayoutSsUrl(url)}
              multiple={false}
              folder="sahakargig/payouts/worker"
            />

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">Disbursed Amount (₹)</label>
              <input
                type="number"
                value={payoutAmount || payoutTarget.amount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-bold text-on-surface outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">Bank Transaction Ref / UTR (Optional)</label>
              <input
                type="text"
                value={payoutTxnRef}
                onChange={(e) => setPayoutTxnRef(e.target.value)}
                placeholder="e.g. UTR-BANK-8812491"
                className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayoutTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingPayout || !payoutSsUrl}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
              >
                {uploadingPayout ? "Recording Payout..." : "Record Worker Payout Proof"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
