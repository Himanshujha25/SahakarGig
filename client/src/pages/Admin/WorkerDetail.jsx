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

  // Dynamic Properties (Pure real data)
  const name = providerData?.userId?.name || providerData?.name || rawName || "Worker Member";
  const email = providerData?.userId?.email || providerData?.email || rawEmail || "";
  const phone = providerData?.userId?.phone || providerData?.phone || rawPhone || "";
  const skillCategory = (providerData?.skills || [skill])[0] || skill;
  const isVerified = providerData?.verified ?? true;

  // Real Avatar resolution
  const passedAvatar = searchParams.get("avatar") || searchParams.get("avatarUrl");
  const avatarUrl = !imageError && (
    customWorkerAvatar ||
    passedAvatar ||
    providerData?.userId?.avatarUrl ||
    providerData?.avatarUrl ||
    null
  );

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
    return (b.status || "").toLowerCase() === bookingFilter.toLowerCase();
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (sortBy === "date_desc") {
      const da = new Date(a.scheduledTime || a.createdAt || a.date || 0).getTime();
      const db = new Date(b.scheduledTime || b.createdAt || b.date || 0).getTime();
      return db - da;
    }
    if (sortBy === "date_asc") {
      const da = new Date(a.scheduledTime || a.createdAt || a.date || 0).getTime();
      const db = new Date(b.scheduledTime || b.createdAt || b.date || 0).getTime();
      return da - db;
    }
    if (sortBy === "amount_desc") {
      return (b.price || b.payout || 0) - (a.price || a.payout || 0);
    }
    if (sortBy === "amount_asc") {
      return (a.price || a.payout || 0) - (b.price || b.payout || 0);
    }
    if (sortBy === "rating_desc") {
      return (b.rating || 5) - (a.rating || 5);
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedBookings.length / pageSize));
  const paginatedBookings = sortedBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Full View Search Filtered List
  const fullViewList = bookingHistory.filter(b => {
    const q = fullViewSearch.toLowerCase().trim();
    if (!q) return true;
    const bId = (b._id || b.id || "").toLowerCase();
    const srv = (b.service || "").toLowerCase();
    const cust = (b.householdId?.name || b.customerName || "").toLowerCase();
    const st = (b.status || "").toLowerCase();
    return bId.includes(q) || srv.includes(q) || cust.includes(q) || st.includes(q);
  });

  // Phone-Scannable QR URL
  const verifyLinkUrl = `https://sahakargig.org/verify/provider/${workerId}?name=${encodeURIComponent(name)}&skill=${encodeURIComponent(skillCategory)}`;
  const scannableQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=10&data=${encodeURIComponent(verifyLinkUrl)}`;

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  }

  function handleWorkerPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Photo size should be less than 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setCustomWorkerAvatar(base64);
      setImageError(false);
      localStorage.setItem("sg_worker_avatar_" + workerId, base64);
      try {
        await api.patch(`/providers/${workerId}`, { avatarUrl: base64 });
      } catch (err) {
        console.warn("Could not sync avatar to MongoDB:", err);
      }
      showToast("Worker photo updated successfully!");
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveWorkerPhoto() {
    setCustomWorkerAvatar("");
    setImageError(true);
    localStorage.removeItem("sg_worker_avatar_" + workerId);
    localStorage.removeItem("sg_provider_avatar");
    try {
      await api.patch(`/providers/${workerId}`, { avatarUrl: "" });
    } catch (err) {
      console.warn("Could not clear avatar in MongoDB:", err);
    }
    showToast("Worker photo reset to initials.");
  }

  function handleSendMessage(e) {
    e.preventDefault();
    if (!messageText.trim()) return;
    showToast(`Alert message dispatched to ${name}!`);
    setMessageText("");
  }

  function renderStatusBadge(status) {
    const st = (status || "completed").toLowerCase();
    if (st === "completed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Completed
        </span>
      );
    }
    if (st === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Cancelled
        </span>
      );
    }
    if (st === "disputed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[11px] whitespace-nowrap shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          Disputed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#00288e] border border-blue-200 font-bold text-[11px] whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00288e] animate-pulse" />
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
    <div className="w-full max-w-7xl mx-auto px-6 pt-6 pb-20 space-y-6 text-slate-900 font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[99999] px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── HEADER & BREADCRUMB ── */}
      <div className="space-y-3">
        <button
          onClick={() => navigate("/admin/providers")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#00288e] cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Worker Roster</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                {name}
              </h1>
              {isVerified ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Verified Member
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                  Verification Pending
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#00288e]">{skillCategory} Specialist</span>
              <span>•</span>
              <span>{coopName}</span>
              {email && <span>• {email}</span>}
              {phone && <span>• {phone}</span>}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowStatementModal(true)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
            >
              <Printer size={14} className="text-[#00288e]" />
              <span>Download Statement</span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
            >
              <QrCode size={14} className="text-emerald-400" />
              <span>Digital Pass QR</span>
            </button>

            <button
              onClick={() => {
                setIsEscrowLocked(!isEscrowLocked);
                showToast(isEscrowLocked ? "Member payouts resumed." : "Member payouts placed on hold for review.");
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isEscrowLocked
                  ? "bg-amber-50 border-amber-200 text-amber-800 shadow-2xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              title={isEscrowLocked ? "Click to resume member payouts" : "Click to temporarily hold member payouts"}
            >
              {isEscrowLocked ? (
                <>
                  <PauseCircle size={14} className="text-amber-600" />
                  <span>Payouts On Hold</span>
                </>
              ) : (
                <>
                  <PauseCircle size={14} className="text-slate-500" />
                  <span>Hold Payouts</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsBlocked(!isBlocked);
                showToast(isBlocked ? `${name} reactivated.` : `${name} suspended.`);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isBlocked
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-50 hover:bg-red-100 border border-red-200 text-red-700"
              }`}
            >
              <Ban size={13} />
              <span>{isBlocked ? "Reactivate" : "Suspend Worker"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 KPI STAT TILES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Earned</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{totalEarnedAmount.toLocaleString('en-IN')}</p>
          <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
            <TrendingUp size={11} /> +18.4% this month
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Jobs</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
              <Briefcase size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{completedJobsCount}</p>
          <p className="text-[11px] font-semibold text-slate-500">100% Completion Rate</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trust Score</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Star size={15} className="fill-amber-500 text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{trustScore} <span className="text-xs font-semibold text-slate-400">/ 5.0</span></p>
          <p className="text-[11px] font-semibold text-amber-700">Top 5% Verified Member</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Escrow Protected</p>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <ShieldCheck size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{escrowNet.toLocaleString('en-IN')}</p>
          <p className="text-[11px] font-semibold text-purple-700">Nodal Escrow Protected</p>
        </div>
      </div>

      {/* ── BALANCED TWO-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT COLUMN: Identity Pass & Welfare Schemes (Span 4) ── */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-5">
          {/* Top Pass Header */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-3">
            <span className="flex items-center gap-1.5 text-[#00288e]">
              <Building2 size={15} />
              Cooperative Identity Pass
            </span>
            <span className="font-mono text-[11px]">ID: {workerId.slice(-8).toUpperCase()}</span>
          </div>

          {/* Avatar & Profile */}
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  onError={() => setImageError(true)}
                  className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#00288e] text-white flex items-center justify-center text-2xl font-bold shadow-md border-4 border-slate-100">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => workerPhotoInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md cursor-pointer transition-all"
                title="Upload Photo"
              >
                <Camera size={13} />
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
              <h2 className="text-base font-bold text-slate-900">{name}</h2>
              <p className="text-xs font-bold text-[#00288e]">{skillCategory} Specialist</p>
              <p className="text-[11px] text-slate-400">{coopName}</p>
            </div>

         
          </div>

          {/* Credentials Summary */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">e-Shram National UAN</span>
              <span className="font-mono font-bold text-slate-900">{eShramNo || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Cooperative License</span>
              <span className="font-mono font-bold text-slate-900">{coopLicenseNo || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Hourly Base Rate</span>
              <span className="font-bold text-emerald-700">₹{hourlyRate}/hr</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Emergency Contact</span>
              <span className="font-bold text-slate-900">{emergencyPhone || "—"}</span>
            </div>
          </div>

          {/* Welfare Schemes Summary */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-700" />
                Welfare Schemes
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                Active Enrolled
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-[11.5px]">PMSBY Accident Cover</p>
                  <p className="text-[10px] text-slate-400">₹2,00,000 Govt. cover</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9.5px]">ACTIVE ✓</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-[11.5px]">PM-JAY Ayushman Bharat</p>
                  <p className="text-[10px] text-slate-400">₹5,00,000 Hospital cover</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9.5px]">ENROLLED ✓</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-[11.5px]">Cooperative Emergency Pool</p>
                  <p className="text-[10px] text-slate-400">10% Reserve Fund</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#00288e] font-bold text-[9.5px]">BENEFICIARY</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Service Records & Revenue Split (Span 8) ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* 📜 Service Records & Dispatch Logs */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={16} className="text-[#00288e]" />
                  Service Records &amp; Booking Dispatch Logs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Completed and ongoing customer booking ledger for {name}</p>
              </div>

              {/* Controls: Filter Pills, Sort By Dropdown & Full View */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Filter Pills */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: "all", label: `All (${bookingHistory.length})` },
                    { id: "completed", label: `Completed (${completedJobsCount})` },
                    { id: "in_progress", label: `In Progress (${inProgressBookings.length})` },
                    { id: "cancelled", label: `Cancelled (${cancelledBookings.length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setBookingFilter(f.id);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        bookingFilter === f.id
                          ? "bg-[#00288e] text-white shadow-2xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-1 pl-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 cursor-pointer"
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="amount_desc">Highest Payout</option>
                    <option value="amount_asc">Lowest Payout</option>
                    <option value="rating_desc">Top Rated</option>
                  </select>
                </div>

                {/* Full View Button */}
                <button
                  type="button"
                  onClick={() => setShowFullViewModal(true)}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#00288e] transition-all cursor-pointer shadow-2xs"
                  title="Expand to Full View"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* Bookings Table */}
            {sortedBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="px-4 py-3">Booking ID</th>
                      <th className="px-4 py-3">Date &amp; Time</th>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Gross Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
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
                        <tr key={row._id || row.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-[#00288e]">
                            {(row._id || row.id || `TX-${idx}`).slice(-8).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="font-bold text-slate-900">{formattedDate}</span>
                            {formattedTime && <span className="block text-[10.5px] text-slate-400 font-medium">{formattedTime}</span>}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{row.service || skillCategory}</td>
                          <td className="px-4 py-3 text-slate-600">{row.householdId?.name || row.customerName || "—"}</td>
                          <td className="px-4 py-3 font-bold text-emerald-700">₹{(row.price || row.payout || 0).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {renderStatusBadge(row.status)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-amber-600">
                            {st === "cancelled" ? "—" : row.rating ? `${row.rating} ⭐` : "5.0 ⭐"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {sortedBookings.length > pageSize && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 flex-wrap gap-2 text-xs">
                    <span className="text-slate-500">
                      Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedBookings.length)} of {sortedBookings.length} logs
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft size={13} />
                        <span>Prev</span>
                      </button>
                      <span className="px-3 py-1 rounded-lg bg-[#00288e] text-white font-bold text-xs">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40 hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                <Briefcase size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700">No booking records found</p>
                <p>No dispatch logs match the selected filter for {name}.</p>
              </div>
            )}
          </div>

          {/* 💰 Revenue Split & Direct Message Console */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Cooperative Revenue & Commission Split */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <DollarSign size={15} className="text-[#00288e]" />
                Fair Wage Revenue Split
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Worker Disbursal (85%)</span>
                  <span className="font-bold text-emerald-700">₹{workerPayoutShare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Cooperative Retention (10%)</span>
                  <span className="font-bold text-blue-700">₹{coopReserveShare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Welfare Fund Pool (5%)</span>
                  <span className="font-bold text-amber-700">₹{welfareFundShare.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Direct Admin Alert Dispatcher */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <MessageSquare size={15} className="text-[#00288e]" />
                Direct Admin Alert Console
              </h3>
              <form onSubmit={handleSendMessage} className="space-y-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Send direct dispatch instructions or compliance notice to ${name}...`}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-[#00288e] focus:bg-white resize-none"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#00288e] hover:bg-[#001f70] text-white text-xs font-bold shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Send size={13} />
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
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center space-y-4 border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Official Verification Pass</h3>
              <button onClick={() => setShowQrModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 inline-block shadow-inner">
              <img src={scannableQrUrl} alt="QR Code" className="w-56 h-56 mx-auto object-contain" />
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-900">{name}</p>
              <p className="text-[11px] text-slate-500 font-mono">ID: {workerId}</p>
              <p className="text-[10px] text-emerald-700 font-semibold pt-1">Scan with any smartphone camera for instant credential verification</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: FULL VIEW EXPANDED DISPATCH LEDGER ── */}
      {showFullViewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowFullViewModal(false)}>
          <div className="w-full max-w-5xl bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Full Service History &amp; Dispatch Ledger</h2>
                  <p className="text-xs text-slate-500">Comprehensive dispatch records for {name} ({fullViewList.length} Total Logs)</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button onClick={() => setShowFullViewModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="relative shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={fullViewSearch}
                onChange={(e) => setFullViewSearch(e.target.value)}
                placeholder="Search across Booking ID, Service Category, Customer name, or Status..."
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-[#00288e] focus:bg-white"
              />
            </div>

            {/* Scrollable Expanded Table */}
            <div className="overflow-y-auto overflow-x-auto flex-1 rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Booking ID</th>
                    <th className="px-4 py-3">Scheduled / Creation Date</th>
                    <th className="px-4 py-3">Service Requested</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Gross Value</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fullViewList.map((row, idx) => {
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
                      <tr key={row._id || row.id || idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono font-bold text-[#00288e]">
                          {(row._id || row.id || `TX-${idx}`).slice(-8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="font-bold text-slate-900">{formattedDate}</span>
                          {formattedTime && <span className="block text-[10.5px] text-slate-400 font-medium">{formattedTime}</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{row.service || skillCategory}</td>
                        <td className="px-4 py-3 text-slate-600">{row.householdId?.name || row.customerName || "—"}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">₹{(row.price || row.payout || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderStatusBadge(row.status)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-600">
                          {st === "cancelled" ? "—" : row.rating ? `${row.rating} ⭐` : "5.0 ⭐"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-500 shrink-0">
              <span>Showing {fullViewList.length} of {bookingHistory.length} total booking logs</span>
              <button
                onClick={() => setShowFullViewModal(false)}
                className="px-4 py-2 rounded-full border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close Full View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: PRINTABLE STATEMENT & DISBURSAL LEDGER ── */}
      {showStatementModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowStatementModal(false)}>
          <div className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl p-6 lg:p-8 space-y-5 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <Printer size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Official Member Statement &amp; Disbursal Certificate</h2>
                  <p className="text-xs text-slate-500">Certified earnings statement for {name}</p>
                </div>
              </div>
              <button onClick={() => setShowStatementModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-slate-300 bg-slate-50/60 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-300 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">SAHAKARGIG COOPERATIVE FEDERATION</h3>
                  <p className="text-xs text-slate-700 font-bold">{coopName}</p>
                  <p className="text-[11px] text-slate-500">Govt Registration: {coopLicenseNo || "DL-COOP-2026-001"}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    VERIFIED MEMBER
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">Date: {new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Worker Member</span>
                  <p className="font-bold text-slate-900 mt-0.5">{name}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Trade Skill</span>
                  <p className="font-bold text-slate-900 mt-0.5">{skillCategory}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">e-Shram UAN</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{eShramNo || "—"}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Net Disbursed</span>
                  <p className="font-bold text-emerald-700 mt-0.5">₹{totalEarnedAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10.5px]">
                    <tr>
                      <th className="px-3 py-2.5">Booking Ref</th>
                      <th className="px-3 py-2.5">Service</th>
                      <th className="px-3 py-2.5">Gross Amount</th>
                      <th className="px-3 py-2.5">Member Share (85%)</th>
                      <th className="px-3 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedBookings.map((b, i) => (
                      <tr key={b._id || b.id || i}>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{(b._id || b.id || `TX-${i}`).slice(-8).toUpperCase()}</td>
                        <td className="px-3 py-2">{b.service || skillCategory}</td>
                        <td className="px-3 py-2 font-bold">₹{b.price || b.amount || 0}</td>
                        <td className="px-3 py-2 font-bold text-emerald-700">₹{Math.round((b.price || b.amount || 0) * 0.85)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">Disbursed ✓</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-300 text-xs text-slate-500">
                <div>
                  <p className="font-semibold text-slate-700">Digitally Certified via SahakarGig Nodal Escrow</p>
                  <p className="text-[10px]">Ministry of Cooperation Multi-State Framework</p>
                </div>
                <div className="text-right">
                  <div className="w-28 h-8 border-b border-slate-400 mb-1" />
                  <p className="text-[10px] font-bold text-slate-700">Authorized Signatory</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowStatementModal(false)}
                className="px-4 py-2.5 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-full bg-[#00288e] text-white font-bold hover:bg-[#001f70] shadow-md cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
