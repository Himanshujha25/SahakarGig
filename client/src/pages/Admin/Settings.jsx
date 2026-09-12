import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { toast } from "../../lib/toast";
import CustomSelect from "../../components/CustomSelect";
import ConfirmModal from "../../components/ConfirmModal";
import {
  User, Lock, Bell, Building2, Save, CheckCircle2, Palette, ShieldCheck,
  Mail, Phone, Shield, Sparkles, AlertCircle, RefreshCw, Camera, Upload, Trash2,
  ChevronDown, LogOut, QrCode, X, Building, ShieldAlert, KeyRound, Globe, MapPin
} from "lucide-react";
import OtpModal from "../../components/OtpModal";
import { EmailStatusCard, ChangePasswordSection } from "../../components/AccountSecurity";
import AppearanceSettings from "../../components/AppearanceSettings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TABS = [
  { id: "profile",       label: "Admin Profile",           Icon: User },
  { id: "appearance",    label: "Appearance & Theme",      Icon: Palette },
  { id: "security",      label: "Security & Credentials",  Icon: Lock },
  { id: "notifications", label: "Alerts & Notifications",  Icon: Bell },
  { id: "cooperative",   label: "Cooperative Federation",  Icon: Building2 },
];

const inputCls = "h-10 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 text-xs font-semibold text-on-surface outline-none transition-all focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary/20 placeholder:text-on-surface-variant/50";

export default function Settings() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState("profile");
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [emailOtpOpen, setEmailOtpOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    avatarUrl: user?.avatarUrl || localStorage.getItem("sg_admin_avatar") || "",
    designation: user?.designation || "Cooperative Administrator & Secretary",
    location: user?.location || "Delhi NCR, India",
    language: user?.language || "English",
    timezone: user?.timezone || "Asia/Kolkata (IST)",
    contactPreference: user?.contactPreference || "Email",
    bio: user?.bio || "Managing verified cooperative workforce and local gig dispatches.",
  });

  const [notifs, setNotifs] = useState({ bookings: true, disputes: true, verifications: true, payments: false, weekly: true });
  const [coop, setCoop] = useState({
    name: "",
    address: "",
    regNumber: "",
    contactEmail: "",
    contactPhone: "",
    region: "",
    district: "",
    welfareFundAllocation: 10,
    commissionRate: 8,
    registrationDoc: null,
    logoUrl: "",
    stampUrl: "",
    signatureUrl: "",
    secretaryName: "",
  });

  useEffect(() => {
    api.get("/admin/cooperative").then(({ data }) => {
      if (data) {
        setCoop({
          name: data.name || "",
          regNumber: data.registrationId || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
          region: data.region || "",
          district: data.district || "",
          address: data.address || "",
          welfareFundAllocation: data.welfareFundAllocation || 10,
          commissionRate: data.commissionRate || 8,
          registrationDoc: data.registrationDoc,
          logoUrl: data.logoUrl || "",
          stampUrl: data.stampUrl || "",
          signatureUrl: data.signatureUrl || "",
          secretaryName: data.secretaryName || "",
        });
      }
    }).catch(() => {});
  }, []);

  function flash(msg = "Settings updated successfully!") {
    setSaved(true);
    setSaveErr("");
    toast.success(msg);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image size should be less than 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setProfile((p) => ({ ...p, avatarUrl: base64 }));
      try {
        localStorage.setItem("sg_admin_avatar", base64);
        localStorage.setItem("sg_avatar", base64);
        window.dispatchEvent(new Event("storage"));
        updateProfile({ avatarUrl: base64 });
      } catch {}
      flash("Profile photo updated successfully!");
    };
    reader.readAsDataURL(file);
  }

  async function saveCoop(e) {
    e.preventDefault();
    try {
      await api.patch("/admin/cooperative", {
        name: coop.name,
        contactEmail: coop.contactEmail,
        contactPhone: coop.contactPhone,
        region: coop.region,
        district: coop.district,
        address: coop.address,
        commissionRate: coop.commissionRate,
        welfareFundAllocation: coop.welfareFundAllocation,
        logoUrl: coop.logoUrl,
        stampUrl: coop.stampUrl,
        signatureUrl: coop.signatureUrl,
        secretaryName: coop.secretaryName,
      });
      flash("Cooperative Society details & official stamps saved successfully!");
    } catch {
      setSaveErr("Failed to save cooperative profile.");
      toast.error("Failed to save cooperative profile.");
    }
  }

  const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "", type: "info", isPrompt: false, onConfirm: () => {} });

  function handleUploadDoc() {
    const defaultDocUrl = coop.registrationDoc?.url || "https://sahakargig.gov.in/docs/coop-registration-certificate.pdf";
    setConfirmState({
      isOpen: true,
      title: "Attach Registration Document",
      message: "Enter the Registration Document URL or Cloud Storage Link:",
      type: "info",
      isPrompt: true,
      defaultValue: defaultDocUrl,
      promptPlaceholder: "https://...",
      confirmText: "Attach Document",
      onConfirm: async (url) => {
        if (!url) return;
        try {
          await api.post("/admin/cooperative/doc", {
            name: "Cooperative Registration Certificate",
            url,
          });
          setCoop(c => ({ ...c, registrationDoc: { name: "Cooperative Registration Certificate", url, uploadedAt: new Date() } }));
          flash("Registration certificate attached successfully!");
        } catch {
          setSaveErr("Failed to update registration certificate.");
          toast.error("Failed to update registration certificate.");
        }
      },
    });
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaved(false); setSaveErr("");
    if (!EMAIL_RE.test((profile.email || "").trim())) {
      return setSaveErr("Please enter a valid email address.");
    }
    try {
      if ((profile.email || "").trim().toLowerCase() !== (user?.email || "").toLowerCase()) {
        await api.post("/auth/send-otp", { email: profile.email.trim(), purpose: "change_email" });
        setEmailOtpOpen(true);
        return;
      }
      await updateProfile({ name: profile.name, phone: profile.phone });
      flash();
    } catch (e2) {
      setSaveErr(e2.response?.data?.message || "Could not update profile.");
    }
  }

  async function handleEmailOtp(code) {
    try {
      setEmailBusy(true);
      const u = await updateProfile({ name: profile.name, phone: profile.phone, email: profile.email.trim(), code });
      setEmailOtpOpen(false);
      setProfile(p => ({ ...p, email: u.email }));
      flash();
    } catch (e2) {
      throw e2;
    } finally { setEmailBusy(false); }
  }

  const currentTab = TABS.find((t) => t.id === tab) || TABS[0];
  const CurrentTabIcon = currentTab.Icon;

  const initials = (profile.name || user?.name || "CA")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "CA";

  return (
    <div className="space-y-4 sm:space-y-6 text-on-surface">
      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* ── 1. CLEAN PREMIUM HEADER & IDENTITY ROW (Identical to Gig Worker Profile) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-outline-variant/60">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative group shrink-0">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-primary to-teal-500 shadow-md cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
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
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:scale-105 transition cursor-pointer"
              title="Change Photo"
            >
              <Camera size={12} />
            </button>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-on-surface truncate">
                {profile.name || "Cooperative Admin"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10.5px] font-bold">
                <ShieldCheck size={11} /> Admin Console
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium truncate mt-0.5">
              {profile.designation} &middot; {coop.name || "Central Society Desk"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {profile.avatarUrl && (
            <button
              type="button"
              onClick={() => {
                setProfile((p) => ({ ...p, avatarUrl: "" }));
                localStorage.removeItem("sg_admin_avatar");
                localStorage.removeItem("sg_coop_avatar");
                window.dispatchEvent(new Event("storage"));
                try { updateProfile({ avatarUrl: "" }); } catch {}
                flash();
              }}
              className="px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
              title="Remove photo"
            >
              <Trash2 size={13} />
              <span>Remove Photo</span>
            </button>
          )}

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
      {saved && (
        <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between shadow-2xs text-xs font-bold animate-alert-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span>Settings saved successfully!</span>
          </div>
        </div>
      )}
      {saveErr && (
        <div className="rounded-xl p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs font-semibold shadow-2xs animate-alert-in">
          <AlertCircle size={15} className="text-rose-500 shrink-0" />
          <span>{saveErr}</span>
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
                const isSelected = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setTab(id);
                      setTabDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-on-primary shadow-xs"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Desktop Segmented Pill Tabs */}
      <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-2xl bg-surface-container-low border border-outline-variant/60">
        {TABS.map(({ id, label, Icon }) => {
          const isSelected = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? "bg-surface text-primary shadow-xs border border-outline-variant/40"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. SINGLE UNIFIED SETTINGS CONTAINER (No Nested Boxes) ── */}
      <div className="p-4 sm:p-6 rounded-3xl border border-outline-variant/60 bg-surface shadow-2xs">

        {/* ── TAB 1: Profile & Identity ── */}
        {tab === "profile" && (
          <form onSubmit={saveProfile} className="space-y-4 text-xs">
            <div className="border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-bold text-on-surface">Admin Profile &amp; Contact Details</h2>
              <p className="text-[11px] text-on-surface-variant">Update your administrator details, regional jurisdiction, and language.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Full Legal Name</label>
                <input
                  className={inputCls}
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Suresh Patel"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Email Address</label>
                <input
                  className={inputCls}
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  placeholder="admin@coop.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Official Phone Number</label>
                <input
                  className={inputCls}
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Official Designation / Title</label>
                <input
                  className={inputCls}
                  value={profile.designation}
                  onChange={(e) => setProfile((p) => ({ ...p, designation: e.target.value }))}
                  placeholder="e.g. Cooperative Administrator & Secretary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Office / Region Location</label>
                <input
                  className={inputCls}
                  value={profile.location}
                  onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. Karol Bagh, Central Delhi"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Preferred Platform Language</label>
                <CustomSelect
                  value={profile.language}
                  onChange={(e) => setProfile((p) => ({ ...p, language: e.target.value }))}
                  options={[
                    { value: "English", label: "English (Default)" },
                    { value: "Hindi", label: "हिंदी (Hindi)" },
                    { value: "Bengali", label: "বাংলা (Bengali)" },
                    { value: "Marathi", label: "मराठी (Marathi)" },
                    { value: "Tamil", label: "தமிழ் (Tamil)" },
                    { value: "Telugu", label: "తెలుగు (Telugu)" },
                    { value: "Gujarati", label: "ગુજરાતી (Gujarati)" },
                    { value: "Punjabi", label: "ਪੰਜਾਬੀ (Punjabi)" },
                  ]}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-on-surface-variant text-[11px]">Professional Bio</label>
              <textarea
                rows={3}
                className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-medium text-on-surface outline-none focus:border-primary resize-none"
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                placeholder="State your role and cooperative operations..."
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-outline-variant/60 flex-wrap gap-2">
              <p className="text-[10.5px] text-on-surface-variant">Changing email requires one-time OTP verification.</p>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Save size={13} />
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        )}

        {/* ── TAB 2: Appearance & Theme ── */}
        {tab === "appearance" && (
          <div className="space-y-4">
            <div className="border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-bold text-on-surface">Appearance &amp; Theme Engine</h2>
              <p className="text-[11px] text-on-surface-variant">Customize theme mode, primary brand colors, and contrast.</p>
            </div>
            <AppearanceSettings />
          </div>
        )}

        {/* ── TAB 3: Security & Credentials ── */}
        {tab === "security" && (
          <div className="space-y-5 text-xs">
            <div className="border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-bold text-on-surface">Security &amp; Credentials</h2>
              <p className="text-[11px] text-on-surface-variant">Manage your master password and device sessions.</p>
            </div>

            <ChangePasswordSection onSaved={flash} />

            <div className="space-y-2 pt-2 border-t border-outline-variant/60">
              <h3 className="font-bold text-on-surface text-xs">Active Signed-in Sessions</h3>
              <div className="space-y-2">
                {[{ device: "Chrome · Windows", location: "Nagpur, IN", current: true }, { device: "Mobile App · Android", location: "Nagpur, IN", current: false }].map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-outline-variant/60 bg-surface-container-low text-xs">
                    <div>
                      <p className="font-bold text-on-surface">{s.device}</p>
                      <p className="text-[10.5px] text-on-surface-variant">{s.location}</p>
                    </div>
                    {s.current ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        Current Session
                      </span>
                    ) : (
                      <button type="button" className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: Alerts & Notifications ── */}
        {tab === "notifications" && (
          <div className="space-y-4 text-xs">
            <div className="border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-bold text-on-surface">Alerts &amp; Notifications</h2>
              <p className="text-[11px] text-on-surface-variant">Configure real-time dispatch alerts and activity digests.</p>
            </div>

            <div className="space-y-1 divide-y divide-outline-variant/40">
              {[
                { key: "bookings",      label: "New Booking Dispatches", desc: "When a household books a cooperative member" },
                { key: "disputes",      label: "Disputes & Escalations", desc: "When a customer or worker raises a nodal dispute" },
                { key: "verifications", label: "Worker Verification Submissions", desc: "When a provider submits documents for KYC review" },
                { key: "payments",      label: "Payment Settlements", desc: "When escrow milestones are captured or released" },
                { key: "weekly",        label: "Weekly Federation Digest", desc: "Weekly revenue, commission split, and growth summary" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-bold text-on-surface">{label}</p>
                    <p className="text-[10.5px] text-on-surface-variant">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                    className={`relative w-10 h-5 rounded-full transition-all duration-200 shrink-0 cursor-pointer ${
                      notifs[key] ? "bg-primary" : "bg-outline-variant"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                      notifs[key] ? "left-[22px]" : "left-0.5"
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end border-t border-outline-variant/60">
              <button
                type="button"
                onClick={flash}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 transition cursor-pointer shadow-2xs"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 5: Cooperative Federation Details ── */}
        {tab === "cooperative" && (
          <form onSubmit={saveCoop} className="space-y-4 text-xs">
            <div className="border-b border-outline-variant/60 pb-3">
              <h2 className="text-sm font-bold text-on-surface">Cooperative Federation Information</h2>
              <p className="text-[11px] text-on-surface-variant">Statutory details, commission rates, and registration certificates.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Cooperative Name</label>
                <input
                  className={inputCls}
                  value={coop.name}
                  onChange={e => setCoop(c => ({ ...c, name: e.target.value }))}
                  placeholder="e.g. Karol Bagh Labour Cooperative"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Registration Number / UAN</label>
                <input
                  className={inputCls}
                  value={coop.regNumber}
                  readOnly
                  placeholder="e.g. DL-COOP-2026-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Contact Email</label>
                <input
                  className={inputCls}
                  type="email"
                  value={coop.contactEmail}
                  onChange={e => setCoop(c => ({ ...c, contactEmail: e.target.value }))}
                  placeholder="contact@coop.com"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Contact Phone</label>
                <input
                  className={inputCls}
                  type="tel"
                  value={coop.contactPhone}
                  onChange={e => setCoop(c => ({ ...c, contactPhone: e.target.value }))}
                  placeholder="+91 9811000004"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">Operational Region / State</label>
                <input
                  className={inputCls}
                  value={coop.region}
                  onChange={e => setCoop(c => ({ ...c, region: e.target.value }))}
                  placeholder="Delhi NCR"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant text-[11px]">District</label>
                <input
                  className={inputCls}
                  value={coop.district}
                  onChange={e => setCoop(c => ({ ...c, district: e.target.value }))}
                  placeholder="Central Delhi"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-on-surface-variant text-[11px]">Secretary / Authorized Signatory Name</label>
              <input
                className={inputCls}
                value={coop.secretaryName}
                onChange={e => setCoop(c => ({ ...c, secretaryName: e.target.value }))}
                placeholder="e.g. R. K. Sharma"
              />
            </div>

            {/* STAMP & SIGNATURE UPLOAD CARD */}
            <div className="p-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low space-y-3.5">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Cooperative Official Stamp, Signature &amp; Logo</h3>
              <p className="text-[11px] text-on-surface-variant">These assets dynamically render on all invoices generated for gig workers belonging to your cooperative society.</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Stamp */}
                <div className="space-y-1.5">
                  <label className="font-bold text-on-surface text-[11px]">PACS Official Stamp Image</label>
                  <input
                    className={inputCls}
                    value={coop.stampUrl}
                    onChange={e => setCoop(c => ({ ...c, stampUrl: e.target.value }))}
                    placeholder="URL or Upload"
                  />
                  <label className="block text-center px-3 py-1.5 rounded-xl border border-outline-variant bg-surface text-primary text-[11px] font-bold cursor-pointer hover:bg-surface-container">
                    Upload Stamp Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setCoop(c => ({ ...c, stampUrl: ev.target.result }));
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {coop.stampUrl && (
                    <div className="mt-1 flex justify-center">
                      <img src={coop.stampUrl} alt="Stamp Preview" className="max-h-12 max-w-full object-contain border rounded-lg p-1 bg-white" />
                    </div>
                  )}
                </div>

                {/* Signature */}
                <div className="space-y-1.5">
                  <label className="font-bold text-on-surface text-[11px]">Authorized Signature Image</label>
                  <input
                    className={inputCls}
                    value={coop.signatureUrl}
                    onChange={e => setCoop(c => ({ ...c, signatureUrl: e.target.value }))}
                    placeholder="URL or Upload"
                  />
                  <label className="block text-center px-3 py-1.5 rounded-xl border border-outline-variant bg-surface text-primary text-[11px] font-bold cursor-pointer hover:bg-surface-container">
                    Upload Signature Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setCoop(c => ({ ...c, signatureUrl: ev.target.result }));
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {coop.signatureUrl && (
                    <div className="mt-1 flex justify-center">
                      <img src={coop.signatureUrl} alt="Signature Preview" className="max-h-12 max-w-full object-contain border rounded-lg p-1 bg-white" />
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="space-y-1.5">
                  <label className="font-bold text-on-surface text-[11px]">Cooperative Logo</label>
                  <input
                    className={inputCls}
                    value={coop.logoUrl}
                    onChange={e => setCoop(c => ({ ...c, logoUrl: e.target.value }))}
                    placeholder="URL or Upload"
                  />
                  <label className="block text-center px-3 py-1.5 rounded-xl border border-outline-variant bg-surface text-primary text-[11px] font-bold cursor-pointer hover:bg-surface-container">
                    Upload Logo Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setCoop(c => ({ ...c, logoUrl: ev.target.result }));
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {coop.logoUrl && (
                    <div className="mt-1 flex justify-center">
                      <img src={coop.logoUrl} alt="Logo Preview" className="max-h-12 max-w-full object-contain border rounded-lg p-1 bg-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Registration Certificate Card */}
            <div className="p-3.5 rounded-2xl border border-outline-variant/60 bg-surface-container-low flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <Building2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{coop.registrationDoc?.name || "Cooperative Registration Certificate"}</h4>
                  <p className="text-[10.5px] text-on-surface-variant">Status: {coop.registrationDoc ? "Verified & Active ✓" : "Pending Upload"}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {coop.registrationDoc?.url && (
                  <a
                    href={coop.registrationDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-primary hover:bg-surface-container"
                  >
                    View Document
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleUploadDoc}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 cursor-pointer shadow-2xs"
                >
                  {coop.registrationDoc ? "Re-upload" : "Upload Document"}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-outline-variant/60">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 transition cursor-pointer shadow-2xs"
              >
                Save Cooperative Details &amp; Stamps
              </button>
            </div>
          </form>
        )}
      </div>

      {/* OTP Modal */}
      <OtpModal
        open={emailOtpOpen}
        onClose={() => setEmailOtpOpen(false)}
        title="Confirm your new email"
        subtitle={<>We've sent a 6-digit code to <span className="font-semibold text-on-surface">{profile.email}</span>. Enter it to finish updating your profile.</>}
        email={profile.email.trim()}
        purpose="change_email"
        ctaLabel="Update Email"
        onVerify={handleEmailOtp}
      />

      <ConfirmModal
        {...confirmState}
        onClose={() => setConfirmState((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
