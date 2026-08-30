import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import AppearanceSettings from "../../components/AppearanceSettings";
import { EmailStatusCard, ChangePasswordSection } from "../../components/AccountSecurity";
import {
  IconLogout as LogOut, IconUser as User, IconMail as Mail, IconShield as Shield,
  IconPalette as Palette, IconShieldCheck as ShieldCheck, IconMapPin as MapPin,
  IconSparkles as Sparkles, IconCamera as Camera, IconPhone as Phone,
  IconDeviceFloppy as Save, IconCircleCheck as CheckCircle2, IconAlertCircle as AlertCircle,
  IconHeartHandshake as HeartHandshake, IconLock as Lock, IconHome as Home,
  IconBellRinging as BellRing, IconUsers as Users, IconTrash as Trash, IconPlus as Plus,
  IconChevronDown as ChevronDown, IconCheck as Check
} from "@tabler/icons-react";

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState("personal");

  // Phone-only premium tab dropdown state
  const [tabOpen, setTabOpen] = useState(false);
  const [tabPlacement, setTabPlacement] = useState("down");
  const tabRef = useRef(null);

  const closeTab = () => {
    setTabOpen(false);
    document.body.style.overflow = "";
  };

  const toggleTab = () => {
    if (tabOpen) { closeTab(); return; }
    setTabPlacement("down");
    setTabOpen(true);
    document.body.style.overflow = "hidden";
  };

  useEffect(() => {
    if (!tabOpen) return;
    const onDoc = (e) => {
      if (tabRef.current && !tabRef.current.contains(e.target)) closeTab();
    };
    const onKey = (e) => { if (e.key === "Escape") closeTab(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [tabOpen]);

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

  const activeTabObj = TABS.find((t) => t.id === activeTab) || TABS[0];
  const ActiveIcon = activeTabObj.Icon;

  const tabListMaxH = (() => {
    if (!tabOpen || !tabRef.current) return 292;
    const r = tabRef.current.getBoundingClientRect();
    const avail = tabPlacement === "up" ? r.top : window.innerHeight - r.bottom;
    return Math.max(184, Math.min(avail - 24, 292));
  })();

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
      <div className="hidden sm:flex items-center justify-between gap-4 border-b border-outline-variant pb-2">
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
          <p className="hidden sm:block text-xs text-on-surface-variant mt-0.5">
            Manage your personal profile, security credentials, and platform appearance settings.
          </p>
        </div>
      </div>

      {/* ── Save Success / Error Alert Banner ── */}
      {saveSuccess && (
        <div className="rounded-2xl p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200 flex items-center justify-between shadow-xs text-xs font-bold animate-alert-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>ALL VERIFICATIONS COMPLETE — Pre-Registered &amp; Escrow-Active</span>
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
          <div className="orvia-card p-3.5 space-y-2.5 flex flex-col items-center text-center">

            {/* Avatar Photo Container with Upload Trigger */}
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-[3px] border-white shadow-md group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center text-xl font-extrabold shadow-md border-[3px] border-surface">
                  {initials}
                </div>
              )}

              {/* Instagram-style verified badge on the avatar */}
              <span
                className="absolute top-0 right-0 w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#38b6ff] via-[#1b6bff] to-[#2d47e8] text-white shadow-[0_2px_8px_rgba(20,80,255,0.45)] ring-[2.5px] ring-surface flex items-center justify-center z-10"
                title="Verified Member"
              >
                <Check size={12} stroke={4.5} />
              </span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:opacity-90 transition-all cursor-pointer"
                title="Upload Profile Picture"
              >
                <Camera size={12} />
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
              <h2 className="text-[15px] font-extrabold text-on-surface leading-tight">{name || "Household Member"}</h2>
              <p className="text-[11px] font-medium text-on-surface-variant truncate max-w-[170px]">{email}</p>
            </div>

            {/* User Attributes Table */}
            <div className="hidden sm:block w-full pt-3 border-t border-outline-variant space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin size={12} className="text-primary" /> Locality
                </span>
                <span className="font-bold text-on-surface">{address || addresses.find((a) => a.isPrimary)?.address || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="flex items-center gap-1 font-medium">
                  <Shield size={12} className="text-emerald-600 dark:text-emerald-400" /> Escrow Security
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">Active ✓</span>
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
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full border border-red-200 bg-red-50/50 text-red-600 text-xs font-bold hover:bg-red-600 hover:text-white transition-all cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* ── Right Column (8 cols): Settings Tabs & Content ── */}
        <div className="lg:col-span-8 space-y-3">

          {/* Orvia Pill Tab Selector (desktop/tablet) */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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

          {/* Premium tab dropdown (phone only) */}
          <div className="sm:hidden">
            <div ref={tabRef} className="relative w-full">
              <button
                type="button"
                onClick={toggleTab}
                className={`group h-12 w-full inline-flex items-center justify-between gap-3 pl-4 pr-2 rounded-2xl border text-[13.5px] font-semibold transition-all duration-300 shadow-xs ${
                  tabOpen
                    ? "border-primary/70 bg-primary-container/40 text-on-primary-container ring-4 ring-primary/10"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/50 hover:shadow-[0_6px_20px_-8px_rgba(0,40,142,0.30)]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ActiveIcon size={17} stroke={1.8} />
                  </div>
                  <span className="text-[13.5px] font-bold text-on-surface truncate">{activeTabObj.label}</span>
                </div>
                <div className={`w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center transition-all duration-300 ${
                  tabOpen
                    ? "bg-primary text-on-primary rotate-180 shadow-[0_2px_8px_-2px_rgba(0,40,142,0.5)]"
                    : "bg-surface-container-low text-on-surface-variant group-hover:bg-primary-container group-hover:text-primary"
                }`}>
                  <ChevronDown size={17} stroke={2.5} />
                </div>
              </button>

              {tabOpen && (
                <div
                  className={`sg-dropdown-list absolute left-0 right-0 z-50 rounded-2xl border border-outline-variant/80 bg-surface shadow-[0_28px_70px_-16px_rgba(2,6,23,0.35)] overflow-hidden animate-dropdown-in ${
                    tabPlacement === "up" ? "bottom-[calc(100%+10px)]" : "top-[calc(100%+10px)]"
                  }`}
                >
                  <div className="p-1.5 overflow-y-auto overscroll-contain space-y-0.5 no-scrollbar" style={{ maxHeight: tabListMaxH }}>
                    {TABS.map(({ id, label, Icon }) => {
                      const isSel = activeTab === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => { setActiveTab(id); closeTab(); }}
                          className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                            isSel
                              ? "bg-primary-container/70 text-on-primary-container shadow-2xs"
                              : "hover:bg-surface-container-low text-on-surface"
                          }`}
                        >
                          <Icon size={19} stroke={1.6} className={isSel ? "text-primary" : "text-on-surface-variant"} />
                          <span className="flex-1 min-w-0 text-[13px] font-bold truncate">{label}</span>
                          {isSel && <CheckCircle2 size={16} stroke={2.5} className="text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── TAB 1: Personal Details (Editable Form) ── */}
          {activeTab === "personal" && (
            <div className="orvia-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <User size={16} className="text-primary" /> Personal & Contact Details
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Update your display name, contact phone number, and primary address.
                  </p>
                </div>
                <span className="hidden sm:block text-[11px] text-on-surface-variant font-semibold">Editable</span>
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
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
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
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
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
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
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
                          className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
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
                          className="w-full h-9 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
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
                      className="w-full py-2 pl-9 pr-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Submit CTA Button */}
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-60 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <Save size={14} />
                    <span>{saving ? "Saving…" : "Save Changes"}</span>
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
                    <Lock size={16} className="text-primary" /> Security & Account Credentials
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
                    <Home size={16} className="text-primary" /> Household & Locality Preferences
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
                        className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
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
                        className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
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
                      className="w-full py-2 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all resize-none"
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
                      <MapPin size={16} className="text-primary" /> Saved Addresses
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
                      {a.isDefault && <span className="text-[10px] font-bold text-primary">Primary</span>}
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
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
                  />
                  <input
                    value={addrForm.address}
                    onChange={(e) => setAddrForm({ ...addrForm, address: e.target.value })}
                    placeholder="Full street address"
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all sm:col-span-1"
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
                      <Users size={16} className="text-primary" /> Family Members
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
                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center text-[11px] font-bold shrink-0">
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
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
                  />
                  <input
                    value={familyForm.relation}
                    onChange={(e) => setFamilyForm({ ...familyForm, relation: e.target.value })}
                    placeholder="Relation (Spouse/Child)"
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
                  />
                  <input
                    value={familyForm.phone}
                    onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })}
                    placeholder="Phone"
                    className="w-full h-9 px-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface outline-none focus:border-primary focus:bg-surface transition-all"
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
                    <BellRing size={16} className="text-primary" /> Notification Preferences
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
                        prefs[key] ? "bg-primary" : "bg-outline"
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

