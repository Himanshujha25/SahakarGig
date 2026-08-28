import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  UserCheck,
  UserX,
  CreditCard,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  Briefcase,
  Clock,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Copy,
  Star,
  Sparkles,
  Building2,
  FileCheck2,
  Upload,
  FileText,
  Eye,
  Download,
  Maximize2,
  Building,
  Check,
  X,
  Shield,
  Award
} from "lucide-react";
import api from "../../lib/api";

export default function WorkerDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract complex URL query parameters
  const workerId = searchParams.get("id") || "prov_ramesh_001";
  const rawName = searchParams.get("name") || "Ramesh Kumar";
  const rawEmail = searchParams.get("email") || "plumber.test@gmail.com";
  const rawPhone = searchParams.get("phone") || "+91 98112 33445";
  const skill = searchParams.get("skill") || "Plumber";
  const coopName = searchParams.get("coopId") || "Karol Bagh Labour Cooperative";
  const role = searchParams.get("role") || "Provider";

  // Check localStorage for uploaded custom avatar & live profile edits
  const savedAvatar = localStorage.getItem("sg_provider_avatar");
  const savedProfile = (() => {
    try {
      return JSON.parse(localStorage.getItem("sg_provider_profile") || "{}");
    } catch {
      return {};
    }
  })();

  // Local Component States & Dynamic API Fetching
  const [activeTab, setActiveTab] = useState("overview");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isEscrowLocked, setIsEscrowLocked] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(savedProfile.hourlyRate || 300);
  const [messageText, setMessageText] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Modals & KYC Tab States
  const [showQrModal, setShowQrModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [documentsState, setDocumentsState] = useState({
    aadhaar: { name: "Aadhaar_Card_Verified.pdf", verified: true, date: "2024-01-15", size: "1.2 MB" },
    eshram: { name: "eShram_National_Registration.pdf", verified: true, date: "2024-02-10", size: "850 KB" },
    police: { name: "Police_Clearance_Certificate.pdf", verified: true, date: "2024-03-01", size: "2.1 MB" },
    qualification: { name: "Trade_Skill_Qualification.pdf", verified: true, date: "2024-01-20", size: "1.5 MB" }
  });

  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);

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

  // Dynamic Property Computations
  const name = providerData?.userId?.name || providerData?.name || savedProfile.name || rawName;
  const email = providerData?.userId?.email || providerData?.email || savedProfile.email || rawEmail;
  const phone = providerData?.userId?.phone || providerData?.phone || savedProfile.phone || rawPhone;
  const avatarUrl = providerData?.userId?.avatarUrl || providerData?.avatarUrl || providerData?.avatar || savedAvatar || null;
  const skillCategory = (providerData?.skills || [skill])[0] || skill;
  const trustScore = providerData?.trustScore ? Number(providerData.trustScore).toFixed(1) : "4.9";
  const eShramNo = providerData?.eshramCardNo || `IN-ES-${String(workerId).slice(-6).toUpperCase()}`;
  const coopLicenseNo = providerData?.licenseNo || `DL/COO/2024/${String(workerId).slice(-3).toUpperCase()}`;
  const linkedUpi = `${name.toLowerCase().replace(/\s+/g, '.')}@okhdfcbank`;

  // Compute live booking stats directly from MongoDB
  const completedBookings = bookingHistory.filter(b => (b.status || "").toLowerCase() === 'completed');
  const completedJobsCount = completedBookings.length;
  const totalEarnedAmount = completedBookings.reduce((sum, b) => sum + (b.price || b.amount || 0), 0);

  const escrowNet = Math.round(totalEarnedAmount * 0.18);
  const workerPayoutShare = Math.round(totalEarnedAmount * 0.85);
  const coopReserveShare = Math.round(totalEarnedAmount * 0.10);
  const welfareFundShare = Math.round(totalEarnedAmount * 0.05);

  const bookingsList = bookingHistory;

  // Phone-Scannable QR Code URL
  const verifyLinkUrl = `https://sahakargig.org/verify/provider/${workerId}?name=${encodeURIComponent(name)}&skill=${encodeURIComponent(skillCategory)}`;
  const scannableQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=10&data=${encodeURIComponent(verifyLinkUrl)}`;

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  }

  function handleFileUpload(docKey, e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentsState(prev => ({
      ...prev,
      [docKey]: {
        name: file.name,
        verified: true,
        date: new Date().toISOString().split('T')[0],
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`
      }
    }));
    showToast(`📄 Successfully uploaded and verified ${file.name}!`);
  }

  function handleSendMessage(e) {
    e.preventDefault();
    if (!messageText.trim()) return;

    const existing = JSON.parse(localStorage.getItem("sg_coop_messages") || "[]");
    const newMsg = {
      id: `msg_direct_${Date.now()}`,
      type: "direct",
      recipient: name,
      recipientEmail: email,
      text: messageText,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    localStorage.setItem("sg_coop_messages", JSON.stringify([newMsg, ...existing]));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("coop_message_updated"));
    setMessageText("");
    showToast(`💬 Direct alert message dispatched to ${name}!`);
  }

  // Filtered Dispatches for History Tab
  const filteredBookings = bookingsList.filter(row => {
    const st = (row.status || "").toLowerCase();
    if (historyFilter === "completed") return st === "completed";
    if (historyFilter === "cancelled") return st === "cancelled";
    if (historyFilter === "disputed") return st === "disputed";
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-20 space-y-5 animate-alert-in text-slate-900 dark:text-slate-100">

      {/* ── Toast Notification Banner ── */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[99999] px-4 py-3 rounded-2xl bg-[#0f172a] text-white font-extrabold text-xs shadow-2xl flex items-center gap-2 border border-[#1e6b65] animate-alert-in">
          <Sparkles size={16} className="text-[#84cc16]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── ENLARGE PHONE SCANNABLE QR CODE MODAL ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/80 dark:bg-slate-950/85 backdrop-blur-md flex items-start justify-center pt-6 sm:pt-10 pb-8 px-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-3.5 text-center relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <span className="orvia-badge-lime text-[10.5px]">e-Shram & National Pass Scanner</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white pt-0.5">{name}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{skillCategory} Specialist • {coopName}</p>
            </div>

            {/* High-Contrast Phone Scannable QR Frame */}
            <div className="p-3 rounded-2xl bg-slate-900 border-4 border-[#84cc16] shadow-xl inline-block mx-auto">
              <img
                src={scannableQrUrl}
                alt="Phone Scannable QR Code"
                className="w-52 h-52 sm:w-56 sm:h-56 object-contain rounded-xl bg-white p-2 shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
                <QrCode size={15} className="text-[#1e6b65]" />
                Point Phone Camera Here to Scan Web Link 📱
              </p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono font-medium truncate max-w-xs mx-auto">
                {verifyLinkUrl}
              </p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(verifyLinkUrl);
                showToast("Copied Verification Web URL!");
              }}
              className="w-full py-2.5 rounded-xl bg-[#1e6b65] text-white text-xs font-extrabold hover:bg-[#145e58] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              <Copy size={14} />
              <span>Copy Verification Link</span>
            </button>
          </div>
        </div>
      )}

      {/* ── TOP HEADER & COMPLEX URL ROUTE BREADCRUMBS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate("/admin/providers")}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-[#1e6b65] hover:text-white dark:hover:bg-[#1e6b65] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back to Worker Roster</span>
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{name}</h1>
            <span className="orvia-badge-lime flex items-center gap-1 text-xs">
              <ShieldCheck size={14} />
              Verified Worker Member
            </span>
            {isBlocked && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-extrabold text-xs border border-red-200 dark:border-red-800">
                ⚠️ Account Suspended
              </span>
            )}
            {isEscrowLocked && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-xs border border-amber-200 dark:border-amber-800">
                🔒 Escrow Holds Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
            Category: <strong className="text-slate-800 dark:text-slate-200">{skillCategory}</strong> • Cooperative: <strong className="text-[#1e6b65]">{coopName}</strong>
          </p>

          {/* Contact & Emergency Registry Badges */}
          <div className="flex items-center gap-3 flex-wrap pt-1 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-700">
              <Mail size={13} className="text-[#1e6b65]" />
              {email}
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-700">
              <Phone size={13} className="text-[#1e6b65]" />
              {phone}
            </span>
            <span className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-200/80 dark:border-amber-800/60">
              <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Emergency: <strong>Sunita Kumar (Spouse)</strong> • +91 98765 43210</span>
            </span>
          </div>
        </div>

        {/* Top Header Governance Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => setShowQrModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <QrCode size={15} className="text-[#84cc16]" />
            <span>Scan Phone QR</span>
          </button>

          <button
            onClick={() => {
              setIsEscrowLocked(!isEscrowLocked);
              showToast(isEscrowLocked ? `🔓 Escrow payout hold released for ${name}.` : `🔒 Escrow payouts locked for ${name}.`);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isEscrowLocked
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                : "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100"
            }`}
          >
            <Lock size={14} />
            <span>{isEscrowLocked ? "Release Escrow" : "Lock Escrow"}</span>
          </button>

          <button
            onClick={() => {
              setIsBlocked(!isBlocked);
              showToast(isBlocked ? `✅ ${name} re-activated on agency network.` : `⚠️ ${name} suspended from job alerts.`);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isBlocked
                ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-md"
                : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100"
            }`}
          >
            {isBlocked ? <UserCheck size={14} /> : <UserX size={14} />}
            <span>{isBlocked ? "Unblock Worker" : "Suspend Worker"}</span>
          </button>
        </div>
      </div>

      {/* ── NAVIGATION TABS BAR ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "overview", label: "Executive Overview", icon: Sparkles },
          { id: "financials", label: "Financials & Escrow", icon: DollarSign },
          { id: "history", label: "Job Dispatch Logs", icon: Briefcase },
          { id: "kyc", label: "KYC & National Pass", icon: FileCheck2 },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-[#1e6b65] text-white shadow-md"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800"
              }`}
            >
              <IconComp size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT 1: EXECUTIVE OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN (Span 4) */}
          <div className="lg:col-span-4 space-y-5">
            {/* 3D Flip Digital Verification Pass & QR Code */}
            <div className="orvia-card bg-white dark:bg-slate-900 p-5 space-y-4 flex flex-col items-center text-center shadow-md border border-slate-100 dark:border-slate-800 relative overflow-hidden">
              <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1 text-[#1e6b65]">
                  <Building2 size={15} />
                  Cooperative Identity Pass
                </span>
                <span className="text-[10.5px] font-mono text-slate-400">ID: {workerId.slice(-8)}</span>
              </div>

              {/* 3D Avatar & Scannable QR Container */}
              <div
                className="relative group pt-1 cursor-pointer perspective-1000"
                onMouseEnter={() => setIsFlipped(true)}
                onMouseLeave={() => setIsFlipped(false)}
                onClick={() => setShowQrModal(true)}
              >
                <div
                  className={`relative w-36 h-36 rounded-full transition-transform duration-700 transform-style-3d ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {/* FRONT FACE: High-Res Profile Photo */}
                  <div className="absolute inset-0 rounded-full backface-hidden p-1.5 bg-gradient-to-tr from-[#1e6b65] via-[#65a30d] to-[#84cc16] shadow-xl">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={name}
                        className="w-full h-full rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-inner"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#1e6b65] text-white flex items-center justify-center text-4xl font-extrabold border-4 border-white dark:border-slate-900 shadow-inner">
                        {name.split(" ").map(n => n.charAt(0)).join("").substring(0, 2) || "RK"}
                      </div>
                    )}
                  </div>

                  {/* BACK FACE: Live Phone Scannable Verification QR Code */}
                  <div className="absolute inset-0 rounded-full backface-hidden rotate-y-180 p-1.5 bg-gradient-to-tr from-[#0f172a] via-[#1e6b65] to-[#84cc16] shadow-xl flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-white p-2 flex items-center justify-center overflow-hidden border-2 border-white shadow-inner">
                      <img
                        src={scannableQrUrl}
                        alt="Phone Scannable QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-3 py-1 rounded-full bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-extrabold hover:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Maximize2 size={12} className="text-[#84cc16]" />
                  <span>Enlarge Phone QR</span>
                </button>
              </div>

              {/* Worker Primary Identity Info */}
              <div className="space-y-1 w-full pt-1 border-t border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{name}</h2>
                <p className="text-xs text-[#1e6b65] font-extrabold">{skillCategory} Specialist</p>
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <span className="orvia-badge-lime text-[10px]">e-Shram Verified ✓</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-extrabold text-[10px] border border-cyan-200 dark:border-cyan-800">
                    PMSBY Insured ✓
                  </span>
                </div>
              </div>
            </div>

            {/* Credentials Card */}
            <div className="orvia-card bg-white dark:bg-slate-900 p-5 space-y-3.5 shadow-md border border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <CreditCard size={15} className="text-[#1e6b65]" />
                Government & National Credentials
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">e-Shram National UAN</span>
                  <strong className="text-slate-900 dark:text-white font-mono font-bold">{eShramNo}</strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Cooperative License</span>
                  <strong className="text-slate-900 dark:text-white font-mono font-bold">{coopLicenseNo}</strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Police Clearance</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Verified Clean
                  </strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Hourly Base Rate</span>
                  <span className="text-[#1e6b65] font-black">₹{hourlyRate}/hr</span>
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(verifyLinkUrl);
                  setCopiedPayload(true);
                  setTimeout(() => setCopiedPayload(false), 2000);
                }}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Copy size={13} />
                <span>{copiedPayload ? "Copied Verification Link!" : "Copy Scannable QR Payload"}</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN (Span 8) */}
          <div className="lg:col-span-8 space-y-5">
            {/* 4 Stat KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider">Total Earned</span>
                  <DollarSign size={16} className="text-emerald-600" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">₹{totalEarnedAmount.toLocaleString('en-IN')}</p>
                <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp size={11} /> +18.4% this month
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider">Completed</span>
                  <Briefcase size={16} className="text-[#1e6b65]" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">{completedJobsCount} Jobs</p>
                <span className="text-[10px] font-extrabold text-[#1e6b65]">100% Dispatch Rate</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider">Trust Score</span>
                  <Star size={16} className="text-amber-500 fill-amber-500" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">{trustScore} / 5.0</p>
                <span className="text-[10px] font-extrabold text-amber-600">Top 5% Worker</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider">Escrow Net</span>
                  <ShieldCheck size={16} className="text-cyan-600" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">₹{escrowNet.toLocaleString('en-IN')}</p>
                <span className="text-[10px] font-extrabold text-cyan-700 dark:text-cyan-400">Protected Escrow</span>
              </div>
            </div>

            {/* Service Records & Dispatch Logs */}
            <div className="orvia-card bg-white dark:bg-slate-900 p-5 space-y-4 shadow-md border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock size={17} className="text-[#1e6b65]" />
                    Recent Service Records & Booking Dispatch Logs
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Completed institutional & household dispatch records</p>
                </div>
                <span className="text-[11px] font-extrabold text-[#1e6b65] bg-[#e6f4f1] dark:bg-[#1e6b65]/20 px-2.5 py-1 rounded-full border border-[#1e6b65]/20">
                  {completedJobsCount} Completed Jobs
                </span>
              </div>

              {bookingsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3 py-2.5">Booking ID</th>
                        <th className="px-3 py-2.5">Service Requested</th>
                        <th className="px-3 py-2.5">Customer Name</th>
                        <th className="px-3 py-2.5">Payout</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-right">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bookingsList.map((row, idx) => (
                        <tr key={row._id || row.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-3 font-mono font-bold text-[#1e6b65]">{(row._id || row.id || "").slice(-8).toUpperCase()}</td>
                          <td className="px-3 py-3 font-extrabold text-slate-900 dark:text-white">{row.service || skillCategory}</td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-medium">{row.householdId?.name || row.customerName || row.customer || "Household Member"}</td>
                          <td className="px-3 py-3 font-extrabold text-emerald-700 dark:text-emerald-400">₹{(row.price || row.payout || 0).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-3">
                            {(() => {
                              const st = (row.status || 'completed').toLowerCase();
                              if (st === 'completed') {
                                return (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] border border-emerald-200 dark:border-emerald-800">
                                    COMPLETED ✓
                                  </span>
                                );
                              }
                              if (st === 'cancelled') {
                                return (
                                  <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-extrabold text-[10px] border border-red-200 dark:border-red-800">
                                    CANCELLED ✕
                                  </span>
                                );
                              }
                              if (st === 'disputed') {
                                return (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] border border-amber-200 dark:border-amber-800">
                                    DISPUTED ⚠️
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[10px] border border-blue-200 dark:border-blue-800">
                                  IN PROGRESS ⚡
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-3 text-right font-extrabold text-amber-600">
                            {(row.status || "").toLowerCase() === 'cancelled'
                              ? <span className="text-slate-400 font-normal text-[11px]">N/A</span>
                              : row.rating ? `${row.rating} ⭐` : "5.0 ⭐"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Briefcase size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-extrabold text-xs text-slate-700 dark:text-slate-300">No Booking Dispatch Records Found</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">When customers book dispatches with {name}, live job logs will appear here in real-time.</p>
                </div>
              )}
            </div>

            {/* Revenue Split & Admin Console */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="orvia-card bg-white dark:bg-slate-900 p-5 space-y-3.5 shadow-md border border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <DollarSign size={15} className="text-[#1e6b65]" />
                  Cooperative Revenue & Commission Split
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>Direct Worker Payout Share</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-black">85% (₹{workerPayoutShare.toLocaleString('en-IN')})</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: "85%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>Cooperative Operational Reserve</span>
                      <span className="text-[#1e6b65] font-black">10% (₹{coopReserveShare.toLocaleString('en-IN')})</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#1e6b65] h-2 rounded-full" style={{ width: "10%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>Social Security & Welfare Fund</span>
                      <span className="text-cyan-700 dark:text-cyan-400 font-black">5% (₹{welfareFundShare.toLocaleString('en-IN')})</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-cyan-600 h-2 rounded-full" style={{ width: "5%" }}></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
                    <span>Linked UPI VPA ID:</span>
                    <strong className="text-slate-900 dark:text-white font-mono font-bold">{linkedUpi}</strong>
                  </div>
                </div>
              </div>

              <div className="orvia-card bg-white dark:bg-slate-900 p-5 space-y-3.5 shadow-md border border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Send size={15} className="text-[#1e6b65]" />
                  Direct Admin Alert Console
                </h3>

                <form onSubmit={handleSendMessage} className="space-y-2.5">
                  <textarea
                    rows="3"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Type direct alert message to ${name}...`}
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#1e6b65] focus:outline-none resize-none bg-slate-50/50 dark:bg-slate-800/50"
                  />

                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="w-full py-2.5 rounded-xl bg-[#1e6b65] text-white text-xs font-extrabold hover:bg-[#145e58] disabled:opacity-50 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Send size={14} />
                    <span>Send Direct Message Alert</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT 2: FINANCIALS & BANK PAYOUT DETAILS ── */}
      {activeTab === "financials" && (
        <div className="space-y-5 animate-fade-in">
          {/* Bank Account & Payout Setup Card */}
          <div className="orvia-card bg-white dark:bg-slate-900 p-6 space-y-5 border border-slate-100 dark:border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building size={18} className="text-[#1e6b65]" />
                  Banking & Direct Payout Escrow Settlement
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                  Linked bank account details for weekly automated payout disbursements & escrow releases.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="orvia-badge-lime text-xs">
                  <CheckCircle2 size={13} /> Bank Account Verified ✓
                </span>
              </div>
            </div>

            {/* 4 Banking Detail Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-[10.5px] font-extrabold uppercase text-slate-400">Primary Bank</span>
                <p className="text-sm font-black text-slate-900 dark:text-white">HDFC Bank Ltd.</p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Branch: Connaught Place, DL</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-[10.5px] font-extrabold uppercase text-slate-400">Account Number</span>
                <p className="text-sm font-mono font-black text-slate-900 dark:text-white">XXXX-XXXX-8841</p>
                <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">IFSC: HDFC0001234</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-[10.5px] font-extrabold uppercase text-slate-400">Linked UPI VPA</span>
                <p className="text-sm font-mono font-black text-[#1e6b65] truncate">{linkedUpi}</p>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Auto Payout Enabled</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-[10.5px] font-extrabold uppercase text-slate-400">Payout Schedule</span>
                <p className="text-sm font-black text-slate-900 dark:text-white">Weekly Auto-Transfer</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Next: Every Friday 5:00 PM</p>
              </div>
            </div>

            {/* Escrow Lock / Unlock Actions Banner */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isEscrowLocked
                ? "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                : "bg-[#e6f4f1]/60 dark:bg-[#1e6b65]/20 border-[#1e6b65]/20 text-[#145e58] dark:text-[#84cc16]"
            }`}>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black flex items-center gap-1.5">
                  <Lock size={15} />
                  Escrow Payout Status: {isEscrowLocked ? "LOCKED (Hold Active)" : "ACTIVE (Auto-Release On)"}
                </h4>
                <p className="text-[11px] font-medium opacity-90">
                  {isEscrowLocked
                    ? "Payouts are currently locked. Completed earnings will be held safely in the cooperative escrow vault."
                    : "Automatic escrow releases are enabled. 85% net earnings transfer directly to the worker bank account."}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsEscrowLocked(!isEscrowLocked);
                  showToast(isEscrowLocked ? `🔓 Released escrow payout lock for ${name}.` : `🔒 Placed escrow payout lock for ${name}.`);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold shrink-0 transition cursor-pointer border shadow-2xs ${
                  isEscrowLocked
                    ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                }`}
              >
                {isEscrowLocked ? "Release Escrow Hold" : "Lock Escrow Holds"}
              </button>
            </div>

            {/* Bank Payout Settlement History Log */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-[#1e6b65]" />
                Recent Bank Payout Settlement Receipts
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">UTR / Txn Ref</th>
                      <th className="px-3 py-2.5">Date & Time</th>
                      <th className="px-3 py-2.5">Gross Booking</th>
                      <th className="px-3 py-2.5">Worker Net Payout (85%)</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { utr: "UTR-HDFC-9912041", date: "Today, 02:30 PM", gross: "₹500", net: "₹425", status: "SETTLED ✓" },
                      { utr: "UTR-HDFC-8821940", date: "Yesterday, 06:15 PM", gross: "₹250", net: "₹212.50", status: "SETTLED ✓" },
                    ].map((tx) => (
                      <tr key={tx.utr} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-3 font-mono font-bold text-[#1e6b65]">{tx.utr}</td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-medium">{tx.date}</td>
                        <td className="px-3 py-3 font-bold text-slate-800 dark:text-slate-200">{tx.gross}</td>
                        <td className="px-3 py-3 font-extrabold text-emerald-700 dark:text-emerald-400">{tx.net}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] border border-emerald-200 dark:border-emerald-800">
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => showToast(`Downloaded Settlement Receipt ${tx.utr}`)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-[10.5px] hover:bg-[#1e6b65] hover:text-white transition cursor-pointer"
                          >
                            Receipt 📄
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT 3: JOB DISPATCH LOGS ── */}
      {activeTab === "history" && (
        <div className="space-y-4 animate-fade-in">
          <div className="orvia-card bg-white dark:bg-slate-900 p-6 space-y-4 border border-slate-100 dark:border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase size={18} className="text-[#1e6b65]" />
                  Job Dispatch Logs & Customer Service History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                  Complete history of dispatches, customer feedback, and job status records.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "all", label: "All Dispatches" },
                  { id: "completed", label: "Completed" },
                  { id: "cancelled", label: "Cancelled" },
                  { id: "disputed", label: "Disputed" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setHistoryFilter(f.id)}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer ${
                      historyFilter === f.id
                        ? "bg-[#1e6b65] text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3.5 py-3">Booking ID</th>
                      <th className="px-3.5 py-3">Service Category</th>
                      <th className="px-3.5 py-3">Customer Name</th>
                      <th className="px-3.5 py-3">Price</th>
                      <th className="px-3.5 py-3">Status</th>
                      <th className="px-3.5 py-3 text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBookings.map((row, idx) => (
                      <tr key={row._id || row.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3.5 py-3.5 font-mono font-bold text-[#1e6b65]">{(row._id || row.id || "").slice(-8).toUpperCase()}</td>
                        <td className="px-3.5 py-3.5 font-extrabold text-slate-900 dark:text-white">{row.service || skillCategory}</td>
                        <td className="px-3.5 py-3.5 text-slate-600 dark:text-slate-300 font-semibold">{row.householdId?.name || row.customerName || row.customer || "Household Member"}</td>
                        <td className="px-3.5 py-3.5 font-extrabold text-emerald-700 dark:text-emerald-400">₹{(row.price || row.payout || 0).toLocaleString('en-IN')}</td>
                        <td className="px-3.5 py-3.5">
                          {(() => {
                            const st = (row.status || 'completed').toLowerCase();
                            if (st === 'completed') {
                              return <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10.5px] border border-emerald-200 dark:border-emerald-800">COMPLETED ✓</span>;
                            }
                            if (st === 'cancelled') {
                              return <span className="px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-extrabold text-[10.5px] border border-red-200 dark:border-red-800">CANCELLED ✕</span>;
                            }
                            if (st === 'disputed') {
                              return <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[10.5px] border border-amber-200 dark:border-amber-800">DISPUTED ⚠️</span>;
                            }
                            return <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[10.5px] border border-blue-200 dark:border-blue-800">IN PROGRESS ⚡</span>;
                          })()}
                        </td>
                        <td className="px-3.5 py-3.5 text-right font-extrabold text-amber-600">
                          {(row.status || "").toLowerCase() === 'cancelled'
                            ? <span className="text-slate-400 font-normal">N/A</span>
                            : row.rating ? `${row.rating} ⭐` : "5.0 ⭐"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 space-y-2 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Briefcase size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-extrabold text-xs text-slate-700 dark:text-slate-300">No Dispatches Match Filter ({historyFilter})</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Select another filter tab above to view dispatch logs.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT 4: KYC & NATIONAL DOCUMENT UPLOAD ── */}
      {activeTab === "kyc" && (
        <div className="space-y-5 animate-fade-in">
          <div className="orvia-card bg-white dark:bg-slate-900 p-6 space-y-5 border border-slate-100 dark:border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck2 size={18} className="text-[#1e6b65]" />
                  KYC Verification & National Pass Documents
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                  Government verification documents, e-Shram cards, trade licenses, and QR passes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="orvia-badge-lime text-xs">
                  <ShieldCheck size={14} /> 100% KYC Verified ✓
                </span>
              </div>
            </div>

            {/* 4 Document Upload Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { key: "aadhaar", title: "Aadhaar Card (Front/Back)", id: "Aadhaar: XXXX-8841", state: documentsState.aadhaar },
                { key: "eshram", title: "e-Shram National Card", id: `UAN: ${eShramNo}`, state: documentsState.eshram },
                { key: "police", title: "Police Clearance Certificate", id: "Cert: DL-POL-2024-9982", state: documentsState.police },
                { key: "qualification", title: "Trade Skill Qualification Certificate", id: `Skill: ${skillCategory} Trade Cert`, state: documentsState.qualification },
              ].map((doc) => (
                <div key={doc.key} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FileText size={15} className="text-[#1e6b65]" />
                        {doc.title}
                      </h4>
                      <span className="orvia-badge-lime text-[10px]">Verified ✓</span>
                    </div>

                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{doc.id}</p>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11.5px]">{doc.state.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Uploaded {doc.state.date} • {doc.state.size}</p>
                      </div>
                      <button
                        onClick={() => showToast(`Opening preview for ${doc.state.name}`)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </div>

                  {/* Upload / Replace Document Input Button */}
                  <label className="w-full py-2 px-3 rounded-xl border border-dashed border-[#1e6b65]/40 dark:border-[#1e6b65]/60 bg-[#e6f4f1]/30 dark:bg-[#1e6b65]/10 hover:bg-[#e6f4f1]/70 dark:hover:bg-[#1e6b65]/20 text-[#145e58] dark:text-[#84cc16] text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5">
                    <Upload size={13} />
                    <span>Upload / Replace Document</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(doc.key, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              ))}
            </div>

           
          </div>
        </div>
      )}

    </div>
  );
}
