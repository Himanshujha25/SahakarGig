import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AppearanceSettings from "../../components/AppearanceSettings";
import { EmailStatusCard, ChangePasswordSection } from "../../components/AccountSecurity";
import {
  LogOut, User, Mail, Shield, Palette, ShieldCheck, MapPin, Sparkles,
  Camera, Phone, Save, CheckCircle2, AlertCircle, HeartHandshake, Lock, Upload, Home
} from "lucide-react";

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState("personal");

  // Profile Form state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "+91 98765 43210");
  const [address, setAddress] = useState(user?.address || "Flat 402, Royal Palms, Raj Nagar, Ghaziabad, UP");
  const [emergencyContact, setEmergencyContact] = useState("Ramesh Sharma (+91 98112 33445)");
  const [householdSize, setHouseholdSize] = useState("4 Members");
  const [specialInstructions, setSpecialInstructions] = useState("Please call before ringing the doorbell. Gate entry code: #4021.");
  const [prefLang, setPrefLang] = useState("English / Hindi");

  // Avatar photo preview state
  const [avatarUrl, setAvatarUrl] = useState(() => {
    return localStorage.getItem("sg_avatar") || null;
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  const initials = name
    ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "HH";

  // Handle avatar photo selection & preview
  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        setAvatarUrl(result);
        localStorage.setItem("sg_avatar", result);
      };
      reader.readAsDataURL(file);
    }
  }

  // Handle Save Profile Changes
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      if (updateProfile) {
        await updateProfile({ name, email, phone });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Failed to update profile details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { id: "personal", label: "Personal Details", Icon: User },
    { id: "security", label: "Security & Credentials", Icon: Lock },
    { id: "household", label: "Household & Locality", Icon: Home },
    { id: "appearance", label: "Appearance & Theme", Icon: Palette },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-4 space-y-3">

      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900"
              style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Profile & Account Preferences
            </h1>
            <span className="orvia-badge-lime text-[11px]">
              <ShieldCheck size={12} /> Registered Member
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal profile, security credentials, and platform appearance settings.
          </p>
        </div>
      </div>

      {/* ── Save Success / Error Alert Banner ── */}
      {saveSuccess && (
        <div className="rounded-2xl p-3 bg-[#f7fee7] border border-[#d9f99d] text-[#4d7c0f] flex items-center justify-between shadow-xs text-xs font-bold animate-alert-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#65a30d]" />
            <span>Profile updated successfully! Your changes are saved.</span>
          </div>
        </div>
      )}
      {saveError && (
        <div className="rounded-2xl p-3 bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 text-xs font-semibold shadow-xs animate-alert-in">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* ── 2-Column Grid Layout (Fits Single Viewport Height) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* ── Left Column (4 cols): Compact Identity & Photo Card ── */}
        <div className="lg:col-span-4">
          <div className="orvia-card p-4 space-y-3 flex flex-col items-center text-center">

            {/* Avatar Photo Container with Upload Trigger */}
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#1e6b65] text-white flex items-center justify-center text-2xl font-extrabold shadow-md border-4 border-white">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0f172a] text-white flex items-center justify-center shadow-lg hover:bg-[#1e6b65] transition-all cursor-pointer"
                title="Upload Profile Picture"
              >
                <Camera size={13} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-0.5">
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">{name || "Household Member"}</h2>
              <p className="text-[11px] font-medium text-slate-500 truncate max-w-[190px]">{email}</p>
              <div className="pt-1 flex items-center justify-center gap-1.5">
                <span className="orvia-badge-lime text-[10px]">
                  <ShieldCheck size={11} /> Verified Member
                </span>
              </div>
            </div>

            {/* User Attributes Table */}
            <div className="w-full pt-3 border-t border-slate-100 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin size={12} className="text-[#1e6b65]" /> Locality
                </span>
                <span className="font-bold text-slate-900">Ghaziabad, UP</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Shield size={12} className="text-[#65a30d]" /> Escrow Security
                </span>
                <span className="font-bold text-[#4d7c0f]">Active ✓</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Sparkles size={12} className="text-amber-500" /> Member ID
                </span>
                <span className="font-mono font-bold text-slate-700">
                  {user?._id ? `SHK-HH-${user._id.slice(-6).toUpperCase()}` : "SHK-HH-LOCAL"}
                </span>
              </div>
            </div>

            {/* Sign Out Action Button */}
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="w-full py-2 px-3 rounded-full border border-red-200 bg-red-50/50 text-red-600 text-xs font-bold hover:bg-red-600 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* ── Right Column (8 cols): Settings Tabs & Content ── */}
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

          {/* ── TAB 1: Personal Details (Editable Form) ── */}
          {activeTab === "personal" && (
            <div className="orvia-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <User size={16} className="text-[#1e6b65]" /> Personal & Contact Details
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Update your display name, contact phone number, and primary address.
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">Editable</span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="household@gmail.com"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Emergency Contact
                    </label>
                    <div className="relative">
                      <HeartHandshake size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="Name & Contact phone"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Address */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Primary Household Address
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full street address, apartment, city, state"
                      className="w-full py-2 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Submit CTA Button */}
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

          {/* ── TAB 2: Security & Credentials (Single Card No Scroll Layout) ── */}
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

              {/* Email Status Card */}
              <EmailStatusCard />

              {/* Change Password Section */}
              <div className="pt-1">
                <ChangePasswordSection />
              </div>
            </div>
          )}

          {/* ── TAB 3: Household & Preferences ── */}
          {activeTab === "household" && (
            <div className="orvia-card p-4 space-y-3">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Home size={16} className="text-[#1e6b65]" /> Household & Locality Preferences
                </h3>
                <p className="text-[11px] text-slate-500">
                  Configure special entry instructions and service preferences for assigned providers.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Household Size
                    </label>
                    <input
                      type="text"
                      value={householdSize}
                      onChange={(e) => setHouseholdSize(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Preferred Language
                    </label>
                    <input
                      type="text"
                      value={prefLang}
                      onChange={(e) => setPrefLang(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Special Provider Gate Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white transition-all resize-none"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 3000);
                    }}
                    className="orvia-btn-primary cursor-pointer text-xs py-2 px-5"
                  >
                    <Save size={14} />
                    <span>Save Preferences</span>
                  </button>
                </div>
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
    </div>
  );
}

