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
  MapPin, AlertCircle, Building2, Palette, LogOut, Phone, Mail, QrCode, Maximize2, Copy, X, ChevronDown
} from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function AvailabilityEditor({ slots, onChange }) {
  const toggle = (i) =>
    onChange(slots.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {slots.map((s, i) => (
          <button
            key={s.day}
            type="button"
            onClick={() => toggle(i)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              s.enabled
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-variant/60 bg-surface-container-low text-on-surface-variant/70 hover:bg-surface-container"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${s.enabled ? "bg-primary" : "bg-outline-variant"}`} />
            <span>{s.day}</span>
            <span className="text-[10px] opacity-80">{s.enabled ? `${s.from}-${s.to}` : "Off"}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-on-surface-variant/70 font-medium">
        Tap a day to toggle working hours. Active slots receive live job dispatches.
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
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);

  const [provider, setProvider]   = useState(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount]         = useState(0);
  const [form, setForm]           = useState({ name: "", email: "", phone: "", skills: "", hourlyRate: "", bio: "" });
  const [slots, setSlots]         = useState(() => DAYS.map((day) => ({ day, enabled: true, from: "09:00", to: "17:00" })));

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [avatarUrl, setAvatarUrl] = useState(() => {
    return localStorage.getItem("sg_provider_avatar") || null;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

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
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        setAvatarUrl(result);
        localStorage.setItem("sg_provider_avatar", result);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
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
  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];
  const CurrentTabIcon = currentTab.Icon;

  if (loading) return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-4 pb-6 space-y-4">
      <div className="animate-pulse space-y-4">
        <div className="h-20 rounded-2xl bg-surface-container" />
        <div className="h-64 rounded-2xl bg-surface-container" />
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-2 pb-10 space-y-4 text-on-surface">

      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={avatarRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        style={{ display: "none" }}
      />

      {/* ── 1. CLEAN PREMIUM HEADER & IDENTITY ROW (No Nested Clutter Boxes) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-outline-variant/60">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative group shrink-0">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-primary to-teal-500 shadow-md cursor-pointer"
              onClick={() => avatarRef.current?.click()}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-primary text-on-primary flex items-center justify-center text-lg font-black">
                  {initials}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:scale-105 transition cursor-pointer"
              title="Change Photo"
            >
              <Camera size={12} />
            </button>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-on-surface truncate">
                {form.name || "Provider Profile"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10.5px] font-bold">
                <ShieldCheck size={11} /> Verified Member
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium truncate mt-0.5">
              {form.skills || "Trade Specialist"} &middot; {completedCount} Jobs Settled &middot; ₹{form.hourlyRate || 350}/hr
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <QrCode size={13} className="text-primary" />
            <span>Digital Pass</span>
          </button>
          <button
            type="button"
            onClick={() => { logout(); navigate("/login"); }}
            className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── Save Success / Error Alert Banner ── */}
      {saveSuccess && (
        <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between shadow-2xs text-xs font-bold animate-alert-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span>Profile settings updated successfully!</span>
          </div>
        </div>
      )}
      {saveError && (
        <div className="rounded-xl p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs font-semibold shadow-2xs animate-alert-in">
          <AlertCircle size={15} className="text-rose-500 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* ── 2. CLEAN TOP TAB NAVIGATION (Dropdown on mobile, Segmented tabs on desktop) ── */}
      <div className="sm:hidden relative">
        <button
          type="button"
          onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface border border-outline-variant text-on-surface shadow-xs transition active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CurrentTabIcon size={16} strokeWidth={2.2} />
            </div>
            <span className="text-xs font-bold text-on-surface truncate">{currentTab.label}</span>
          </div>
          <div
            className={`w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center transition-all duration-300 ${
              tabDropdownOpen
                ? "bg-primary text-on-primary rotate-180 shadow-xs"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            <ChevronDown size={17} strokeWidth={2.5} />
          </div>
        </button>

        {/* Dropdown Menu Popup */}
        {tabDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setTabDropdownOpen(false)}
            />
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-outline-variant bg-surface shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              {TABS.map(({ id, label, Icon }) => {
                const isSelected = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveTab(id);
                      setTabDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary text-on-primary shadow-xs"
                        : "text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                        <Icon size={16} strokeWidth={2.2} />
                      </div>
                      <span className="truncate">{label}</span>
                    </div>
                    {isSelected && <CheckCircle2 size={16} className="text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Desktop Tabs */}
      <div className="hidden sm:flex items-center gap-2 border-b border-outline-variant/60 pb-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold py-2 px-4 rounded-xl transition-all ${
                active
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. CLEAN TAB CONTENT (Single clean container, no nested box clutter) ── */}
      <div className="rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6 shadow-2xs">

        {/* ── TAB 1: Professional Details ── */}
        {activeTab === "personal" && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-bold text-on-surface">Professional Details &amp; Rate Card</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Update your full name, contact information, service skills, and hourly wage.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="provider@gmail.com"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone number"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Hourly Rate (₹)
                </label>
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
                  <input
                    type="number"
                    value={form.hourlyRate}
                    onChange={(e) => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                    placeholder="350"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Skills &amp; Trades (Comma-separated)
              </label>
              <input
                type="text"
                value={form.skills}
                onChange={(e) => setForm(f => ({ ...f, skills: e.target.value }))}
                placeholder="e.g. Electrician, Plumber, AC Repair"
                className="w-full h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Availability */}
            <div className="space-y-1.5 pt-2 border-t border-outline-variant/60">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Weekly Availability Slots
              </label>
              <AvailabilityEditor slots={slots} onChange={setSlots} />
            </div>

            <div className="pt-3 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98 transition disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? "Saving…" : "Save Profile"}</span>
              </button>
            </div>
          </form>
        )}

        {/* ── TAB 2: Security & Credentials ── */}
        {activeTab === "security" && (
          <div className="space-y-4">
            <div className="border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-bold text-on-surface">Security &amp; Account Credentials</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Verify your account email and update your password with secure OTP authentication.
              </p>
            </div>
            <EmailStatusCard />
            <div className="pt-2 border-t border-outline-variant/60">
              <ChangePasswordSection />
            </div>
          </div>
        )}

        {/* ── TAB 3: Cooperative & Welfare ── */}
        {activeTab === "welfare" && (
          <div className="space-y-4">
            <div className="border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-bold text-on-surface">Cooperative Membership &amp; Social Welfare</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Verified affiliation with registered labour cooperatives and government welfare schemes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Affiliated Society</span>
                <p className="font-extrabold text-on-surface text-sm">{provider?.cooperativeId?.name || "Karol Bagh Labour Cooperative"}</p>
                <p className="text-[11px] text-primary font-semibold">Reg. DL/COO/2024/001</p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Social Security Schemes</span>
                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10.5px] font-bold">
                    e-Shram Verified ✓
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10.5px] font-bold">
                    PMSBY Active ✓
                  </span>
                </div>
              </div>
            </div>

            {/* Document on File */}
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={18} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-on-surface text-xs truncate">Aadhaar &amp; Skill Verification Certificate</p>
                  <p className="text-[11px] text-on-surface-variant truncate">On file with cooperative federation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-2xs shrink-0"
              >
                Update
              </button>
              <input ref={fileRef} type="file" className="hidden" />
            </div>
          </div>
        )}

        {/* ── TAB 4: Appearance & Theme ── */}
        {activeTab === "appearance" && (
          <div className="space-y-4">
            <div className="border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-bold text-on-surface">Appearance &amp; Theme</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Customize your visual theme mode and display contrast.
              </p>
            </div>
            <AppearanceSettings />
          </div>
        )}

      </div>

      {/* ── Centered Enlarged QR Verification Pass Modal ── */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-outline-variant bg-surface shadow-2xl p-6 space-y-4 text-center animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                  <QrCode size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface">Digital Identity Pass</h3>
                  <p className="text-[10.5px] text-on-surface-variant">Verified Member QR</p>
                </div>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mx-auto w-48 h-48 p-3 rounded-2xl bg-white border-2 border-primary shadow-md flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt="Verification QR"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant text-left space-y-1 text-xs">
              <p className="font-bold text-on-surface">{form.name || "Provider"}</p>
              <p className="text-[11px] text-on-surface-variant">{provider?.cooperativeId?.name || "Labour Cooperative"}</p>
            </div>

            <button
              onClick={() => setQrModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs cursor-pointer hover:opacity-90"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
