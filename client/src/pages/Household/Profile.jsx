import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import AppearanceSettings from "../../components/AppearanceSettings";
import { EmailStatusCard, ChangePasswordSection } from "../../components/AccountSecurity";
import {
  LogOut, User, Mail, Shield, Palette, ShieldCheck, MapPin, Sparkles,
  Camera, Phone, Save, CheckCircle2, AlertCircle, HeartHandshake, Lock, Upload, Home, BellRing,
  Users, Trash2, Plus, Clock
} from "lucide-react";

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState("personal");

  // Profile Form state — all real, persisted via /auth/me (no demo values).
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [prefLang, setPrefLang] = useState("");

  // Address book + family (real persisted records).
  const [addresses, setAddresses] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [addrForm, setAddrForm] = useState({ label: "Home", address: "" });
  const [familyForm, setFamilyForm] = useState({ name: "", relation: "Family", phone: "", age: "" });
  const [saveError2, setSaveError2] = useState("");

  // Notification preferences
  const [prefs, setPrefs] = useState({ inApp: true, email: true, promotional: true });
  const [prefsSaved, setPrefsSaved] = useState(false);

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
    api.get("/auth/me")
      .then((r) => {
        const d = r.data || {};
        if (d.notificationPrefs) setPrefs(d.notificationPrefs);
        if (d.phone) setPhone(d.phone);
        if (d.address) setAddress(d.address);
        if (d.emergencyContact) {
          setEcName(d.emergencyContact.name || "");
          setEcPhone(d.emergencyContact.phone || "");
        }
        if (d.householdSize) setHouseholdSize(String(d.householdSize));
        if (d.specialInstructions) setSpecialInstructions(d.specialInstructions);
        if (d.prefLang) setPrefLang(d.prefLang);
        if (Array.isArray(d.addresses)) setAddresses(d.addresses.map(a => ({ ...a, id: String(a._id || a.id || "") })));
        if (Array.isArray(d.familyMembers)) setFamilyMembers(d.familyMembers.map(f => ({ ...f, id: String(f._id || f.id || "") })));
      })
      .catch(() => {});
  }, [user]);

  // ── Real address book + family CRUD (endpoints on /auth/addresses & /auth/family) ──
  async function addAddress() {
    if (!addrForm.address.trim()) return;
    setSaveError2("");
    try {
      const r = await api.post("/auth/addresses", addrForm);
      setAddresses(r.data.addresses.map(a => ({ ...a, id: String(a._id || a.id || "") })));
      setAddrForm({ label: "Home", address: "" });
    } catch (err) {
      setSaveError2(err?.response?.data?.message || "Could not add address");
    }
  }
  async function patchAddress(id, updates) {
    try {
      const r = await api.patch(`/auth/addresses/${id}`, updates);
      setAddresses(r.data.addresses.map(a => ({ ...a, id: String(a._id || a.id || "") })));
    } catch (err) {
      setSaveError2(err?.response?.data?.message || "Could not update address");
    }
  }
  async function removeAddress(id) {
    try {
      const r = await api.delete(`/auth/addresses/${id}`);
      setAddresses(r.data.addresses.map(a => ({ ...a, id: String(a._id || a.id || "") })));
    } catch (err) {
      setSaveError2(err?.response?.data?.message || "Could not delete address");
    }
  }
  async function addFamily() {
    if (!familyForm.name.trim()) return;
    setSaveError2("");
    try {
      const r = await api.post("/auth/family", familyForm);
      setFamilyMembers(r.data.familyMembers.map(f => ({ ...f, id: String(f._id || f.id || "") })));
      setFamilyForm({ name: "", relation: "Family", phone: "", age: "" });
    } catch (err) {
      setSaveError2(err?.response?.data?.message || "Could not add family member");
    }
  }
  async function patchFamily(id, updates) {
    try {
      const r = await api.patch(`/auth/family/${id}`, updates);
      setFamilyMembers(r.data.familyMembers.map(f => ({ ...f, id: String(f._id || f.id || "") })));
    } catch (err) {
      setSaveError2(err?.response?.data?.message || "Could not update family member");
    }
  }
  async function removeFamily(id) {
    try {
      const r = await api.delete(`/auth/family/${id}`);
      setFamilyMembers(r.data.familyMembers.map(f => ({ ...f, id: String(f._id || f.id || "") })));
    } catch (err) {
      setSaveError2(err?.response?.data?.message || "Could not delete family member");
    }
  }

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

  // Handle Save Profile Changes — persists every real field in one go.
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    const payload = {
      name,
      email,
      phone,
      address,
      emergencyContact: { name: ecName, phone: ecPhone },
      householdSize: householdSize ? Number(householdSize) : undefined,
      specialInstructions,
      prefLang,
    };
    if (!payload.householdSize) delete payload.householdSize;

    try {
      if (updateProfile) {
        await updateProfile(payload);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Failed to update profile details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveHouseholdPrefs() {
    setSaveError2("");
    try {
      await updateProfile({
        householdSize: householdSize ? Number(householdSize) : undefined,
        specialInstructions,
        prefLang,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError2(err?.response?.data?.message || "Could not save household preferences");
    }
  }

  const TABS = [
    { id: "personal", label: "Personal Details", Icon: User },
    { id: "security", label: "Security & Credentials", Icon: Lock },
    { id: "household", label: "Household & Locality", Icon: Home },
    { id: "appearance", label: "Appearance & Theme", Icon: Palette },
    { id: "notifications", label: "Notifications", Icon: BellRing },
  ];

  function togglePref(key) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setPrefsSaved(false);
  }

  async function savePrefs() {
    try {
      await api.patch("/auth/me", { notificationPrefs: prefs });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to save notification preferences.");
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-4 space-y-3">

      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-outline-variant pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-on-surface"
              style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Profile & Account Preferences
            </h1>
            <span className="orvia-badge-lime text-[11px]">
              <ShieldCheck size={12} /> Registered Member
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
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
              <h2 className="text-base font-extrabold text-on-surface leading-tight">{name || "Household Member"}</h2>
              <p className="text-[11px] font-medium text-on-surface-variant truncate max-w-[190px]">{email}</p>
              <div className="pt-1 flex items-center justify-center gap-1.5">
                <span className="orvia-badge-lime text-[10px]">
                  <ShieldCheck size={11} /> Verified Member
                </span>
              </div>
            </div>

            {/* User Attributes Table */}
            <div className="w-full pt-3 border-t border-outline-variant space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin size={12} className="text-[#1e6b65]" /> Locality
                </span>
                <span className="font-bold text-on-surface">{address || addresses.find((a) => a.isPrimary)?.address || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="flex items-center gap-1 font-medium">
                  <Shield size={12} className="text-[#65a30d]" /> Escrow Security
                </span>
                <span className="font-bold text-[#4d7c0f]">Active ✓</span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="flex items-center gap-1 font-medium">
                  <Sparkles size={12} className="text-amber-500" /> Member ID
                </span>
                <span className="font-mono font-bold text-on-surface-variant">
                  {user?._id || user?.id ? `SHK-HH-${(user._id || user.id).toString().slice(-6).toUpperCase()}` : "SHK-HH-LOCAL"}
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
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <User size={16} className="text-[#1e6b65]" /> Personal & Contact Details
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Update your display name, contact phone number, and primary address.
                  </p>
                </div>
                <span className="text-[11px] text-on-surface-variant font-semibold">Editable</span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="household@gmail.com"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Emergency Contact Name
                      </label>
                      <div className="relative">
                        <HeartHandshake size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                        <input
                          type="text"
                          value={ecName}
                          onChange={(e) => setEcName(e.target.value)}
                          placeholder="Relative / neighbour name"
                          className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Emergency Contact Phone
                      </label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                        <input
                          type="tel"
                          value={ecPhone}
                          onChange={(e) => setEcPhone(e.target.value)}
                          placeholder="+91 …"
                          className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Address */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Primary Household Address
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-2.5 text-on-surface-variant" />
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full street address, apartment, city, state"
                      className="w-full py-2 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all resize-none"
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
              <div className="pb-2 border-b border-outline-variant flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <Lock size={16} className="text-[#1e6b65]" /> Security & Account Credentials
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
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

          {/* ── TAB 3: Household, Addresses & Family ── */}
          {activeTab === "household" && (
            <div className="space-y-3">
              <div className="orvia-card p-4 space-y-3">
                <div className="pb-2 border-b border-outline-variant">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <Home size={16} className="text-[#1e6b65]" /> Household & Locality Preferences
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Configure service preferences for assigned providers — saved to your real profile.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Household Size (members)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={householdSize}
                        onChange={(e) => setHouseholdSize(e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Preferred Language
                      </label>
                      <input
                        type="text"
                        value={prefLang}
                        onChange={(e) => setPrefLang(e.target.value)}
                        placeholder="e.g. Hindi"
                        className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Special Provider Gate Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Call before ringing the doorbell"
                      className="w-full py-2 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all resize-none"
                    />
                  </div>

                  {saveError2 && <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600"><AlertCircle size={12} /> {saveError2}</p>}

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={saveHouseholdPrefs}
                      className="orvia-btn-primary cursor-pointer text-xs py-2 px-5"
                    >
                      <Save size={14} />
                      <span>Save Preferences</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Address Book — real CRUD via /auth/addresses */}
              <div className="orvia-card p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-outline-variant">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                      <MapPin size={16} className="text-[#1e6b65]" /> Saved Addresses
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      Multiple verified addresses for your household use-cases.
                    </p>
                  </div>
                  <span className="orvia-badge-lime text-[10px]">{addresses.length} saved</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {addresses.map((a) => (
                    <div key={a.id} className="p-3 rounded-2xl border border-outline-variant bg-surface-container-low space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="orvia-badge-teal text-[10px]">
                          {a.label || "Home"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAddress(a.id)}
                          className="text-on-surface-variant hover:text-red-500 cursor-pointer"
                          title="Delete address"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-[11px] font-semibold text-on-surface-variant leading-relaxed">{a.address}</p>
                      {a.isDefault && <span className="text-[10px] font-bold text-[#1e6b65]">Primary</span>}
                    </div>
                  ))}
                  {addresses.length === 0 && (
                    <p className="text-[11px] text-on-surface-variant col-span-full">No saved addresses yet. Use the form below.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={addrForm.label}
                    onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                    placeholder="Label (Home/Office)"
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                  />
                  <input
                    value={addrForm.address}
                    onChange={(e) => setAddrForm({ ...addrForm, address: e.target.value })}
                    placeholder="Full street address"
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all sm:col-span-1"
                  />
                  <button type="button" onClick={addAddress} className="orvia-btn-outline cursor-pointer text-xs py-2 px-4">
                    <Plus size={14} /> Add Address
                  </button>
                </div>
              </div>

              {/* Family Members — real CRUD via /auth/family */}
              <div className="orvia-card p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-outline-variant">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                      <Users size={16} className="text-[#1e6b65]" /> Family Members
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      People who can request community services on this household account.
                    </p>
                  </div>
                  <span className="orvia-badge-lime text-[10px]">{familyMembers.length} members</span>
                </div>

                <div className="space-y-2">
                  {familyMembers.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 p-2.5 px-3 rounded-2xl border border-outline-variant bg-surface-container-low">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-[#1e6b65]/10 text-[#1e6b65] grid place-items-center text-[11px] font-bold shrink-0">
                          {f.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{f.name} <span className="font-semibold text-on-surface-variant">· {f.relation}</span></p>
                          <p className="text-[11px] text-on-surface-variant truncate">{f.phone}{f.age ? ` · ${f.age} yrs` : ""}{f.isPrimary ? " · Primary member" : ""}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFamily(f.id)}
                        className="text-on-surface-variant hover:text-red-500 cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {familyMembers.length === 0 && (
                    <p className="text-[11px] text-on-surface-variant">No family members added yet.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    value={familyForm.name}
                    onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                  />
                  <input
                    value={familyForm.relation}
                    onChange={(e) => setFamilyForm({ ...familyForm, relation: e.target.value })}
                    placeholder="Relation (Spouse/Child)"
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                  />
                  <input
                    value={familyForm.phone}
                    onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })}
                    placeholder="Phone"
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-[#1e6b65] focus:bg-surface transition-all"
                  />
                  <button type="button" onClick={addFamily} className="orvia-btn-outline cursor-pointer text-xs py-2 px-4">
                    <Plus size={14} /> Add Member
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

          {/* ── TAB 5: Notification Preferences ── */}
          {activeTab === "notifications" && (
            <div className="orvia-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <BellRing size={16} className="text-[#1e6b65]" /> Notification Preferences
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Choose which channels your booking & agency alerts arrive on.
                  </p>
                </div>
                {prefsSaved && (
                  <span className="orvia-badge-lime text-[11px]">
                    <CheckCircle2 size={12} /> Saved
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {[
                  { key: "inApp", title: "In-App Alerts", desc: "Real-time toasts & the bell icon while you're signed in." },
                  { key: "email", title: "Email Notifications", desc: "Booking confirmations, payments & OTPs by email." },
                  { key: "promotional", title: "Promotions & Updates", desc: "Cooperative offers, new features & community news." },
                ].map(({ key, title, desc }) => (
                  <div key={key}
                    className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-outline-variant bg-surface-container-low">
                    <div>
                      <p className="text-xs font-bold text-on-surface">{title}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">{desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs[key]}
                      onClick={() => togglePref(key)}
                      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors cursor-pointer ${
                        prefs[key] ? "bg-[#1e6b65]" : "bg-outline"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs[key] ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-1 flex justify-end">
                <button type="button" onClick={savePrefs} className="orvia-btn-primary cursor-pointer text-xs py-2 px-5">
                  <Save size={14} />
                  <span>Save Preferences</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

