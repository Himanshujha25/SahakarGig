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
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-24 lg:pb-10 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900"
              style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
              Institutional Bulk RFPs & Crew Orders
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#e8edff] text-[#00288e] text-xs font-bold border border-[#00288e]/20">
              {rfps.length} Orders
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review requests, chat with clients, send revised quotations, and mobilize your cooperative crews.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === f.key
                  ? "bg-[#00288e] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RFP Cards ── */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 h-36" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto text-[#00288e]">
            <Users size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No RFPs in This Category</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Institutional requests from verified households will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
                className={`rounded-2xl border transition-all p-5 sm:p-6 cursor-pointer hover:shadow-md hover:border-[#00288e]/50 ${
                  isPending
                    ? "border-[#00288e]/40 bg-gradient-to-r from-blue-50/60 via-white to-white shadow-xs"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* Top Row */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#00288e] text-white text-[11px] font-bold flex items-center gap-1">
                        <Users size={11} /> {memberCount} Workers Requested
                      </span>
                      {isPending ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                          ● Awaiting Mobilization
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          ✓ Crew Mobilized & Locked
                        </span>
                      )}
                      {chatCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#00288e] text-[10.5px] font-bold border border-[#00288e]/20 flex items-center gap-1">
                          <MessageSquare size={11} /> {chatCount} messages
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-[17px] font-bold text-slate-900 leading-snug">{rfp.service}</h3>
                    <p className="text-xs text-slate-500">
                      Client: <span className="font-bold text-slate-800">{rfp.householdId?.name || "Household"}</span>
                      {rfp.householdId?.phone && <span> · {rfp.householdId.phone}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right mr-1">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Escrow Budget</p>
                      <p className="text-xl font-black text-[#00288e]">₹{(rfp.price || 0).toLocaleString("en-IN")}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openModal(rfp); }}
                      className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <MessageSquare size={13} className="text-[#00288e]" />
                      Chat / Quote
                    </button>

                    {isPending && (
                      <button
                        type="button"
                        disabled={actingId === rfp._id}
                        onClick={(e) => handleAccept(rfp._id, e)}
                        className="h-9 px-3.5 rounded-xl bg-[#00288e] hover:bg-[#173bab] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60"
                      >
                        <CheckCircle2 size={13} />
                        {actingId === rfp._id ? "Working..." : "Accept & Mobilize"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Client / Employer</p>
                    <p className="font-bold text-slate-900">{rfp.householdId?.name || "Verified Household"}</p>
                    <p className="text-slate-500 truncate">{rfp.householdId?.email || "Direct App Booking"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Statutory Escrow Split</p>
                    <p className="text-slate-700"><span className="font-bold text-slate-900">₹{workerEscrow.toLocaleString("en-IN")}</span> directly to crew (85%)</p>
                    <p className="text-[#00288e] font-bold">+₹{coopFee.toLocaleString("en-IN")} Society Welfare Pool (10%)</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <p className="text-slate-400 font-semibold uppercase text-[10px]">Deployment Schedule</p>
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      <Calendar size={12} className="text-[#00288e]" />
                      {rfp.scheduledTime
                        ? new Date(rfp.scheduledTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                        : "Not specified"}
                    </p>
                    <p className="text-slate-500">Scheduled Start</p>
                  </div>
                </div>

                {rfp.notes && (
                  <div className="mt-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700 flex items-start gap-2">
                    <FileText size={14} className="text-[#00288e] shrink-0 mt-0.5" />
                    <span><span className="font-bold text-[#00288e]">Scope Note: </span>{rfp.notes}</span>
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setSelectedRfp(null)}
        >
          <div
            className="w-full sm:max-w-5xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "92vh", height: "92vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-gradient-to-r from-[#e8edff]/60 via-slate-50 to-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#00288e] text-white text-[11px] font-bold flex items-center gap-1 shrink-0">
                    <Users size={11} /> {selectedRfp.groupBooking?.memberCount || 2} Workers
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">
                    RFP #{selectedRfp._id.slice(-8).toUpperCase()}
                  </span>
                  {selectedRfp.status === "requested" && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10.5px] font-bold border border-amber-200 shrink-0">Pending Action</span>
                  )}
                </div>
                <h2 className="text-[15px] font-bold text-slate-900 leading-tight truncate">{selectedRfp.service}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client: <span className="font-semibold text-slate-800">{selectedRfp.householdId?.name}</span>
                  {selectedRfp.householdId?.phone && ` · ${selectedRfp.householdId.phone}`}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Current Quote</p>
                  <p className="text-xl font-black text-[#00288e]">₹{(selectedRfp.price || 0).toLocaleString("en-IN")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRfp(null)}
                  className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body: Left Panel + Right Chat */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 min-h-0 overflow-hidden">

              {/* Left Panel – Scope + Quotation Tool (2 cols) */}
              <div className="md:col-span-2 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 overflow-y-auto no-scrollbar">
                <div className="p-4 space-y-4">

                  {/* Scope Details */}
                  <div>
                    <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Scope of Work & Logistics</p>
                    <div className="rounded-xl bg-white border border-slate-200 divide-y divide-slate-100 text-xs">
                      <div className="p-3 space-y-0.5">
                        <p className="text-[10px] text-slate-400 font-semibold">Project Site</p>
                        <p className="font-bold text-slate-800">{selectedRfp.locationText || "Not specified"}</p>
                      </div>
                      <div className="p-3 space-y-0.5">
                        <p className="text-[10px] text-slate-400 font-semibold">Deployment Date</p>
                        <p className="font-bold text-slate-800">
                          {selectedRfp.scheduledTime
                            ? new Date(selectedRfp.scheduledTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                            : "Not specified"}
                        </p>
                      </div>
                      <div className="p-3 space-y-0.5">
                        <p className="text-[10px] text-slate-400 font-semibold">Workers Requested</p>
                        <p className="font-bold text-slate-800">{selectedRfp.groupBooking?.memberCount || 2} crew members</p>
                      </div>
                      {selectedRfp.notes && (
                        <div className="p-3 space-y-0.5">
                          <p className="text-[10px] text-slate-400 font-semibold">Client Instructions</p>
                          <p className="text-slate-700 leading-relaxed italic text-[11px]">{selectedRfp.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quotation Revision Tool */}
                  <div>
                    <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quotation & Pricing</p>
                    <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold">Current Escrow Quote</p>
                          <p className="text-lg font-black text-[#00288e]">₹{(selectedRfp.price || 0).toLocaleString("en-IN")}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowQuoteForm((v) => !v)}
                          className="text-[11px] font-bold text-[#00288e] flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Edit3 size={12} /> {showQuoteForm ? "Cancel" : "Revise Quote"}
                        </button>
                      </div>

                      {showQuoteForm && (
                        <form onSubmit={handleSendQuotation} className="space-y-2 pt-1 border-t border-slate-100">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Revised Total (₹)</label>
                            <input
                              type="number"
                              value={revisedPrice}
                              onChange={(e) => setRevisedPrice(e.target.value)}
                              className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-[#00288e]"
                              placeholder="e.g. 5500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Proposal Note</label>
                            <textarea
                              rows={2}
                              value={revisedNotes}
                              onChange={(e) => setRevisedNotes(e.target.value)}
                              placeholder="e.g. Includes PPE and transport for 3 days"
                              className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#00288e] resize-none"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={submittingQuote}
                            className="w-full h-8 rounded-lg bg-[#00288e] hover:bg-[#173bab] text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-60"
                          >
                            <Send size={11} />
                            {submittingQuote ? "Sending..." : "Transmit Revised Quotation to Client"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Accept CTA */}
                  {selectedRfp.status === "requested" && (
                    <button
                      type="button"
                      disabled={actingId === selectedRfp._id}
                      onClick={(e) => handleAccept(selectedRfp._id, e)}
                      className="w-full h-10 rounded-xl bg-[#00288e] hover:bg-[#173bab] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60"
                    >
                      <CheckCircle2 size={14} />
                      {actingId === selectedRfp._id ? "Mobilizing Crew..." : "Accept & Mobilize Member Crew"}
                    </button>
                  )}

                  {selectedRfp.status !== "requested" && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span className="font-semibold text-emerald-800">Crew Mobilized — Escrow Locked</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel – Live Chat Thread (3 cols) */}
              <div className="md:col-span-3 flex flex-col min-h-0 bg-white">

                {/* Chat Header */}
                <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-[#00288e]" />
                    <p className="text-[12px] font-bold text-slate-900 uppercase tracking-wider">Direct Client Negotiation Desk</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10.5px] text-slate-400 font-semibold">Real-Time WebSocket Feed</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                  {(selectedRfp.chat || []).length === 0 ? (
                    <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                      <MessageSquare size={30} className="opacity-30" />
                      <p className="text-sm font-semibold">No messages yet</p>
                      <p className="text-xs max-w-xs">
                        Send a message to clarify scope, negotiate rates, or ask questions before mobilizing.
                      </p>
                    </div>
                  ) : (
                    (selectedRfp.chat || []).map((c, i) => {
                      const senderId = (c.sender?._id ?? c.sender)?.toString?.() ?? "";
                      const isMe = senderId === myId;
                      return (
                        <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? "bg-[#00288e] text-white rounded-br-sm"
                                : "bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-sm"
                            }`}
                          >
                            <p className={`text-[10px] font-bold mb-0.5 ${isMe ? "text-blue-200" : "text-[#00288e]"}`}>
                              {isMe ? "You (Cooperative Admin)" : selectedRfp.householdId?.name || "Client"}
                            </p>
                            <p className="whitespace-pre-wrap">{c.message}</p>
                            <p className={`text-[9.5px] mt-1 ${isMe ? "text-blue-200/70" : "text-slate-400"}`}>
                              {c.at ? new Date(c.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Templates */}
                <div className="shrink-0 px-4 pb-2 flex gap-1.5 flex-wrap">
                  {[
                    "Please share site address",
                    "Can we schedule a site visit?",
                    "Revised quote sent above",
                    "Crew ready for deployment",
                  ].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setChatMessage(t)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10.5px] font-semibold text-slate-600 hover:border-[#00288e]/40 hover:text-[#00288e] hover:bg-blue-50 transition cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="shrink-0 px-4 pb-4">
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type message, questionnaire, terms, or scope clarification..."
                      className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 outline-none focus:border-[#00288e] focus:bg-white transition"
                    />
                    <button
                      type="submit"
                      disabled={sendingChat || !chatMessage.trim()}
                      className="w-10 h-10 rounded-xl bg-[#00288e] hover:bg-[#173bab] text-white flex items-center justify-center shrink-0 shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {sendingChat ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
