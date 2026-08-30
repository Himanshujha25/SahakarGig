import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  Calendar,
  CheckCircle2,
  FileText,
  MessageSquare,
  Send,
  X,
  Edit3,
  ArrowRight,
} from "lucide-react";

export default function BulkRFPRequests() {
  const { user } = useAuth();
  const [rfps, setRfps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  // Modal
  const [selectedRfp, setSelectedRfp] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [revisedPrice, setRevisedPrice] = useState("");
  const [revisedNotes, setRevisedNotes] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const chatBottomRef = useRef(null);

  const loadRfps = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/rfp");
      const list = data || [];
      setRfps(list);
      // refresh selected modal too
      setSelectedRfp((prev) =>
        prev ? list.find((x) => x._id === prev._id) || prev : null
      );
    } catch {
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
      socket.off("booking:chat");
    };
  }, [loadRfps]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedRfp?.chat?.length]);

  const openModal = (rfp) => {
    setSelectedRfp(rfp);
    setRevisedPrice(rfp.price ?? "");
    setRevisedNotes("");
    setShowQuoteForm(false);
    setChatMessage("");
  };

  const handleAccept = async (bookingId, e) => {
    e?.stopPropagation();
    setActingId(bookingId);
    try {
      await api.patch(`/admin/rfp/${bookingId}/accept`);
      loadRfps();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to mobilize crew.");
    } finally {
      setActingId(null);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedRfp) return;
    setSendingChat(true);
    try {
      await api.post(`/bookings/${selectedRfp._id}/chat`, { message: chatMessage });
      setChatMessage("");
    } catch (err) {
      alert(err?.response?.data?.message || "Could not send message.");
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
      setShowQuoteForm(false);
      loadRfps();
    } catch (err) {
      alert(err?.response?.data?.message || "Could not update quotation.");
    } finally {
      setSubmittingQuote(false);
    }
  };

  const filtered = rfps.filter((r) => {
    if (activeFilter === "requested") return r.status === "requested";
    if (activeFilter === "accepted") return r.status === "accepted" || r.status === "in-progress";
    if (activeFilter === "completed") return r.status === "completed";
    return true;
  });

  const myId = user?.id?.toString() || user?._id?.toString();

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface"
              style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
              Institutional Bulk RFPs &amp; Crew Orders
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              {rfps.length} Orders
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Review requests, chat with clients, send revised quotations, and mobilize your cooperative crews.
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
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface p-5 h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface p-8 sm:p-12 text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Users size={22} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-on-surface">No RFPs in This Category</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            Institutional requests from verified households will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filtered.map((rfp) => {
            const isPending = rfp.status === "requested";
            const memberCount = rfp.groupBooking?.memberCount || 2;
            const workerEscrow = Math.round((rfp.price || 0) * 0.85);
            const coopFee = Math.round((rfp.price || 0) * 0.10);
            const chatCount = (rfp.chat || []).length;

            return (
              <div
                key={rfp._id}
                onClick={() => openModal(rfp)}
                className={`rounded-2xl border transition-all p-4 sm:p-5 cursor-pointer hover:shadow-sm ${
                  isPending
                    ? "border-primary/40 bg-surface shadow-2xs"
                    : "border-outline-variant/60 bg-surface"
                }`}
              >
                {/* Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-outline-variant/40">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary text-[11px] font-bold flex items-center gap-1">
                        <Users size={11} /> {memberCount} Workers Requested
                      </span>
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20">
                          ● Awaiting Mobilization
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                          ✓ Crew Mobilized &amp; Locked
                        </span>
                      )}
                      {chatCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10.5px] font-bold border border-primary/20 flex items-center gap-1">
                          <MessageSquare size={11} /> {chatCount} msgs
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-on-surface leading-snug truncate">{rfp.service}</h3>
                    <p className="text-xs text-on-surface-variant truncate">
                      Client: <span className="font-bold text-on-surface">{rfp.householdId?.name || "Household"}</span>
                      {rfp.householdId?.phone && <span> &middot; {rfp.householdId.phone}</span>}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/40">
                    <div className="text-left sm:text-right mr-1">
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Escrow Budget</p>
                      <p className="text-lg sm:text-xl font-black text-primary">₹{(rfp.price || 0).toLocaleString("en-IN")}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(rfp); }}
                        className="h-8 sm:h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      >
                        <MessageSquare size={13} className="text-primary" />
                        <span>Chat / Quote</span>
                      </button>

                      {isPending && (
                        <button
                          type="button"
                          disabled={actingId === rfp._id}
                          onClick={(e) => handleAccept(rfp._id, e)}
                          className="h-8 sm:h-9 px-3 rounded-xl bg-primary hover:opacity-90 text-on-primary font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer disabled:opacity-60"
                        >
                          <CheckCircle2 size={13} />
                          <span>{actingId === rfp._id ? "Working..." : "Accept"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Row: Compact and Clean */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 space-y-0.5">
                    <p className="text-on-surface-variant font-bold uppercase text-[9.5px]">Client / Employer</p>
                    <p className="font-bold text-on-surface truncate">{rfp.householdId?.name || "Verified Household"}</p>
                    <p className="text-on-surface-variant text-[11px] truncate">{rfp.householdId?.email || "Direct App Booking"}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 space-y-0.5">
                    <p className="text-on-surface-variant font-bold uppercase text-[9.5px]">Statutory Escrow Split</p>
                    <p className="text-on-surface text-[11.5px] truncate"><span className="font-bold text-primary">₹{workerEscrow.toLocaleString("en-IN")}</span> crew (85%)</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] truncate">+₹{coopFee.toLocaleString("en-IN")} Welfare Pool (10%)</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 space-y-0.5">
                    <p className="text-on-surface-variant font-bold uppercase text-[9.5px]">Deployment Schedule</p>
                    <p className="font-bold text-on-surface flex items-center gap-1 truncate">
                      <Calendar size={12} className="text-primary shrink-0" />
                      {rfp.scheduledTime
                        ? new Date(rfp.scheduledTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                        : "Not specified"}
                    </p>
                    <p className="text-on-surface-variant text-[11px]">Scheduled Start</p>
                  </div>
                </div>

                {rfp.notes && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-on-surface flex items-start gap-2">
                    <FileText size={13} className="text-primary shrink-0 mt-0.5" />
                    <span className="truncate"><span className="font-bold text-primary">Scope: </span>{rfp.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          CHAT + QUOTATION NEGOTIATION MODAL
          ══════════════════════════════════════════════════════ */}
      {selectedRfp && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedRfp(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-outline-variant bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95"
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuoteForm((v) => !v)}
                  className="px-2.5 py-1.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-xs font-bold text-primary flex items-center gap-1 transition cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>{showQuoteForm ? "Back to Chat" : "Revise Quote"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRfp(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Revised Quote Form Panel */}
            {showQuoteForm ? (
              <form onSubmit={handleSendQuotation} className="p-5 space-y-4 overflow-y-auto">
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-on-surface">
                  <p className="font-bold text-primary">Current Locked Escrow Price: ₹{(selectedRfp.price || 0).toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Submitting a revised quotation will update the proposal for the client.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface">New Revised Total Escrow (₹)</label>
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
                  <label className="text-xs font-bold text-on-surface">Quote Notes / Justification</label>
                  <textarea
                    rows={3}
                    value={revisedNotes}
                    onChange={(e) => setRevisedNotes(e.target.value)}
                    className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-primary"
                    placeholder="Provide details on crew composition, material cost, or overtime rates..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuoteForm(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingQuote}
                    className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                  >
                    {submittingQuote ? "Submitting..." : "Send Quotation"}
                  </button>
                </div>
              </form>
            ) : (
              /* Chat Thread */
              <div className="flex-1 flex flex-col min-h-[300px] max-h-[450px] overflow-hidden">
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
                        <div
                          key={idx}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                              isMe
                                ? "bg-primary text-on-primary rounded-br-xs shadow-2xs"
                                : "bg-surface-container-low border border-outline-variant text-on-surface rounded-bl-xs"
                            }`}
                          >
                            <p className="text-[10px] font-bold opacity-75 mb-0.5">{msg.senderName || (isMe ? "You (Cooperative)" : "Client")}</p>
                            <p>{msg.text || msg.message}</p>
                          </div>
                          <span className="text-[9.5px] text-on-surface-variant/70 mt-0.5 px-1">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Bar */}
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
      )}
    </div>
  );
}
