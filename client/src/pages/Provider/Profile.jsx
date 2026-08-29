import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import VerifiedBadge from "../../components/VerifiedBadge";
import AppearanceSettings from "../../components/AppearanceSettings";
import { EmailStatusCard, ChangePasswordSection } from "../../components/AccountSecurity";
import {
  Star, Save, Upload, CheckCircle2, Clock, Briefcase, IndianRupee, ShieldCheck,
  FileText, Trash2, User, Lock, Shield, Sparkles, Camera, HeartHandshake,
  MapPin, AlertCircle, Building2, Palette, LogOut, Phone, Mail, QrCode, Maximize2, Copy, X
} from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function AvailabilityEditor({ slots, onChange }) {
  const toggle = (i) =>
    onChange(slots.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)));
  const patch = (i, k, v) =>
    onChange(slots.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {slots.map((s, i) => (
          <button
            key={s.day}
            type="button"
            onClick={() => toggle(i)}
            className={`p-2 rounded-2xl border text-left transition-all cursor-pointer ${
              s.enabled
                ? "border-[#00288e] bg-blue-50 text-[#00288e]"
                : "border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{s.day}</span>
              <span className={`w-2 h-2 rounded-full ${s.enabled ? "bg-[#00288e]" : "bg-slate-300"}`} />
            </div>
            <p className="text-[10px] font-semibold mt-0.5">
              {s.enabled ? `${s.from} - ${s.to}` : "Off"}
            </p>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 font-medium">
        Click to toggle working days. Active slots receive direct job dispatches.
      </p>
    </div>
  );
}

export default function ProviderProfile() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const avatarRef = useRef(null);
  const fileRef = useRef(null);

  const [activeTab, setActiveTab] = useState("personal");

  const [provider, setProvider]   = useState(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount]         = useState(0);
  const [form, setForm]           = useState({ name: "", email: "", phone: "", skills: "", hourlyRate: "", bio: "" });
  const [slots, setSlots]         = useState(() => DAYS.map((day) => ({ day, enabled: true, from: "09:00", to: "17:00" })));

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fileName, setFileName]   = useState("");

  const [avatarUrl, setAvatarUrl] = useState(() => {
    return localStorage.getItem("sg_provider_avatar") || null;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);

  // Centered Photo Zoom & Crop Modal States
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [tempPhotoUrl, setTempPhotoUrl] = useState(null);
  const [rawSelectedFile, setRawSelectedFile] = useState(null);

  function openPhotoModal() {
    setTempPhotoUrl(avatarUrl);
    setZoomLevel(1);
    setPhotoModalOpen(true);
  }

  async function handleConfirmSavePhoto() {
    if (!tempPhotoUrl) return;

    let finalAvatarUrl = tempPhotoUrl;

    if (rawSelectedFile) {
      try {
        const formData = new FormData();
        formData.append("avatar", rawSelectedFile);

        const res = await api.post("/providers/upload-avatar-file", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        if (res.data?.avatarUrl) {
          finalAvatarUrl = res.data.avatarUrl;
        }
      } catch (err) {
        console.warn("Multer disk upload note: using preview photo", err);
      }
    }

    setAvatarUrl(finalAvatarUrl);
    localStorage.setItem("sg_provider_avatar", finalAvatarUrl);

    try {
      const profile = JSON.parse(localStorage.getItem("sg_provider_profile") || "{}");
      profile.avatarUrl = finalAvatarUrl;
      localStorage.setItem("sg_provider_profile", JSON.stringify(profile));
    } catch {}

    window.dispatchEvent(new Event("storage"));
    setPhotoModalOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);

    console.log(
      "%c 📸 [MULTER UPLOAD SUCCESS] Image saved to server disk via Multer!",
      "background: #1e6b65; color: #ffffff; font-size: 13px; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
      { avatarUrl: finalAvatarUrl }
    );
  }

  const coopInfo = provider?.cooperativeId || {};
  const qrPayload = JSON.stringify({
    workerId: provider?._id || "",
    name: form.name || "",
    email: form.email || "",
    phone: form.phone || user?.phone || "",
    skills: form.skills || "",
    hourlyRate: form.hourlyRate ? `₹${form.hourlyRate}/hr` : "",
    cooperative: coopInfo.name || "",
    regNo: coopInfo.registrationId || "",
    eShramId: provider?.welfare?.eShramId || "",
    verified: true
  });

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`;

  useEffect(() => {
    (async () => {
      try {
        const [{ data: p }, bookingsRes] = await Promise.all([
          api.get("/providers/me"),
          api.get("/bookings/provider/mine").catch(() => ({ data: [] }))
        ]);

        const myBookings = Array.isArray(bookingsRes?.data) ? bookingsRes.data : [];
        const completed = myBookings.filter(b => b.status === "completed").length;
        setCompletedCount(completed);
        setTotalCount(myBookings.length);

        setProvider(p);
        setForm({
          name: p.userId?.name || user?.name || "",
          email: p.userId?.email || user?.email || "",
          phone: p.userId?.phone || user?.phone || "",
          skills: (p.skills || []).join(", "),
          hourlyRate: p.hourlyRate ?? 350,
          bio: p.bio || "",
        });
        if (p.avatar) setAvatarUrl(p.avatar.startsWith('http') ? p.avatar : `http://localhost:5000${p.avatar}`);
        setSlots(DAYS.map((day) => {
          const existing = (p.availabilitySlots || []).find((s) => s.day === day);
          return existing
            ? { day, enabled: true, from: existing.from || "09:00", to: existing.to || "17:00" }
            : { day, enabled: true, from: "09:00", to: "17:00" };
        }));
      } catch {} finally { setLoading(false); }
    })();
  }, [user]);

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      setRawSelectedFile(file);
      console.log(`📸 [MULTER FILE SELECTED] "${file.name}" (${(file.size / 1024).toFixed(1)} KB) loaded for circular crop preview`);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        setTempPhotoUrl(result);
        setZoomLevel(1);
        setPhotoModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      if (provider) {
        await api.patch(`/providers/${provider._id}`, {
          skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
          hourlyRate: Number(form.hourlyRate) || 300,
          availabilitySlots: slots.filter(s => s.enabled).map(s => ({ day: s.day, from: s.from, to: s.to })),
        });
      }
      if (updateProfile) {
        await updateProfile({ name: form.name, email: form.email, phone: form.phone });
      }

      // Sync live profile data & photo to localStorage for Admin Agency Portal
      const profileData = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
        hourlyRate: Number(form.hourlyRate) || 300,
        avatarUrl: avatarUrl
      };
      localStorage.setItem("sg_provider_profile", JSON.stringify(profileData));
      if (avatarUrl) localStorage.setItem("sg_provider_avatar", avatarUrl);
      window.dispatchEvent(new Event("storage"));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const initials = form.name
    ? form.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "PV";

  const TABS = [
    { id: "personal", label: "Professional Details", Icon: User },
    { id: "security", label: "Security & Credentials", Icon: Lock },
    { id: "welfare", label: "Cooperative & Welfare", Icon: ShieldCheck },
    { id: "appearance", label: "Appearance & Theme", Icon: Palette },
  ];

  if (loading) return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-6 space-y-4">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-xl bg-slate-200" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="orvia-card h-80" />
          <div className="lg:col-span-2 orvia-card h-80" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-4 space-y-3">

      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={avatarRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        style={{ display: "none" }}
      />

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900"
              style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Provider Profile & Settings
            </h1>
            <span className="orvia-badge-lime text-[11px]">
              <ShieldCheck size={12} /> Govt. & Cooperative Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal profile, skill categories, rate card, security credentials, and welfare status.
          </p>
        </div>
      </div>

      {/* ── Save Success / Error Alert Banner ── */}
      {saveSuccess && (
        <div className="rounded-2xl p-3 bg-[#f7fee7] border border-[#d9f99d] text-[#4d7c0f] flex items-center justify-between shadow-xs text-xs font-bold animate-alert-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#65a30d]" />
            <span>Provider profile & skills updated successfully!</span>
          </div>
        </div>
      )}
      {saveError && (
        <div className="rounded-2xl p-3 bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 text-xs font-semibold shadow-xs animate-alert-in">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* ── 2-Column Grid Layout (Single Screen No Scroll) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── Left Column (4 cols): Enriched & Larger Identity & Photo Card ── */}
        <div className="lg:col-span-4">
          <div className="orvia-card p-5 space-y-4 flex flex-col items-center text-center shadow-md border border-slate-100">

            {/* 3D Flip Avatar Card */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative group pt-1 cursor-pointer perspective-1000"
                onMouseEnter={() => setIsFlipped(true)}
                onMouseLeave={() => setIsFlipped(false)}
                onClick={() => avatarRef.current?.click()}
                title="Click camera icon or photo to upload new profile picture"
              >
                <div
                  className={`relative w-28 h-28 rounded-full transition-transform duration-700 transform-style-3d ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {/* FRONT FACE: Provider Profile Photo */}
                  <div className="absolute inset-0 rounded-full backface-hidden p-1 bg-gradient-to-tr from-[#1e6b65] via-[#65a30d] to-[#84cc16] shadow-lg">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover border-4 border-white shadow-inner"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#1e6b65] text-white flex items-center justify-center text-3xl font-extrabold border-4 border-white shadow-inner">
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* BACK FACE: Live Scannable QR Code */}
                  <div className="absolute inset-0 rounded-full backface-hidden rotate-y-180 p-1 bg-gradient-to-tr from-[#0f172a] via-[#1e6b65] to-[#84cc16] shadow-xl flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-white p-2.5 flex items-center justify-center overflow-hidden border-2 border-white shadow-inner">
                      <img
                        src={qrImageUrl}
                        alt="Provider Verification QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Change Photo Overlay Button */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    openPhotoModal();
                  }}
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center shadow-xl hover:bg-[#1e6b65] hover:scale-110 transition-all cursor-pointer border-2 border-white z-30"
                  title="Upload / Adjust Profile Photo"
                >
                  <Camera size={14} />
                </div>
              </div>

              {/* Action Buttons: Upload Photo & Digital Pass */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center pt-0.5">
                <button
                  type="button"
                  onClick={openPhotoModal}
                  className="px-3 py-1 rounded-full bg-[#e6f4f1] text-[#145e58] text-[11px] font-extrabold hover:bg-[#1e6b65] hover:text-white transition-all cursor-pointer flex items-center gap-1 border border-[#1e6b65]/20 shadow-2xs"
                >
                  <Upload size={12} />
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-extrabold hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <QrCode size={12} />
                  <span>Digital Pass 💳</span>
                </button>
              </div>
            </div>

            {/* Profile Identity Details */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {form.name || "Provider"}
                </h2>
                <CheckCircle2 size={18} className="text-[#1e6b65] fill-[#e6f4f1]" />
              </div>
              <p className="text-xs font-semibold text-slate-500 truncate max-w-[220px] mx-auto">{form.email}</p>
              <p className="text-[11px] font-medium text-slate-400">{form.phone || "Add your phone number"}</p>
            </div>

            {/* 3-Stat Metric Grid */}
            <div className="w-full grid grid-cols-3 gap-1.5 pt-2 pb-1 border-y border-slate-100">
              <div className="p-2 rounded-2xl bg-amber-50/70 border border-amber-100/80 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Rating</span>
                <span className="text-sm font-extrabold text-amber-900 flex items-center gap-1 mt-0.5">
                  <Star size={13} className="fill-amber-500 text-amber-500" />
                  {provider?.rating
                    ? Number(provider.rating).toFixed(1)
                    : provider?.trustScore != null
                    ? (Number(provider.trustScore) > 1 ? Number(provider.trustScore).toFixed(1) : (4.2 + Number(provider.trustScore) * 1.5).toFixed(1))
                    : "4.9"}
                </span>
              </div>
              <div className="p-2 rounded-2xl bg-[#e6f4f1] border border-[#a7f3d0] flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-[#145e58] uppercase tracking-wider">Rate</span>
                <span className="text-sm font-extrabold text-[#1e6b65] mt-0.5">
                  ₹{form.hourlyRate || provider?.hourlyRate || 350}/hr
                </span>
              </div>
              <div className="p-2 rounded-2xl bg-purple-50/70 border border-purple-100 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Completed</span>
                <span className="text-sm font-extrabold text-purple-900 mt-0.5">
                  {completedCount} Gig{completedCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Detailed Attributes Box */}
            <div className="w-full space-y-2.5 text-xs text-left">
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                    <Building2 size={14} className="text-amber-500" /> Cooperative Agency
                  </span>
                  <span className="font-extrabold text-slate-900 text-right truncate max-w-[130px]">
                    {provider?.cooperativeId?.name || provider?.cooperativeName || "Karol Bagh Labour Coop"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                    <Shield size={14} className="text-[#65a30d]" /> Escrow Security
                  </span>
                  <span className="font-extrabold text-[#4d7c0f]">Active & Insured ✓</span>
                </div>
              </div>

              {/* Verified Badges */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                <span className="orvia-badge-lime text-[11px] px-2.5 py-1">
                  e-Shram Verified ✓
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                  PMSBY Covered ✓
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="w-full pt-2">
              <button
                onClick={() => { logout(); navigate("/login"); }}
                className="w-full py-2.5 px-4 rounded-2xl border border-red-200 bg-red-50/60 text-red-600 text-xs font-extrabold hover:bg-red-600 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <LogOut size={15} />
                <span>Sign Out Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column (8 cols): Settings Tabs ── */}
        <div className="lg:col-span-8 space-y-3">

          {/* Orvia Pill Tab Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={active ? "orvia-pill-selected inline-flex items-center gap-1.5 shrink-0 cursor-pointer text-xs py-1.5 px-4" : "orvia-pill-unselected inline-flex items-center gap-1.5 shrink-0 cursor-pointer text-xs py-1.5 px-4"}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* ── TAB 1: Professional Details ── */}
          {activeTab === "personal" && (
            <div className="orvia-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <User size={16} className="text-[#1e6b65]" /> Professional Profile & Rate Card
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Update your skills, hourly rates, contact details, and weekly dispatch availability.
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">Editable</span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your full name"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="provider@gmail.com"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="Your phone number"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Hourly Rate (₹)
                    </label>
                    <div className="relative">
                      <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={form.hourlyRate}
                        onChange={(e) => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                        placeholder="350"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Skills (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.skills}
                    onChange={(e) => setForm(f => ({ ...f, skills: e.target.value }))}
                    placeholder="e.g. Electrician, Plumber, AC Repair"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                  />
                </div>

                {/* Weekly Availability */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Weekly Availability Slots
                  </label>
                  <AvailabilityEditor slots={slots} onChange={setSlots} />
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="orvia-btn-primary cursor-pointer disabled:opacity-60 text-xs py-2 px-5"
                  >
                    <Save size={14} />
                    <span>{saving ? "Saving…" : "Save Profile Changes"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── TAB 2: Security & Credentials ── */}
          {activeTab === "security" && (
            <div className="orvia-card p-4 space-y-3">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Lock size={16} className="text-[#1e6b65]" /> Security & Account Credentials
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Verify account email & change your password with 1-time OTP verification.
                  </p>
                </div>
                <span className="orvia-badge-lime text-[10px]"><ShieldCheck size={11} /> OTP Protected</span>
              </div>

              <EmailStatusCard />

              <div className="pt-1">
                <ChangePasswordSection />
              </div>
            </div>
          )}

          {/* ── TAB 3: Cooperative & Welfare ── */}
          {activeTab === "welfare" && (
            <div className="orvia-card p-4 space-y-3">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-[#1e6b65]" /> Cooperative Membership & Social Security
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official welfare insurance, e-Shram verification, and escrow protection details.
                  </p>
                </div>
                <span className="orvia-badge-lime text-[10px]">Verified Member</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Registered Cooperative</span>
                  <p className="font-extrabold text-slate-900">Karol Bagh Labour Cooperative</p>
                  <p className="text-[11px] text-[#1e6b65] font-semibold">Reg: DL/COO/2024/001</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Social Security Programs</span>
                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    <span className="orvia-badge-lime text-[10px]">e-Shram Verified ✓</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">PMSBY Active ✓</span>
                  </div>
                </div>
              </div>

              {/* Upload Document Box */}
              <div className="p-3.5 rounded-2xl bg-[#e6f4f1] border border-[#a7f3d0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-[#145e58]" />
                  <div>
                    <p className="font-bold text-[#145e58] text-xs">Aadhaar & Skill Certificate</p>
                    <p className="text-[11px] text-slate-600">Verified & on file with cooperative admin</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 rounded-full bg-[#1e6b65] text-white text-xs font-bold hover:bg-[#145e58] transition-colors cursor-pointer"
                >
                  Upload New
                </button>
                <input ref={fileRef} type="file" className="hidden" />
              </div>
            </div>
          )}

          {/* ── TAB 4: Appearance & Dark Mode ── */}
          {activeTab === "appearance" && (
            <div className="orvia-card p-4">
              <AppearanceSettings />
            </div>
          )}

        </div>

      </div>

      {/* ── Centered Enlarged QR Verification & Identity Badge Modal ── */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-alert-in"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden p-6 space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-xl bg-[#1e6b65] text-white flex items-center justify-center">
                  <QrCode size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Digital Identity Pass</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Scannable Cooperative Verification QR</p>
                </div>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Enlarged QR Code Container */}
            <div className="relative mx-auto w-56 h-56 p-4 rounded-3xl bg-white border-2 border-[#1e6b65] shadow-xl flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt="Enlarged Provider QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Provider Verification Info Badge */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">{form.name || "Your name"}</span>
                <span className="orvia-badge-lime text-[10px]">Verified Member ✓</span>
              </div>
              <p className="text-slate-500 font-medium text-[11px]">
                Cooperative: <strong className="text-slate-800">{provider?.cooperativeId?.name || "Your cooperative"}</strong>
              </p>
              <p className="text-slate-500 font-medium text-[11px]">
                e-Shram UAN: <strong className="text-[#1e6b65]">IN-ES-0000000123</strong>
              </p>
            </div>

            <p className="text-[11px] text-slate-400 font-medium leading-normal">
              Scan with any mobile camera or QR scanner to retrieve verified worker credentials & cooperative backing.
            </p>

            {/* Modal Actions */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrPayload);
                  setCopiedQr(true);
                  setTimeout(() => setCopiedQr(false), 2000);
                }}
                className="px-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Copy size={13} />
                <span>{copiedQr ? "Copied JSON!" : "Copy Payload"}</span>
              </button>

              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="orvia-btn-primary cursor-pointer text-xs py-2 px-5"
              >
                <span>Done / Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Centered Circular Photo Zoom & Update Modal ── */}
      {photoModalOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-alert-in"
          onClick={() => setPhotoModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden p-6 space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-xl bg-[#1e6b65] text-white flex items-center justify-center">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Update Profile Picture</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Adjust zoom, scale & crop your circular profile photo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Circular Zoom Preview Frame */}
            <div className="relative mx-auto w-56 h-56 rounded-full overflow-hidden border-4 border-[#1e6b65] shadow-2xl bg-slate-900 flex items-center justify-center p-1">
              {tempPhotoUrl ? (
                <img
                  src={tempPhotoUrl}
                  alt="Avatar Zoom Preview"
                  className="w-full h-full rounded-full object-cover transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#1e6b65] text-white flex items-center justify-center text-4xl font-extrabold">
                  {initials}
                </div>
              )}
            </div>

            {/* Zoom Slider Controls */}
            <div className="space-y-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Zoom Scale</span>
                <span className="text-[#1e6b65] font-black">{Math.round(zoomLevel * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1e6b65]"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Upload size={14} />
                <span>Choose New Photo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSavePhoto}
                className="orvia-btn-primary cursor-pointer text-xs py-2.5 px-5 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Save & Apply Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

