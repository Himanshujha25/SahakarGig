import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { toast } from "../../lib/toast";
import CustomSelect from "../../components/CustomSelect";
import ConfirmModal from "../../components/ConfirmModal";
import {
  User, Lock, Bell, Building2, Save, CheckCircle2, Palette, ShieldCheck,
  Mail, Phone, Shield, Sparkles, AlertCircle, RefreshCw, IndianRupee, Percent,
  Camera, Upload, Trash2, Globe, MapPin, Briefcase, Clock, MessageSquare, Image,
  Plus, Search, CreditCard, Check, ChevronDown, Layers, BadgeCheck, X, Copy,
  LogOut, Landmark
} from "lucide-react";
import OtpModal from "../../components/OtpModal";
import { ChangePasswordSection } from "../../components/AccountSecurity";
import AppearanceSettings from "../../components/AppearanceSettings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const POPULAR_BANKS = [
  { id: 'sbi', name: 'State Bank of India (SBI)', ifscPrefix: 'SBIN000', tag: 'PSU Escrow' },
  { id: 'hdfc', name: 'HDFC Bank', ifscPrefix: 'HDFC000', tag: 'Private' },
  { id: 'icici', name: 'ICICI Bank', ifscPrefix: 'ICIC000', tag: 'Private' },
  { id: 'pnb', name: 'Punjab National Bank (PNB)', ifscPrefix: 'PUNB000', tag: 'PSU' },
  { id: 'bob', name: 'Bank of Baroda', ifscPrefix: 'BARB000', tag: 'PSU' },
  { id: 'axis', name: 'Axis Bank', ifscPrefix: 'UTIB000', tag: 'Private' },
  { id: 'dscb', name: 'Delhi State Cooperative Bank', ifscPrefix: 'DSCB000', tag: 'State Cooperative' },
  { id: 'ncdc', name: 'National Cooperative Development Corp', ifscPrefix: 'NCDC000', tag: 'Apex Body' },
];

const TABS = [
  { id: "profile",       label: "Profile & Identity",      Icon: User },
  { id: "federation",    label: "Jurisdiction & Rates",    Icon: Building2 },
  { id: "escrow",        label: "Escrow & Bank Gateways",  Icon: Landmark },
  { id: "notifications", label: "Alerts & Notifications",  Icon: Bell },
  { id: "appearance",    label: "Appearance & Theme",      Icon: Palette },
  { id: "security",      label: "Security & Passwords",    Icon: Lock },
];

const inputCls = "h-10 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 text-xs font-semibold text-on-surface outline-none transition-all focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary/20 placeholder:text-on-surface-variant/50";

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

export default function FederationSettings() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState("profile");
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [profile, setProfile] = useState({
    name: user?.name || "Neeta Joshi",
    email: user?.email || "federation.test@gmail.com",
    phone: user?.phone || "+91 9811000004",
    avatarUrl: user?.avatarUrl || localStorage.getItem("sg_fed_avatar") || "",
    bio: user?.bio || "Apex Federation Administrator overseeing NCR multi-state labour cooperative societies.",
    designation: user?.designation || "Federation Apex Admin",
    location: user?.location || "Delhi Secretariat, New Delhi",
    timezone: user?.timezone || "Asia/Kolkata (IST)",
    language: user?.language || "English",
    contactPreference: user?.contactPreference || "Email",
  });

  const [fedData, setFedData] = useState({
    name: "Delhi State Labour Cooperatives Federation",
    registrationId: "FED-DL-2026-001",
    region: "National Capital Region (Delhi NCR)",
    commissionRate: 2,
    welfareFundAllocation: 10,
    tdsRate: 1,
  });

  const [notifs, setNotifs] = useState({ bookings: true, disputes: true, verifications: true, payments: true, weekly: true });
  const [emailOtpOpen, setEmailOtpOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  // Bank Accounts Management State
  const [bankAccounts, setBankAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem("sg_fed_bank_accounts");
      return stored
        ? JSON.parse(stored)
        : [
            {
              id: "bank_1",
              bankName: "State Bank of India (Escrow Federation Branch)",
              accountNumber: "110293847561",
              accountHolder: "Delhi State Labour Federation Escrow Pool",
              ifsc: "SBIN0001894",
              upi: "sahakar.federation@sbi",
              accountType: "Escrow Settlement Gateway",
              isPrimary: true,
            },
            {
              id: "bank_2",
              bankName: "Delhi State Cooperative Bank",
              accountNumber: "998822334411",
              accountHolder: "Sahakar Social Security & Welfare Reserve",
              ifsc: "DSCB0002104",
              upi: "sahakar.welfare@dscb",
              accountType: "Welfare Reserve Pool",
              isPrimary: false,
            },
          ];
    } catch {
      return [];
    }
  });

  const [addBankModal, setAddBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [newBank, setNewBank] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    upi: "",
    accountType: "Escrow Settlement Gateway",
    isPrimary: false,
  });

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        avatarUrl: user.avatarUrl || localStorage.getItem("sg_fed_avatar") || prev.avatarUrl,
        bio: user.bio || prev.bio,
        designation: user.designation || prev.designation,
        location: user.location || prev.location,
        timezone: user.timezone || prev.timezone,
        language: user.language || prev.language,
        contactPreference: user.contactPreference || prev.contactPreference,
      }));
    }
  }, [user]);

  useEffect(() => {
    api.get("/federation/dashboard").then(({ data }) => {
      if (data) {
        setFedData({
          name: data.federationName || "Delhi State Labour Cooperatives Federation",
          registrationId: data.registrationId || "FED-DL-2026-001",
          region: data.region || "National Capital Region (Delhi NCR)",
          commissionRate: data.commissionRate || 2,
          welfareFundAllocation: data.welfareFundAllocation || 10,
          tdsRate: data.tdsRate || 1,
        });
      }
    }).catch(() => {});
  }, []);

  function flash() { setSaved(true); setSaveErr(""); setTimeout(() => setSaved(false), 2500); }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.warning("Image size should be less than 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setProfile((p) => ({ ...p, avatarUrl: base64 }));
      try {
        localStorage.setItem("sg_fed_avatar", base64);
        localStorage.setItem("sg_avatar", base64);
        window.dispatchEvent(new Event("storage"));
        updateProfile({ avatarUrl: base64 });
      } catch {}
      flash();
    };
    reader.readAsDataURL(file);
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
      await updateProfile({
        name: profile.name,
        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        designation: profile.designation,
        location: profile.location,
        timezone: profile.timezone,
        language: profile.language,
        contactPreference: profile.contactPreference,
      });
      flash();
    } catch (e2) {
      setSaveErr(e2.response?.data?.message || "Could not update profile.");
    }
  }

  async function handleEmailOtp(code) {
    try {
      setEmailBusy(true);
      const u = await updateProfile({
        name: profile.name,
        phone: profile.phone,
        email: profile.email.trim(),
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        designation: profile.designation,
        location: profile.location,
        timezone: profile.timezone,
        language: profile.language,
        contactPreference: profile.contactPreference,
        code,
      });
      setEmailOtpOpen(false);
      setProfile((p) => ({ ...p, email: u.email }));
      flash();
    } catch (e2) {
      throw e2;
    } finally { setEmailBusy(false); }
  }

  async function saveFedSettings(e) {
    e.preventDefault();
    try {
      await api.patch("/federation/finance/settings", {
        defaultCommissionRate: Number(fedData.commissionRate),
        welfareFundAllocation: Number(fedData.welfareFundAllocation),
        tdsRate: Number(fedData.tdsRate),
      });
      flash();
    } catch {
      setSaveErr("Failed to update federation settings.");
    }
  }

  function handleAddBank(e) {
    e.preventDefault();
    if (newBank.accountNumber !== newBank.confirmAccountNumber) {
      toast.warning("Account numbers do not match!");
      return;
    }
    const bankItem = {
      id: "bank_" + Date.now(),
      bankName: newBank.bankName,
      accountHolder: newBank.accountHolder,
      accountNumber: newBank.accountNumber,
      ifsc: newBank.ifsc.toUpperCase(),
      upi: newBank.upi,
      accountType: newBank.accountType,
      isPrimary: bankAccounts.length === 0 || newBank.isPrimary,
    };
    let updated = [...bankAccounts];
    if (bankItem.isPrimary) {
      updated = updated.map((b) => ({ ...b, isPrimary: false }));
    }
    updated.push(bankItem);
    setBankAccounts(updated);
    localStorage.setItem("sg_fed_bank_accounts", JSON.stringify(updated));
    setAddBankModal(false);
    setNewBank({
      bankName: "",
      accountHolder: "",
      accountNumber: "",
      confirmAccountNumber: "",
      ifsc: "",
      upi: "",
      accountType: "Escrow Settlement Gateway",
      isPrimary: false,
    });
    flash();
  }

  function handleSetPrimaryBank(id) {
    const updated = bankAccounts.map((b) => ({
      ...b,
      isPrimary: b.id === id,
    }));
    setBankAccounts(updated);
    localStorage.setItem("sg_fed_bank_accounts", JSON.stringify(updated));
    flash();
  }

  const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "", type: "danger", onConfirm: () => {} });

  function handleDeleteBank(id) {
    setConfirmState({
      isOpen: true,
      title: "Remove Bank Gateway?",
      message: "Are you sure you want to remove this bank gateway from federation records?",
      type: "danger",
      confirmText: "Remove",
      onConfirm: () => {
        const updated = bankAccounts.filter((b) => b.id !== id);
        if (updated.length > 0 && !updated.some((b) => b.isPrimary)) {
          updated[0].isPrimary = true;
        }
        setBankAccounts(updated);
        localStorage.setItem("sg_fed_bank_accounts", JSON.stringify(updated));
        flash();
      },
    });
  }

  const currentTab = TABS.find((t) => t.id === tab) || TABS[0];
  const CurrentTabIcon = currentTab.Icon;

  const initials = (profile.name || user?.name || "FA")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "FA";

  const filteredBankSuggestions = POPULAR_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.tag.toLowerCase().includes(bankSearch.toLowerCase())
  );

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

      {/* ── 1. CLEAN IDENTITY ROW (Identical to Admin & Provider Profile) ── */}
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
                {profile.name || "Federation Administrator"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10.5px] font-bold">
                <ShieldCheck size={11} /> Apex Console
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium truncate mt-0.5">
              {profile.designation} &middot; {fedData.name}
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
                localStorage.removeItem("sg_fed_avatar");
                localStorage.removeItem("sg_avatar");
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

      {/* ── 2. TAB NAVIGATION (Dropdown on mobile, Segmented tabs on desktop) ── */}
      <div className="sm:hidden relative">
        <button
          type="button"
          onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface border border-outline-variant text-on-surface shadow-xs transition active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <CurrentTabIcon size={16} />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Active Section</p>
              <p className="text-xs font-bold text-on-surface">{currentTab.label}</p>
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`text-on-surface-variant transition-transform duration-200 ${
              tabDropdownOpen ? "rotate-180 text-primary" : ""
            }`}
          />
        </button>

        {tabDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-surface border border-outline-variant rounded-2xl shadow-xl z-30 space-y-1 animate-dropdown">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setTabDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  tab === id
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Segmented Pills for Desktop (>= 640px) */}
      <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-2xl bg-surface-container-low border border-outline-variant/60 overflow-x-auto">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              tab === id
                ? "bg-surface text-primary shadow-xs border border-outline-variant/60"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── 3. TAB CONTENT PANELS (Unified Clean Containers) ── */}

      {/* TAB 1: Profile & Identity */}
      {tab === "profile" && (
        <form onSubmit={saveProfile} className="p-4 sm:p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-4 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Personal Information &amp; Official Profile</h2>
            <p className="text-xs text-on-surface-variant">Update contact details, secretariat designation, and authority bio.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Full Legal Name">
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={inputCls}
                required
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className={inputCls}
                required
              />
            </Field>

            <Field label="Contact Phone">
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Official Designation">
              <input
                type="text"
                value={profile.designation}
                onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Secretariat Location">
              <input
                type="text"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Preferred Language">
              <CustomSelect
                value={profile.language}
                onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                options={[
                  { value: "English", label: "English" },
                  { value: "Hindi", label: "हिंदी (Hindi)" },
                  { value: "Punjabi", label: "ਪੰਜਾਬੀ (Punjabi)" },
                ]}
              />
            </Field>
          </div>

          <Field label="Authority Bio &amp; Role Summary">
            <textarea
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs text-on-surface outline-none focus:border-primary"
            />
          </Field>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-2xs hover:opacity-90 transition active:scale-98 cursor-pointer flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Jurisdiction & Rates */}
      {tab === "federation" && (
        <form onSubmit={saveFedSettings} className="p-4 sm:p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-4 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Apex Jurisdiction &amp; Statutory Rates</h2>
            <p className="text-xs text-on-surface-variant">Federation registration details and default commission / welfare allocations.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Federation Name">
              <input
                type="text"
                value={fedData.name}
                onChange={(e) => setFedData({ ...fedData, name: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Registration Number">
              <input
                type="text"
                value={fedData.registrationId}
                disabled
                className={`${inputCls} opacity-70 cursor-not-allowed`}
              />
            </Field>

            <Field label="Jurisdiction Region">
              <input
                type="text"
                value={fedData.region}
                onChange={(e) => setFedData({ ...fedData, region: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Default Commission Rate (%)">
              <input
                type="number"
                step="0.1"
                value={fedData.commissionRate}
                onChange={(e) => setFedData({ ...fedData, commissionRate: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Welfare Fund Pool (%)">
              <input
                type="number"
                step="0.5"
                value={fedData.welfareFundAllocation}
                onChange={(e) => setFedData({ ...fedData, welfareFundAllocation: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="TDS Statutory Rate u/s 194O (%)">
              <input
                type="number"
                step="0.1"
                value={fedData.tdsRate}
                onChange={(e) => setFedData({ ...fedData, tdsRate: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-2xs hover:opacity-90 transition active:scale-98 cursor-pointer flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>Update Rates</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Escrow & Bank Gateways */}
      {tab === "escrow" && (
        <div className="p-4 sm:p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-4 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-on-surface">Escrow Bank Accounts &amp; Payout Gateways</h2>
              <p className="text-xs text-on-surface-variant">Linked nodal escrow accounts for customer payments, cooperative commissions, and worker disbursements.</p>
            </div>
            <button
              type="button"
              onClick={() => setAddBankModal(true)}
              className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer hover:opacity-90 active:scale-98"
            >
              <Plus size={14} />
              <span>Add Bank Gateway</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bankAccounts.map((b) => (
              <div
                key={b.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  b.isPrimary
                    ? "border-primary bg-primary/5 shadow-2xs"
                    : "border-outline-variant/60 bg-surface-container-low"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${b.isPrimary ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface"}`}>
                      <Landmark size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">{b.bankName}</h4>
                      <span className="text-[10px] text-on-surface-variant font-medium">{b.accountType}</span>
                    </div>
                  </div>
                  {b.isPrimary && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold border border-primary/30">
                      Primary Gateway
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-surface border border-outline-variant/40 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-on-surface-variant font-semibold uppercase">A/C Number</span>
                    <p className="font-mono font-bold text-on-surface text-xs mt-0.5">•••• {b.accountNumber.slice(-4)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant font-semibold uppercase">IFSC Code</span>
                    <p className="font-mono font-bold text-on-surface text-xs mt-0.5">{b.ifsc}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-on-surface-variant font-medium">UPI: {b.upi}</span>
                  <div className="flex items-center gap-2">
                    {!b.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryBank(b.id)}
                        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteBank(b.id)}
                      className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Alerts & Notifications */}
      {tab === "notifications" && (
        <div className="p-4 sm:p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-4 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Alerts &amp; Real-time Notifications</h2>
            <p className="text-xs text-on-surface-variant">Configure automated notifications for dispute escalations, verifications, and batch payouts.</p>
          </div>

          <div className="space-y-2.5">
            {[
              { id: "disputes", label: "Dispute Escalations", desc: "Notify immediately when an arbitration ticket is escalated to federation tribunal." },
              { id: "verifications", label: "Worker Verification Audits", desc: "Receive alerts for new gig worker KYC submissions." },
              { id: "payments", label: "Treasury & Escrow Payouts", desc: "Daily summary of released bookings and batch payout disbursements." },
              { id: "weekly", label: "Weekly Operational Digest", desc: "Comprehensive KPI digest delivered every Monday morning." },
            ].map(({ id, label, desc }) => (
              <label
                key={id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
              >
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{label}</h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifs[id]}
                  onChange={(e) => {
                    setNotifs({ ...notifs, [id]: e.target.checked });
                    flash();
                  }}
                  className="rounded text-primary h-4 w-4"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Appearance & Theme */}
      {tab === "appearance" && (
        <div className="p-4 sm:p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-4 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Appearance &amp; Theme Customization</h2>
            <p className="text-xs text-on-surface-variant">Switch between Light, Dark, and High Contrast mode.</p>
          </div>
          <AppearanceSettings />
        </div>
      )}

      {/* TAB 6: Security & Credentials */}
      {tab === "security" && (
        <div className="p-4 sm:p-6 rounded-2xl border border-outline-variant/60 bg-surface space-y-4 shadow-2xs">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Security &amp; Account Credentials</h2>
            <p className="text-xs text-on-surface-variant">Change your federation admin login password and manage two-factor authentication.</p>
          </div>
          <ChangePasswordSection />
        </div>
      )}

      {/* ── Add Bank Modal ── */}
      {addBankModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setAddBankModal(false)}>
          <div className="w-full max-w-lg bg-surface border border-outline-variant rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <Landmark size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Link Escrow Bank Account</h3>
                  <p className="text-[11px] text-on-surface-variant">Add nodal settlement account.</p>
                </div>
              </div>
              <button onClick={() => setAddBankModal(false)} className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBank} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Bank Name</label>
                <input
                  type="text"
                  value={newBank.bankName}
                  onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                  className={inputCls}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Account Holder Name</label>
                  <input
                    type="text"
                    value={newBank.accountHolder}
                    onChange={(e) => setNewBank({ ...newBank, accountHolder: e.target.value })}
                    placeholder="Delhi State Labour Federation"
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">IFSC Code</label>
                  <input
                    type="text"
                    value={newBank.ifsc}
                    onChange={(e) => setNewBank({ ...newBank, ifsc: e.target.value })}
                    placeholder="SBIN0001894"
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Account Number</label>
                  <input
                    type="password"
                    value={newBank.accountNumber}
                    onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                    placeholder="••••••••••••"
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Confirm Account Number</label>
                  <input
                    type="text"
                    value={newBank.confirmAccountNumber}
                    onChange={(e) => setNewBank({ ...newBank, confirmAccountNumber: e.target.value })}
                    placeholder="Re-enter Account No."
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">UPI VPA (Optional)</label>
                  <input
                    type="text"
                    value={newBank.upi}
                    onChange={(e) => setNewBank({ ...newBank, upi: e.target.value })}
                    placeholder="sahakar.fed@sbi"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Account Type</label>
                  <CustomSelect
                    value={newBank.accountType}
                    onChange={(e) => setNewBank({ ...newBank, accountType: e.target.value })}
                    options={[
                      { value: "Escrow Settlement Gateway", label: "Escrow Settlement Gateway" },
                      { value: "Welfare Reserve Pool", label: "Welfare Reserve Pool" },
                      { value: "Operational Current A/C", label: "Operational Current A/C" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primaryCheck"
                  checked={newBank.isPrimary}
                  onChange={(e) => setNewBank({ ...newBank, isPrimary: e.target.checked })}
                  className="rounded text-primary"
                />
                <label htmlFor="primaryCheck" className="text-xs font-semibold text-on-surface cursor-pointer">
                  Set as Primary Escrow Gateway
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setAddBankModal(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-2xs"
                >
                  Link Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email OTP Verification Modal */}
      {emailOtpOpen && (
        <OtpModal
          email={profile.email}
          purpose="change_email"
          onVerify={handleEmailOtp}
          onClose={() => setEmailOtpOpen(false)}
        />
      )}

      <ConfirmModal
        {...confirmState}
        onClose={() => setConfirmState((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}
