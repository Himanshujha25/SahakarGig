import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ShieldCheck, QrCode, CheckCircle2,
  Lock, Phone, Mail, DollarSign, TrendingUp,
  Briefcase, Clock, MessageSquare, Star, Building2,
  Camera, Printer, ChevronLeft, ChevronRight,
  Trash2, HeartHandshake, Ban, X, Send, ArrowUpDown,
  Maximize2, Search, SlidersHorizontal, PauseCircle, PlayCircle
} from "lucide-react";
import api from "../../lib/api";
import { SERVER_URL } from "../../lib/config";

export default function WorkerDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workerPhotoInputRef = useRef(null);

  // Query parameters
  const workerId = searchParams.get("id") || "";
  const rawName = searchParams.get("name") || "";
  const rawEmail = searchParams.get("email") || "";
  const rawPhone = searchParams.get("phone") || "";
  const skill = searchParams.get("skill") || "Provider";
  const coopName = searchParams.get("coopName") || searchParams.get("coopId") || "Karol Bagh Labour Cooperative";

  // State
  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isEscrowLocked, setIsEscrowLocked] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(300);
  const [messageText, setMessageText] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showFullViewModal, setShowFullViewModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Sorting, Filtering & Search
  const [bookingFilter, setBookingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [fullViewSearch, setFullViewSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;

  // Custom uploaded photo stored by worker ID
  const [customWorkerAvatar, setCustomWorkerAvatar] = useState(() => {
    return localStorage.getItem("sg_worker_avatar_" + workerId) || "";
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pRes, bRes] = await Promise.allSettled([
          api.get(`/providers/${workerId}`),
          api.get(`/bookings`)
        ]);

        let pData = null;
        if (pRes.status === 'fulfilled' && pRes.value.data) {
          pData = pRes.value.data;
          setProviderData(pData);
          if (pData.hourlyRate) setHourlyRate(pData.hourlyRate);
          if (pData.status === "blocked") setIsBlocked(true);
        }

        let allBookings = pData?.bookings || [];
        if (bRes.status === 'fulfilled' && Array.isArray(bRes.value.data)) {
          const pUserId = pData?.userId?._id || pData?.userId;
          const matched = bRes.value.data.filter(b => {
            const bProv = b.providerId?._id || b.providerId;
            return (
              String(bProv) === String(workerId) ||
              (pData?._id && String(bProv) === String(pData._id)) ||
              (pUserId && String(bProv) === String(pUserId))
            );
          });
          if (matched.length > 0) {
            allBookings = matched;
          }
        }
        setBookingHistory(allBookings);
      } catch (err) {
        console.warn("Backend fetch note:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [workerId]);

  // Dynamic Properties
  const name = providerData?.userId?.name || providerData?.name || rawName || "Worker Member";
  const email = providerData?.userId?.email || providerData?.email || rawEmail || "";
  const phone = providerData?.userId?.phone || providerData?.phone || rawPhone || "";
  const skillCategory = (providerData?.skills || [skill])[0] || skill;
  const isVerified = providerData?.verified ?? true;

  // Real Avatar resolution - check actual uploaded avatars
  const passedAvatar = searchParams.get("avatar") || searchParams.get("avatarUrl");
  const storedProviderAvatar = localStorage.getItem("sg_provider_avatar");
  const storedCustomWorkerAvatar = localStorage.getItem("sg_worker_avatar_" + workerId);

  const rawResolvedAvatar =
    customWorkerAvatar ||
    storedCustomWorkerAvatar ||
    providerData?.avatarUrl ||
    providerData?.avatar ||
    providerData?.userId?.avatarUrl ||
    providerData?.userId?.profileImage ||
    providerData?.profileImage ||
    passedAvatar ||
    storedProviderAvatar ||
    "";

  const formattedAvatar = rawResolvedAvatar
    ? (rawResolvedAvatar.startsWith("http") || rawResolvedAvatar.startsWith("data:")
        ? rawResolvedAvatar
        : `${SERVER_URL}${rawResolvedAvatar}`)
    : "";

  const avatarUrl = !imageError && formattedAvatar ? formattedAvatar : null;

  // Trust score formatting
  const rawTrust = Number(providerData?.trustScore ?? 4.8);
  const normalizedTrust = rawTrust > 5 ? (rawTrust > 10 ? (rawTrust / 20) : rawTrust / 2) : rawTrust;
  const trustScore = Math.min(5.0, Math.max(1.0, normalizedTrust)).toFixed(1);

  // Dynamic IDs / Credentials
  const emergencyPhone = providerData?.userId?.emergencyContact?.phone || "";
  const eShramNo = providerData?.eshramCardNo || providerData?.eShramId || "";
  const coopLicenseNo = providerData?.licenseNo || providerData?.cooperativeId?.registrationId || "";

  // Dynamic booking analytics
  const completedBookings = bookingHistory.filter(b => (b.status || "").toLowerCase() === 'completed');
  const inProgressBookings = bookingHistory.filter(b => {
    const s = (b.status || "").toLowerCase();
    return s === 'in_progress' || s === 'assigned' || s === 'accepted';
  });
  const cancelledBookings = bookingHistory.filter(b => (b.status || "").toLowerCase() === 'cancelled');

  const completedJobsCount = completedBookings.length;
  const totalEarnedAmount = completedBookings.reduce((sum, b) => sum + (b.price || b.amount || 0), 0);
  const escrowNet = Math.round(totalEarnedAmount * 0.18);
  const workerPayoutShare = Math.round(totalEarnedAmount * 0.85);
  const coopReserveShare = Math.round(totalEarnedAmount * 0.10);
  const welfareFundShare = Math.round(totalEarnedAmount * 0.05);

  // Filtered & Sorted table rows
  const filteredBookings = bookingHistory.filter(b => {
    if (bookingFilter === "all") return true;
    if (bookingFilter === "in_progress") {
      const s = (b.status || "").toLowerCase();
      return s === "in_progress" || s === "assigned" || s === "accepted";
    }
    if (bookingFilter === "completed") return (b.status || "").toLowerCase() === "completed";
    if (bookingFilter === "cancelled") return (b.status || "").toLowerCase() === "cancelled";
    return true;
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (sortBy === "date_desc") {
      return new Date(b.scheduledTime || b.createdAt || 0) - new Date(a.scheduledTime || a.createdAt || 0);
    }
    if (sortBy === "date_asc") {
      return new Date(a.scheduledTime || a.createdAt || 0) - new Date(b.scheduledTime || b.createdAt || 0);
    }
    if (sortBy === "amount_desc") {
      return (b.price || b.amount || 0) - (a.price || a.amount || 0);
    }
    if (sortBy === "amount_asc") {
      return (a.price || a.amount || 0) - (b.price || b.amount || 0);
    }
    if (sortBy === "rating_desc") {
      return (b.rating || 5) - (a.rating || 5);
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedBookings.length / pageSize) || 1;
  const paginatedBookings = sortedBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Full view search filtering
  const fullViewList = sortedBookings.filter(b => {
    const s = fullViewSearch.toLowerCase().trim();
    if (!s) return true;
    const sId = (b._id || b.id || "").toLowerCase();
    const sSvc = (b.service || "").toLowerCase();
    const sCust = (b.householdId?.name || b.customerName || "").toLowerCase();
    return sId.includes(s) || sSvc.includes(s) || sCust.includes(s);
  });

  function showToast(text) {
    setToastMsg(text);
    setTimeout(() => setToastMsg(""), 3500);
  }

  // Handle Photo Upload
  function handleWorkerPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result;
      setCustomWorkerAvatar(b64);
      setImageError(false);
      localStorage.setItem("sg_worker_avatar_" + workerId, b64);
      showToast("Worker photo uploaded and saved.");
    };
    reader.readAsDataURL(file);
  }

  // Handle Send Direct Message
  function handleSendMessage(e) {
    e.preventDefault();
    if (!messageText.trim()) return;

    const newMsg = {
      id: "msg_" + Date.now(),
      target: workerId,
      title: "Admin Notice",
      body: messageText.trim(),
      type: "direct",
      expiresAt: Date.now() + 60 * 60 * 1000,
      createdAt: new Date().toISOString(),
    };

    try {
      const existingMsgs = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
      localStorage.setItem("sg_coop_messages", JSON.stringify([newMsg, ...existingMsgs]));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("coop_message_updated"));
    } catch {}

    setMessageText("");
    showToast(`Direct message sent to ${name}.`);
  }

  // Scannable Pass Payload
  const scannablePayload = JSON.stringify({
    cooperative: coopName,
    workerId: workerId,
    name: name,
    skill: skillCategory,
    rate: `₹${hourlyRate}/hr`,
    eShram: eShramNo || "DL-90812903",
    status: isBlocked ? "SUSPENDED" : "VERIFIED_ACTIVE",
    escrowInsurance: "ACTIVE_COVERED"
  });

  const scannableQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(scannablePayload)}`;

  function renderStatusBadge(status) {
    const st = (status || "completed").toLowerCase();
    if (st === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10.5px] whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Completed
        </span>
      );
    }
    if (st === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[10.5px] whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold text-[10.5px] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        In Progress
      </span>
    );
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "WK";

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[99999] px-4 py-3 rounded-2xl bg-surface border border-outline-variant text-on-surface font-bold text-xs shadow-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── HEADER & BREADCRUMB ── */}
      <div className="space-y-2.5">
        <button
          onClick={() => navigate("/admin/providers")}
          className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Member Roster</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                {name}
              </h1>
              {isVerified ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  Verified Member
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
                  Verification Pending
                </span>
              )}
            </div>

            <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-primary">{skillCategory} Specialist</span>
              <span>&middot;</span>
              <span>{coopName}</span>
              {phone && <span>&middot; {phone}</span>}
              {email && <span>&middot; {email}</span>}
            </p>
          </div>

          {/* Compact Actions */}
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
            <button
              onClick={() => setShowStatementModal(true)}
              className="px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
            >
              <Printer size={13} className="text-primary" />
              <span>Statement</span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="px-3 py-1.5 rounded-xl bg-primary hover:opacity-90 text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-98"
            >
              <QrCode size={13} />
              <span>Pass QR</span>
            </button>

            <button
              onClick={() => {
                setIsEscrowLocked(!isEscrowLocked);
                showToast(isEscrowLocked ? "Member payouts resumed." : "Member payouts placed on hold for review.");
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isEscrowLocked
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
              }`}
            >
              <PauseCircle size={13} />
              <span>{isEscrowLocked ? "Payouts Held" : "Hold Payout"}</span>
            </button>

            <button
              onClick={() => {
                setIsBlocked(!isBlocked);
                showToast(isBlocked ? `${name} reactivated.` : `${name} suspended.`);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isBlocked
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400"
              }`}
            >
              <Ban size={13} />
              <span>{isBlocked ? "Reactivate" : "Suspend"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 KPI STAT TILES (Sleek Compact Horizontal Cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Total Earned</p>
            <p className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">₹{totalEarnedAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <DollarSign size={15} />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Completed Jobs</p>
            <p className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">{completedJobsCount}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <Briefcase size={15} />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Trust Score</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{trustScore} <span className="text-[11px] text-on-surface-variant font-normal">/ 5</span></p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Star size={15} className="fill-amber-500 text-amber-500" />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl border border-outline-variant/60 bg-surface shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold text-on-surface-variant tracking-normal">Escrow Protected</p>
            <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">₹{escrowNet.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck size={15} />
          </div>
        </div>
      </div>

      {/* ── BALANCED TWO-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">

        {/* ── LEFT COLUMN: Identity Pass & Welfare Schemes (Span 4) ── */}
        <div className="lg:col-span-4 rounded-2xl border border-outline-variant/60 bg-surface p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Top Pass Header */}
          <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant border-b border-outline-variant/60 pb-2.5">
            <span className="flex items-center gap-1.5 text-primary">
              <Building2 size={14} />
              Identity Pass
            </span>
            <span className="font-mono text-[11px]">ID: {workerId.slice(-8).toUpperCase()}</span>
          </div>

          {/* Avatar & Profile */}
          <div className="flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  onError={() => setImageError(true)}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/30 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary text-on-primary flex items-center justify-center text-xl font-bold shadow-md">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => workerPhotoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-on-primary shadow-md cursor-pointer transition-all hover:scale-105"
                title="Upload Photo"
              >
                <Camera size={12} />
              </button>
            </div>

            <input
              ref={workerPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleWorkerPhotoUpload}
              className="hidden"
            />

            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-on-surface">{name}</h2>
              <p className="text-xs font-bold text-primary">{skillCategory} Specialist</p>
              <p className="text-[11px] text-on-surface-variant">{coopName}</p>
            </div>
          </div>

          {/* Credentials Summary */}
          <div className="space-y-2 pt-2 border-t border-outline-variant/40 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">e-Shram National UAN</span>
              <span className="font-mono font-bold text-on-surface">{eShramNo || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Cooperative License</span>
              <span className="font-mono font-bold text-on-surface">{coopLicenseNo || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Hourly Base Rate</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{hourlyRate}/hr</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-on-surface-variant">Emergency Contact</span>
              <span className="font-bold text-on-surface">{emergencyPhone || "—"}</span>
            </div>
          </div>

          {/* Welfare Schemes Summary */}
          <div className="space-y-2 pt-2 border-t border-outline-variant/40">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                Welfare Schemes
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                Active Enrolled
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface text-[11px]">PMSBY Accident Cover</p>
                  <p className="text-[10px] text-on-surface-variant">₹2,00,000 Govt. cover</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[9.5px]">ACTIVE ✓</span>
              </div>

              <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface text-[11px]">PM-JAY Ayushman Bharat</p>
                  <p className="text-[10px] text-on-surface-variant">₹5,00,000 Hospital cover</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[9.5px]">ENROLLED ✓</span>
              </div>

              <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface text-[11px]">Cooperative Emergency Pool</p>
                  <p className="text-[10px] text-on-surface-variant">10% Reserve Fund</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[9.5px]">BENEFICIARY</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Service Records & Revenue Split (Span 8) ── */}
        <div className="lg:col-span-8 space-y-4">

          {/* 📜 Service Records & Dispatch Logs */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-outline-variant/60 bg-surface-container-low flex items-center justify-between flex-wrap gap-2.5">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1.5">
                  <Clock size={15} className="text-primary" />
                  Service Records &amp; Dispatch Logs
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Booking history for {name}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: "all", label: `All (${bookingHistory.length})` },
                    { id: "completed", label: `Done (${completedJobsCount})` },
                    { id: "in_progress", label: `Active (${inProgressBookings.length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setBookingFilter(f.id);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        bookingFilter === f.id
                          ? "bg-primary text-on-primary shadow-2xs"
                          : "bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowFullViewModal(true)}
                  className="p-1 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all cursor-pointer shadow-2xs"
                  title="Expand to Full View"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            {/* Bookings Display */}
            {sortedBookings.length > 0 ? (
              <>
                {/* ── MOBILE BOOKING CARDS (< 768px) ── */}
                <div className="md:hidden divide-y divide-outline-variant/40 p-2 space-y-2">
                  {paginatedBookings.map((row, idx) => {
                    const st = (row.status || "completed").toLowerCase();
                    const rawDate = row.scheduledTime || row.createdAt || row.date || row.timestamp;
                    let formattedDate = "—";
                    if (rawDate) {
                      const d = new Date(rawDate);
                      if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
                      }
                    }

                    return (
                      <div key={row._id || row.id || idx} className="p-2.5 rounded-xl bg-surface-container-low space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-on-surface">{row.service || skillCategory}</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">₹{(row.price || row.payout || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                          <span>{row.householdId?.name || row.customerName || "Customer"} &middot; {formattedDate}</span>
                          <div>{renderStatusBadge(row.status)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── DESKTOP BOOKINGS TABLE (>= 768px) ── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/40 bg-surface-container-low text-[10.5px] font-bold text-on-surface-variant uppercase">
                        <th className="px-4 py-2.5">Booking ID</th>
                        <th className="px-4 py-2.5">Date &amp; Time</th>
                        <th className="px-4 py-2.5">Service</th>
                        <th className="px-4 py-2.5">Customer</th>
                        <th className="px-4 py-2.5">Gross Amount</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {paginatedBookings.map((row, idx) => {
                        const st = (row.status || "completed").toLowerCase();
                        const rawDate = row.scheduledTime || row.createdAt || row.date || row.timestamp;
                        let formattedDate = "—";
                        let formattedTime = "";
                        if (rawDate) {
                          const d = new Date(rawDate);
                          if (!isNaN(d.getTime())) {
                            formattedDate = d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
                            formattedTime = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                          }
                        }

                        return (
                          <tr key={row._id || row.id || idx} className="hover:bg-surface-container-low transition-colors">
                            <td className="px-4 py-2.5 font-mono font-bold text-primary">
                              {(row._id || row.id || `TX-${idx}`).slice(-8).toUpperCase()}
                            </td>
                            <td className="px-4 py-2.5 text-on-surface-variant">
                              <span className="font-bold text-on-surface">{formattedDate}</span>
                              {formattedTime && <span className="block text-[10px] text-on-surface-variant">{formattedTime}</span>}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-on-surface">{row.service || skillCategory}</td>
                            <td className="px-4 py-2.5 text-on-surface-variant">{row.householdId?.name || row.customerName || "—"}</td>
                            <td className="px-4 py-2.5 font-bold text-emerald-600 dark:text-emerald-400">₹{(row.price || row.payout || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {renderStatusBadge(row.status)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                              {st === "cancelled" ? "—" : row.rating ? `${row.rating} ⭐` : "5.0 ⭐"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {sortedBookings.length > pageSize && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-outline-variant/40 flex-wrap gap-2 text-xs">
                    <span className="text-on-surface-variant text-[11px]">
                      {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedBookings.length)} of {sortedBookings.length} logs
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-0.5 rounded-lg border border-outline-variant bg-surface font-bold disabled:opacity-40 hover:bg-surface-container cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <ChevronLeft size={12} />
                        <span>Prev</span>
                      </button>
                      <span className="px-2 py-0.5 rounded-lg bg-primary text-on-primary font-bold text-[11px]">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-0.5 rounded-lg border border-outline-variant bg-surface font-bold disabled:opacity-40 hover:bg-surface-container cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <span>Next</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-xs text-on-surface-variant space-y-1">
                <Briefcase size={20} className="mx-auto text-on-surface-variant/40 mb-1" />
                <p className="font-bold text-on-surface">No booking records found</p>
                <p>No dispatch logs match the selected filter for {name}.</p>
              </div>
            )}
          </div>

          {/* 💰 Revenue Split & Direct Message Console */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Cooperative Revenue & Commission Split */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-4 space-y-2.5 shadow-2xs">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/40 pb-2">
                <DollarSign size={14} className="text-primary" />
                Fair Wage Revenue Split
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <span className="text-on-surface-variant">Worker Disbursal (85%)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{workerPayoutShare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <span className="text-on-surface-variant">Cooperative Retention (10%)</span>
                  <span className="font-bold text-primary">₹{coopReserveShare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <span className="text-on-surface-variant">Welfare Fund Pool (5%)</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">₹{welfareFundShare.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Direct Admin Alert Dispatcher */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-4 space-y-2.5 shadow-2xs">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/40 pb-2">
                <MessageSquare size={14} className="text-primary" />
                Direct Alert Console
              </h3>
              <form onSubmit={handleSendMessage} className="space-y-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Send direct instructions to ${name}...`}
                  rows={2}
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-xs text-on-surface outline-none focus:border-primary resize-none"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-primary hover:opacity-90 text-on-primary text-xs font-bold shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Send size={12} />
                  <span>Send Direct Message</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: ENLARGED SCANNABLE QR PASS ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowQrModal(false)}>
          <div className="w-full max-w-sm bg-surface rounded-3xl p-5 text-center space-y-3.5 border border-outline-variant shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
              <h3 className="text-xs font-bold text-on-surface">Verification Pass</h3>
              <button onClick={() => setShowQrModal(false)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-outline-variant inline-block shadow-inner">
              <img src={scannableQrUrl} alt="QR Code" className="w-48 h-48 mx-auto object-contain" />
            </div>

            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-on-surface">{name}</p>
              <p className="text-[11px] text-on-surface-variant font-mono">ID: {workerId}</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">Scannable official member verification pass</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: FULL VIEW EXPANDED DISPATCH LEDGER ── */}
      {showFullViewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowFullViewModal(false)}>
          <div className="w-full max-w-4xl bg-surface text-on-surface rounded-3xl p-5 sm:p-6 space-y-4 border border-outline-variant shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-on-surface">Service History &amp; Dispatch Ledger</h2>
                  <p className="text-[11px] text-on-surface-variant">Dispatch records for {name} ({fullViewList.length} Total Logs)</p>
                </div>
              </div>
              <button onClick={() => setShowFullViewModal(false)} className="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
              <input
                type="text"
                value={fullViewSearch}
                onChange={(e) => setFullViewSearch(e.target.value)}
                placeholder="Search ledger by transaction ID, service, or customer name..."
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-outline-variant/60 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-surface-container-low border-b border-outline-variant/60 text-[10px] font-bold text-on-surface-variant uppercase">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Gross Amount</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {fullViewList.map((row, idx) => (
                    <tr key={row._id || idx} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-primary text-[11px]">{(row._id || `TX-${idx}`).slice(-8).toUpperCase()}</td>
                      <td className="px-3 py-2 text-[11px] text-on-surface-variant">{row.scheduledTime ? new Date(row.scheduledTime).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}</td>
                      <td className="px-3 py-2 font-bold text-on-surface">{row.service || skillCategory}</td>
                      <td className="px-3 py-2 text-on-surface-variant">{row.householdId?.name || "Customer"}</td>
                      <td className="px-3 py-2 font-bold text-emerald-600 dark:text-emerald-400">₹{(row.price || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2">{renderStatusBadge(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
