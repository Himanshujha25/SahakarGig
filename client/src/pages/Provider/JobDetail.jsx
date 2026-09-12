import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { toast } from "../../lib/toast";
import { SERVER_URL } from "../../lib/config";
import {
  ArrowLeft, Phone, MapPin, Navigation, AlertCircle,
  Send, Zap, User, Key, Check, ExternalLink, MessageSquare,
  Star, Clock, AlertTriangle, ShieldCheck, Upload, X,
  Camera, FileText, Ban, CheckCircle2, ChevronRight,
  IndianRupee, Sparkles, Building2
} from "lucide-react";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState("");
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [providerUserId, setProviderUserId] = useState(null);

  // Start Work Modal State (Before Photo + Diagnosis)
  const [showStartModal, setShowStartModal] = useState(false);
  const [beforePhotoPreview, setBeforePhotoPreview] = useState(null);
  const [beforeDescription, setBeforeDescription] = useState("");
  const [startWorkError, setStartWorkError] = useState(null);
  const beforeFileInputRef = useRef(null);

  // Complete Work Modal State (After Photo + Notes + OTP)
  const [afterPhotoPreview, setAfterPhotoPreview] = useState(null);
  const [afterDescription, setAfterDescription] = useState("");
  const afterFileInputRef = useRef(null);

  // Discard / Escalation Modal State
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [discardCategory, setDiscardCategory] = useState("customer_unreachable");
  const [discardReason, setDiscardReason] = useState("");
  const [evidencePreview, setEvidencePreview] = useState(null);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/bookings/${id}`);
      setBooking(data);
      setMessages(data.chat || []);
      if (!providerUserId) {
        api.get("/providers/me").then((r) => setProviderUserId(r.data.userId?._id ?? r.data.userId)).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load booking details:", err);
    } finally {
      setLoading(false);
    }
  }, [id, providerUserId]);

  useEffect(() => {
    load();
    socket.on("booking:updated", (b) => {
      const incoming = b?.booking || b;
      if (incoming?._id?.toString() === id || incoming?._id === id) {
        setBooking(incoming);
        setMessages(incoming.chat || []);
      }
    });
    socket.on("booking:chat", ({ bookingId, message }) => {
      if (bookingId?.toString() === id) setMessages((prev) => [...prev, message]);
    });
    return () => {
      socket.off("booking:updated");
      socket.off("booking:chat");
    };
  }, [load, id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const isActive = booking && ["accepted", "in-progress"].includes(booking.status);
  useEffect(() => {
    if (!isActive || !navigator.geolocation) return;
    if (!socket.connected) socket.connect();
    let watchId = null;
    let lastPos = null;

    const emitPos = () => {
      if (lastPos && socket.connected) {
        socket.emit("provider:location_update", {
          bookingId: id,
          lat: lastPos.coords.latitude,
          lng: lastPos.coords.longitude,
        });
      }
    };

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => { lastPos = pos; emitPos(); },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    } catch {}

    const tick = setInterval(emitPos, 8000);
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(tick);
    };
  }, [id, isActive]);

  async function accept() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/accept`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function handleBeforePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStartWorkError("Image size must be under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBeforePhotoPreview(reader.result);
        setStartWorkError(null);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleAfterPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setOtpError("Image size must be under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterPhotoPreview(reader.result);
        setOtpError(null);
      };
      reader.readAsDataURL(file);
    }
  }

  async function submitStartWork(e) {
    if (e) e.preventDefault();
    if (!beforePhotoPreview) {
      setStartWorkError("Please take or upload an on-site photo of the issue before starting.");
      return;
    }
    if (!beforeDescription.trim()) {
      setStartWorkError("Please enter a short description of the problem or site condition.");
      return;
    }

    setBusy(true);
    setStartWorkError(null);
    try {
      await api.patch(`/bookings/${id}/status`, {
        status: "in-progress",
        beforePhoto: beforePhotoPreview,
        beforeDescription: beforeDescription.trim(),
      });
      setShowStartModal(false);
      await load();
      toast.success("Work started successfully! A 4-digit verification OTP has been generated on the customer's device.");
    } catch (err) {
      setStartWorkError(err?.response?.data?.message || "Failed to start work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtpCompletion(e) {
    if (e) e.preventDefault();
    if (!afterPhotoPreview) {
      setOtpError("Please take or upload a photo showing the completed work / solved problem.");
      return;
    }
    if (!afterDescription.trim()) {
      setOtpError("Please write a brief summary of the resolution work done.");
      return;
    }
    if (!otpCode || otpCode.length < 4) {
      setOtpError("Please enter the complete 4-digit verification code provided by the customer.");
      return;
    }

    setBusy(true);
    setOtpError(null);
    try {
      await api.patch(`/bookings/${id}/status`, {
        status: "completed",
        afterPhoto: afterPhotoPreview,
        afterDescription: afterDescription.trim(),
        otp: otpCode.trim(),
      });
      setShowOtpModal(false);
      setOtpCode("");
      await load();
      toast.success("Job verified & marked complete! Payout released to your wallet.");
    } catch (err) {
      setOtpError(err?.response?.data?.message || "Invalid completion OTP code. Please verify with customer.");
    } finally {
      setBusy(false);
    }
  }

  function handleEvidenceUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleConfirmDiscard(e) {
    e.preventDefault();
    if (!discardReason.trim()) {
      toast.warning("Please provide a reason for discarding this order.");
      return;
    }

    setBusy(true);
    try {
      await api.patch(`/bookings/${id}/cancel`, {
        reason: discardReason,
        reasonCategory: discardCategory,
        photoEvidence: evidencePreview ? "uploaded_site_evidence.jpg" : undefined,
      });
      setShowDiscardModal(false);
      await load();
      toast.success("Order discarded successfully with justification logged.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to discard order.");
    } finally {
      setBusy(false);
    }
  }

  async function sendChat(textOverride) {
    const msg = (textOverride || chat).trim();
    if (!msg) return;
    try {
      await api.post(`/bookings/${id}/chat`, { message: msg });
      if (!textOverride) setChat("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-20 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-96 bg-slate-100 rounded-3xl" />
          <div className="h-96 bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="w-full max-w-md mx-auto my-16 p-8 text-center rounded-2xl border border-slate-200 bg-white space-y-4 shadow-sm">
        <AlertCircle size={40} className="mx-auto text-slate-400" />
        <h2 className="text-base font-bold text-slate-900">Job Record Not Found</h2>
        <p className="text-xs text-slate-500">The requested job reference could not be located in the ledger.</p>
        <button
          onClick={() => navigate("/provider")}
          className="px-5 py-2.5 rounded-xl bg-[#00288e] text-white font-bold text-xs hover:bg-[#001f70] transition-colors cursor-pointer shadow-md"
        >
          Back to Job Queue
        </button>
      </div>
    );
  }

  const b = booking;
  const isEmergency = b.isEmergency || false;
  const grossPrice = Number(b.price) || 0;
  const netPay = Math.round(grossPrice * 0.85);
  const coopCut = Math.round(grossPrice * 0.10);
  const fedCut = Math.round(grossPrice * 0.05);

  // 30-Min Inactivity Escalation check
  const lastUpdate = new Date(b.updatedAt || b.createdAt).getTime();
  const elapsedMinutes = Math.round((Date.now() - lastUpdate) / (1000 * 60));
  const isEscalated = b.status === "accepted" && elapsedMinutes > 30;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-5 pb-16 space-y-5 text-slate-900 font-sans">
      {/* ── TOP BREADCRUMB & STATUS BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/provider")}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs"
            title="Back to Job Queue"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                Gig Command Center
              </h1>
              <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                #{b._id?.substring(0, 8).toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500">Live order navigation, status controls &amp; customer communication</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isEmergency && (
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1">
              <Zap size={12} className="fill-rose-700" /> Emergency Priority
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 capitalize ${
            b.status === "completed" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
            b.status === "cancelled" ? "bg-slate-100 text-slate-600 border-slate-200" :
            b.status === "in-progress" ? "bg-purple-50 text-purple-700 border-purple-200 animate-pulse" :
            "bg-blue-50 text-[#00288e] border-blue-200"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              b.status === "completed" ? "bg-emerald-600" :
              b.status === "in-progress" ? "bg-purple-600 animate-ping" :
              b.status === "cancelled" ? "bg-slate-400" :
              "bg-[#00288e]"
            }`} />
            {b.status === "accepted" ? "En Route · Confirmed" : b.status === "in-progress" ? "In Service · On Site" : b.status}
          </span>
        </div>
      </div>

      {/* ── 30-MINUTE INACTIVITY ESCALATION ALERT BANNER ── */}
      {isEscalated && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center text-amber-900 shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900">30-Minute Inactivity Escalation Alert</p>
              <p className="text-[11px] font-medium text-slate-600">
                Order accepted {elapsedMinutes} mins ago without on-site progress. Please start travel or discard order.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDiscardModal(true)}
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs cursor-pointer transition-all shadow-2xs flex items-center gap-1"
            >
              <Ban size={12} />
              <span>Discard Order</span>
            </button>
            <button
              onClick={() => { setStartWorkError(null); setShowStartModal(true); }}
              className="px-3.5 py-1.5 rounded-xl bg-[#00288e] text-white font-bold text-xs hover:bg-[#001f70] transition-all cursor-pointer shadow-2xs"
            >
              Start Work
            </button>
          </div>
        </div>
      )}

      {/* ── 2-COLUMN PERFECTLY BALANCED WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        
        {/* ── LEFT COLUMN: JOB COMMAND & ORDER OVERVIEW ── */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* Customer & Earnings Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#00288e] flex items-center justify-center font-black text-lg shrink-0 overflow-hidden">
                  {(() => {
                    const av = b.householdId?.avatarUrl || b.householdId?.avatar || b.householdId?.profileImage || b.householdId?.image;
                    const src = av && !av.startsWith("http") && !av.startsWith("data:") ? `${SERVER_URL}${av}` : av;
                    return (
                      <>
                        {src ? (
                          <img
                            src={src}
                            alt={b.householdId?.name || "Customer"}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : null}
                        <span className={src ? "absolute inset-0 flex items-center justify-center -z-10" : ""}>
                          {(b.householdId?.name || "C").charAt(0).toUpperCase()}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{b.householdId?.name || "Customer Household"}</h2>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#00288e] mt-0.5">
                    {b.targetCategory || b.service || "Household General Repair"}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Take-Home Pay</span>
                <p className="text-xl font-black text-emerald-700">₹{netPay}</p>
                <p className="text-[10px] text-slate-400 font-medium">(₹{grossPrice} gross)</p>
              </div>
            </div>

            {/* Stepper Progress */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Workflow Progress</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <div className={`py-2 px-1 rounded-xl border ${b.status !== "requested" ? "bg-blue-50 border-blue-200 text-[#00288e]" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
                  1. Accepted ✓
                </div>
                <div className={`py-2 px-1 rounded-xl border ${b.startWorkProof?.photo ? "bg-purple-50 border-purple-200 text-purple-700 font-bold" : ["in-progress", "completed"].includes(b.status) ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                  2. Before Photo {b.startWorkProof?.photo ? "✓" : "📷"}
                </div>
                <div className={`py-2 px-1 rounded-xl border ${b.status === "completed" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                  3. Solved &amp; OTP {b.status === "completed" ? "✓" : "🔑"}
                </div>
              </div>
            </div>

            {/* Contact & Location Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Phone</span>
                  <p className="font-mono font-bold text-slate-900 text-xs mt-0.5">{b.householdId?.phone || "+91 98110 00004"}</p>
                </div>
                <a
                  href={`tel:${b.householdId?.phone || "9811000004"}`}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Phone size={12} />
                  <span>Call Customer</span>
                </a>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Service Location</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5 truncate">{b.locationText || b.address || "Ghaziabad, Uttar Pradesh"}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.locationText || b.address || "Ghaziabad")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Navigation size={12} />
                  <span>Open Maps</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* ── WORK VERIFICATION & PROOF SECTION ── */}
            {(b.startWorkProof?.photo || b.completionProof?.photo || b.status === "in-progress") && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Camera size={14} className="text-[#00288e]" />
                    <span>Work Proofs &amp; Quality Audit</span>
                  </h4>
                  {b.otpVerified && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 border border-emerald-300">
                      <ShieldCheck size={11} /> OTP Verified
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Before Work Proof */}
                  {b.startWorkProof?.photo ? (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          1. Before Work Photo ✓
                        </span>
                        <span className="text-slate-400">
                          {new Date(b.startWorkProof.startedAt || b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="h-28 rounded-lg overflow-hidden border border-slate-100 bg-slate-900 flex items-center justify-center">
                        <img src={b.startWorkProof.photo} alt="Before Work" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[11px] text-slate-600 italic line-clamp-2">
                        "{b.startWorkProof.description || "Initial condition recorded"}"
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={() => { setStartWorkError(null); setShowStartModal(true); }}
                      className="p-3.5 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-1.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center font-bold">
                        <Camera size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-purple-900">1. Upload Before-Work Photo</p>
                        <p className="text-[10.5px] text-purple-700">Tap here to record site condition before repairing</p>
                      </div>
                    </div>
                  )}

                  {/* After Work Proof */}
                  {b.completionProof?.photo ? (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          2. Solved Problem Photo ✓
                        </span>
                        <span className="text-slate-400">
                          {new Date(b.completionProof.completedAt || b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="h-28 rounded-lg overflow-hidden border border-slate-100 bg-slate-900 flex items-center justify-center">
                        <img src={b.completionProof.photo} alt="Completed Work" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[11px] text-slate-600 italic line-clamp-2">
                        "{b.completionProof.description || "Problem solved and verified"}"
                      </p>
                    </div>
                  ) : b.status === "in-progress" ? (
                    <div className="p-3 rounded-xl bg-purple-50/70 border border-dashed border-purple-200 flex flex-col items-center justify-center text-center space-y-1.5">
                      <Key size={18} className="text-purple-600 animate-pulse" />
                      <p className="text-xs font-bold text-purple-900">OTP Generated on Customer Screen</p>
                      <p className="text-[10.5px] text-purple-700">
                        Ask customer for their 4-digit code after completing repair.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Escrow Fee Summary */}
            <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-100 text-[11px] flex items-center justify-between text-slate-500 font-medium">
              <span>Nodal Escrow Protected: ₹{grossPrice}</span>
              <span>Society Reserve: ₹{coopCut} (10%)</span>
              <span>Fed Tech: ₹{fedCut} (5%)</span>
            </div>
          </div>

          {/* Bottom Primary Controls */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            {b.status === "requested" && (
              <div className="space-y-2">
                <button
                  disabled={busy}
                  onClick={accept}
                  className="w-full py-3 rounded-2xl bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check size={15} strokeWidth={2.5} />
                  <span>Accept Job Request (₹{netPay})</span>
                </button>
                <button
                  disabled={busy}
                  onClick={() => setShowDiscardModal(true)}
                  className="w-full py-2 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Decline / Discard Job
                </button>
              </div>
            )}

            {b.status === "accepted" && (
              <div className="space-y-2">
                <button
                  disabled={busy}
                  onClick={() => { setStartWorkError(null); setShowStartModal(true); }}
                  className="w-full py-3.5 rounded-2xl bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Camera size={16} strokeWidth={2.5} />
                  <span>Upload Before-Photo &amp; Start Work</span>
                </button>

                <button
                  disabled={busy}
                  onClick={() => setShowDiscardModal(true)}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-600 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Ban size={13} />
                  <span>Discard / Escalate Order with Reason</span>
                </button>
              </div>
            )}

            {b.status === "in-progress" && (
              <div className="space-y-2">
                <button
                  disabled={busy}
                  onClick={() => { setOtpError(null); setShowOtpModal(true); }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Key size={16} strokeWidth={2.5} />
                  <span>Step 2: Upload Solved Photo &amp; Enter Customer OTP</span>
                </button>

                {!b.startWorkProof?.photo && (
                  <button
                    disabled={busy}
                    onClick={() => { setStartWorkError(null); setShowStartModal(true); }}
                    className="w-full py-2.5 rounded-2xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Camera size={14} className="text-purple-700" />
                    <span>Step 1: Upload "Before Work" Photo (Required for Audit)</span>
                  </button>
                )}

                <button
                  disabled={busy}
                  onClick={() => setShowDiscardModal(true)}
                  className="w-full py-2 rounded-2xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-all cursor-pointer text-center"
                >
                  Report Severe On-Site Issue / Dispute
                </button>
              </div>
            )}

            {b.status === "completed" && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-0.5">
                <p className="text-xs font-bold text-emerald-900">Job Settled &amp; Verified Successfully ✓</p>
                <p className="text-[11px] text-slate-500">₹{netPay} has been credited to your withdrawable wallet balance.</p>
              </div>
            )}

            {b.status === "cancelled" && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-0.5">
                <p className="font-bold">Order Cancelled / Discarded</p>
                <p className="text-[11px] text-slate-600">{b.cancellationReason || "Discharged with justification."}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: DIRECT HOUSEHOLD CHAT (SAME HEIGHT) ── */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare size={16} className="text-[#00288e]" />
                <span>Direct Household Messaging</span>
              </h3>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                Live Socket.io
              </span>
            </div>

            {/* Quick Text Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "On my way 🚗",
                "Arrived at doorstep 🚪",
                "Work started 🛠️",
                "Need 10 mins extra ⏳"
              ].map((txt) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => sendChat(txt)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {txt}
                </button>
              ))}
            </div>

            {/* Message History Feed */}
            <div className="flex-1 min-h-[350px] overflow-y-auto space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 space-y-1">
                  <MessageSquare size={24} className="text-slate-300" />
                  <p className="text-xs">No messages yet.</p>
                  <p className="text-[11px]">Send a quick arrival update to the household.</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const senderId = m.sender?._id?.toString() || m.sender?.toString() || "";
                  const isYou = providerUserId ? senderId === providerUserId?.toString() : false;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isYou ? "items-end" : "items-start"}`}
                    >
                      <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs ${isYou ? "bg-[#00288e] text-white" : "bg-white text-slate-800 border border-slate-200 shadow-2xs"}`}>
                        <p className={`text-[10px] font-bold mb-0.5 ${isYou ? "text-blue-200" : "text-[#00288e]"}`}>
                          {isYou ? "You" : (m.sender?.name || "Household")}
                        </p>
                        <p>{m.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type message to household..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none focus:border-[#00288e] focus:bg-white"
            />
            <button
              type="button"
              onClick={() => sendChat()}
              className="px-5 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: START WORK & BEFORE-PHOTO INSPECTION ── */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowStartModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-7 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#00288e] flex items-center justify-center font-bold">
                  <Camera size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Start Work &amp; Initial Inspection</h2>
                  <p className="text-xs text-slate-500">Record initial problem condition before repairing</p>
                </div>
              </div>
              <button onClick={() => setShowStartModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitStartWork} className="space-y-4 text-xs">
              {/* Photo Upload */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">1. Take / Upload "Before Work" Photo (Required)</label>
                <input
                  ref={beforeFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBeforePhotoUpload}
                  style={{ display: "none" }}
                />

                {beforePhotoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-900 flex items-center justify-center">
                    <img src={beforePhotoPreview} alt="Before Work Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setBeforePhotoPreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => beforeFileInputRef.current?.click()}
                    className="p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#00288e] bg-slate-50 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Camera size={26} className="text-[#00288e]" />
                    <p className="font-bold text-slate-800 text-xs">Tap to Capture / Upload Before Photo</p>
                    <p className="text-[11px] text-slate-400">Photo of broken pipe, damaged switch, or site condition</p>
                  </div>
                )}
              </div>

              {/* Diagnosis Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">2. Problem Diagnosis / Site Note (Required)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Broken water inlet valve leaking heavily; starting replacement..."
                  value={beforeDescription}
                  onChange={(e) => setBeforeDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white text-slate-900"
                />
              </div>

              {startWorkError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center">
                  ⚠️ {startWorkError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#00288e] text-[11px] font-semibold">
                🔒 Once started, a secure 4-digit completion OTP will be generated on the customer's screen.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-2.5 rounded-full bg-[#00288e] hover:bg-[#001f70] text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {busy ? "Starting Work…" : "Confirm & Start Work ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: COMPLETE JOB & OTP QUALITY VERIFICATION ── */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowOtpModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-7 space-y-4 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Key size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Job Completion &amp; OTP Verification</h2>
                  <p className="text-xs text-slate-500">Upload solved photo &amp; verify customer OTP</p>
                </div>
              </div>
              <button onClick={() => setShowOtpModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitOtpCompletion} className="space-y-4 text-xs">
              {/* After Photo Upload */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">1. Take / Upload "Solved Problem / Completed" Photo (Required)</label>
                <input
                  ref={afterFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAfterPhotoUpload}
                  style={{ display: "none" }}
                />

                {afterPhotoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-900 flex items-center justify-center">
                    <img src={afterPhotoPreview} alt="After Work Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAfterPhotoPreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => afterFileInputRef.current?.click()}
                    className="p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Camera size={26} className="text-emerald-600" />
                    <p className="font-bold text-slate-800 text-xs">Tap to Capture / Upload Solved Photo</p>
                    <p className="text-[11px] text-slate-400">Photo of repaired fixture, clean room, or fixed appliance</p>
                  </div>
                )}
              </div>

              {/* Completion Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">2. Work Done &amp; Resolution Summary (Required)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Replaced leaking valve with new brass unit, tested for water pressure, zero leakage."
                  value={afterDescription}
                  onChange={(e) => setAfterDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-emerald-600 focus:bg-white text-slate-900"
                />
              </div>

              {/* OTP Input */}
              <div className="space-y-1.5 text-center py-2 bg-emerald-50/60 rounded-2xl border border-emerald-100 p-3">
                <label className="font-bold text-emerald-950 block text-xs">3. Enter 4-Digit Customer Verification OTP</label>
                <p className="text-[11px] text-slate-500 mb-1">Ask the customer to read the 4-digit code on their tracking screen</p>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="• • • •"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.trim());
                    setOtpError(null);
                  }}
                  className="w-48 mx-auto text-center tracking-[0.5em] text-2xl font-black p-2.5 rounded-2xl border-2 border-slate-300 focus:border-emerald-600 bg-white outline-none"
                />
              </div>

              {otpError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center">
                  ⚠️ {otpError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold text-center">
                ✨ Submitting verified OTP instantly credits ₹{netPay} into your withdrawable wallet.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {busy ? "Verifying…" : "Verify OTP & Settle Job ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: DISCARD / ESCALATE WITH REASON & EVIDENCE ── */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowDiscardModal(false)}>
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 lg:p-7 space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Ban size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Discard / Escalate Booking</h2>
                  <p className="text-xs text-slate-500">Cooperative SLA Justification &amp; Evidence</p>
                </div>
              </div>
              <button onClick={() => setShowDiscardModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDiscard} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Primary Reason</label>
                <select
                  value={discardCategory}
                  onChange={(e) => setDiscardCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white font-semibold text-slate-800"
                >
                  <option value="customer_unreachable">📞 Customer phone switched off / Not answering</option>
                  <option value="wrong_location">📍 Wrong address / Location outside service perimeter</option>
                  <option value="safety_hazard">⚠️ On-site safety hazard / High-voltage danger</option>
                  <option value="customer_cancelled">🚫 Customer cancelled on doorstep / Refused service</option>
                  <option value="pricing_dispute">⚖️ Scope mismatch / Extra work not agreed</option>
                  <option value="other">📝 Other justification</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Detailed Field Justification</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the situation in detail for cooperative tribunal review..."
                  value={discardReason}
                  onChange={(e) => setDiscardReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#00288e] focus:bg-white"
                />
              </div>

              {/* Photo / Evidence Upload */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Attach Site Photo / Proof (Optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEvidenceUpload}
                  style={{ display: "none" }}
                />

                {evidencePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-32 bg-slate-900 flex items-center justify-center">
                    <img src={evidencePreview} alt="Evidence" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEvidencePreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#00288e] bg-slate-50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Camera size={22} className="text-[#00288e]" />
                    <p className="font-bold text-slate-700">Take Photo / Upload Evidence</p>
                    <p className="text-[10.5px] text-slate-400">Photo of locked gate, broken meter, or site</p>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                ℹ️ Providing photographic proof ensures this cancellation will not negatively impact your cooperative trust score.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDiscardModal(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {busy ? "Discarding…" : "Confirm Discard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}