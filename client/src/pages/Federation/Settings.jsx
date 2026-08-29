import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  User, Lock, Bell, Building2, Save, CheckCircle2, Palette, ShieldCheck,
  Mail, Phone, Shield, Sparkles, AlertCircle, RefreshCw, IndianRupee, Percent,
  Camera, Upload, Trash2, Globe, MapPin, Briefcase, Clock, MessageSquare, Image,
  Plus, Search, CreditCard, Check, ChevronDown, Layers, BadgeCheck, X, Copy
} from "lucide-react";
import OtpModal from "../../components/OtpModal";
import { EmailStatusCard, ChangePasswordSection } from "../../components/AccountSecurity";
import AppearanceSettings from "../../components/AppearanceSettings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const POPULAR_BANKS = [
  { id: 'sbi', name: 'State Bank of India (SBI)', ifscPrefix: 'SBIN000', tag: 'PSU Escrow' },
  { id: 'hdfc', name: 'HDFC Bank', ifscPrefix: 'HDFC000', tag: 'Private' },
  { id: 'icici', name: 'ICICI Bank', ifscPrefix: 'ICIC000', tag: 'Private' },
  { id: 'pnb', name: 'Punjab National Bank (PNB)', ifscPrefix: 'PUNB000', tag: 'PSU' },
  { id: 'bob', name: 'Bank of Baroda', ifscPrefix: 'BARB000', tag: 'PSU' },
  { id: 'axis', name: 'Axis Bank', ifscPrefix: 'UTIB000', tag: 'Private' },
  { id: 'canara', name: 'Canara Bank', ifscPrefix: 'CNRB000', tag: 'PSU' },
  { id: 'union', name: 'Union Bank of India', ifscPrefix: 'UBIN000', tag: 'PSU' },
  { id: 'kotak', name: 'Kotak Mahindra Bank', ifscPrefix: 'KKBK000', tag: 'Private' },
  { id: 'dscb', name: 'Delhi State Cooperative Bank', ifscPrefix: 'DSCB000', tag: 'State Cooperative' },
  { id: 'mscb', name: 'Maharashtra State Cooperative Bank', ifscPrefix: 'MSCB000', tag: 'State Cooperative' },
  { id: 'ncdc', name: 'National Cooperative Development Corp (NCDC)', ifscPrefix: 'NCDC000', tag: 'Apex Body' },
];

const TABS = [
  { id: "profile",       label: "Profile & Avatar", Icon: User },
  { id: "appearance",    label: "Appearance",       Icon: Palette },
  { id: "security",      label: "Security",          Icon: Lock },
  { id: "notifications", label: "Notifications",     Icon: Bell },
  { id: "federation",    label: "Federation & Escrow", Icon: Building2 },
];

function Section({ title, subtitle, children }) {
  return (
    <div className="orvia-card p-6 space-y-5">
      <div className="pb-3 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-xs font-semibold text-slate-900 outline-none transition-all focus:border-[#1e6b65] focus:bg-white focus:ring-2 focus:ring-[#1e6b65]/20 placeholder:text-slate-400";

export default function FederationSettings() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [profile, setProfile] = useState({
    name: user?.name || "Neeta Joshi",
    email: user?.email || "federation.test@gmail.com",
    phone: user?.phone || "+91 9811000004",
    avatarUrl: user?.avatarUrl || "",
    bio: user?.bio || "Apex Federation Administrator overseeing NCR multi-state labour cooperative societies.",
    designation: user?.designation || "Federation Super Admin",
    location: user?.location || "Delhi Secretariat, New Delhi",
    timezone: user?.timezone || "Asia/Kolkata (IST)",
    language: user?.language || "English",
    contactPreference: user?.contactPreference || "Email",
  });

  const [notifs, setNotifs] = useState({ bookings: true, disputes: true, verifications: true, payments: true, weekly: true });
  const [commissionRate, setCommissionRate] = useState("2.5");
  const [isSavingComm, setIsSavingComm] = useState(false);

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
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);

  // New Bank Form Fields
  const [newBankName, setNewBankName] = useState("");
  const [newAccHolder, setNewAccHolder] = useState("Delhi State Labour Federation");
  const [newAccNum, setNewAccNum] = useState("");
  const [newConfirmAccNum, setNewConfirmAccNum] = useState("");
  const [newIfsc, setNewIfsc] = useState("");
  const [newUpi, setNewUpi] = useState("");
  const [newAccType, setNewAccType] = useState("Escrow Settlement Gateway");
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [bankFormErr, setBankFormErr] = useState("");

  const [emailOtpOpen, setEmailOtpOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        avatarUrl: user.avatarUrl || prev.avatarUrl,
        bio: user.bio || prev.bio,
        designation: user.designation || prev.designation,
        location: user.location || prev.location,
        timezone: user.timezone || prev.timezone,
        language: user.language || prev.language,
        contactPreference: user.contactPreference || prev.contactPreference,
      }));
    }
  }, [user]);

  function flash() { setSaved(true); setSaveErr(""); setTimeout(() => setSaved(false), 2500); }

  function saveBankAccountsList(list) {
    setBankAccounts(list);
    localStorage.setItem("sg_fed_bank_accounts", JSON.stringify(list));
    flash();
  }

  function handleSetPrimaryBank(id) {
    const updated = bankAccounts.map((b) => ({
      ...b,
      isPrimary: b.id === id,
    }));
    saveBankAccountsList(updated);
  }

  function handleDeleteBank(id) {
    if (bankAccounts.length <= 1) {
      alert("At least one escrow settlement bank account is required.");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this bank account?")) return;
    const filtered = bankAccounts.filter((b) => b.id !== id);
    if (!filtered.some((b) => b.isPrimary) && filtered.length > 0) {
      filtered[0].isPrimary = true;
    }
    saveBankAccountsList(filtered);
  }

  function handleSelectBankSuggestion(bank) {
    setNewBankName(bank.name);
    if (!newIfsc || newIfsc.length < 5) {
      setNewIfsc(bank.ifscPrefix);
    }
    setBankDropdownOpen(false);
    setBankSearch("");
  }

  function handleAddBankSubmit(e) {
    e.preventDefault();
    setBankFormErr("");
    if (!newBankName.trim()) return setBankFormErr("Please select or enter a bank name.");
    if (!newAccNum.trim()) return setBankFormErr("Account number is required.");
    if (newAccNum.trim() !== newConfirmAccNum.trim()) {
      return setBankFormErr("Account numbers do not match. Please re-enter.");
    }
    if (!newIfsc.trim()) return setBankFormErr("IFSC Code is required.");

    const newAcc = {
      id: "bank_" + Date.now(),
      bankName: newBankName.trim(),
      accountHolder: newAccHolder.trim() || "Federation Escrow Pool",
      accountNumber: newAccNum.trim(),
      ifsc: newIfsc.trim().toUpperCase(),
      upi: newUpi.trim() || `sahakar.${newBankName.toLowerCase().slice(0, 4)}@upi`,
      accountType: newAccType,
      isPrimary: newIsPrimary || bankAccounts.length === 0,
    };

    let updatedList = newIsPrimary
      ? bankAccounts.map((b) => ({ ...b, isPrimary: false }))
      : [...bankAccounts];

    updatedList = [newAcc, ...updatedList];
    saveBankAccountsList(updatedList);
    setAddBankModal(false);
    setNewBankName("");
    setNewAccNum("");
    setNewConfirmAccNum("");
    setNewIfsc("");
    setNewUpi("");
  }

  // Handle Local Image Upload via File Reader
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSaveErr("Profile image must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      setProfile((p) => ({ ...p, avatarUrl: dataUrl }));
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

  async function saveCommission(e) {
    e.preventDefault();
    setIsSavingComm(true);
    try {
      await api.patch('/federation/commission', { rate: Number(commissionRate) });
      flash();
    } catch (err) {
      setSaveErr("Failed to save commission rate.");
    } finally {
      setIsSavingComm(false);
    }
  }

  function SaveBtn({ onClick, type = "button", children }) {
    return (
      <button
        type={type}
        onClick={onClick}
        className="px-5 py-2.5 rounded-full bg-[#1e6b65] hover:bg-[#154e4a] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
      >
        <Save size={14} />
        <span>{children || "Save Changes"}</span>
      </button>
    );
  }

  const filteredBankSuggestions = POPULAR_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.tag.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-6 lg:p-8 space-y-6 text-slate-900">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
          Federation Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your federation profile avatar, personal preferences, multi-bank escrow gateways, and commission rates.
        </p>
      </div>

      {/* Toast Notification */}
      {saved && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* 5-Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-x-auto">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              tab === id
                ? "bg-white text-[#1e6b65] shadow-xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: Profile & Avatar ── */}
      {tab === "profile" && (
        <div className="space-y-6">
          {/* Avatar / Profile Picture Management Section */}
          <Section title="Profile Picture &amp; Avatar" subtitle="Upload and manage your official federation profile photo.">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#1e6b65]/20 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[#1e6b65] flex items-center justify-center text-white text-2xl font-extrabold shadow-md ring-4 ring-[#1e6b65]/20">
                      {(profile.name || "F").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1.5 -right-1.5 p-2 rounded-full bg-[#1e6b65] text-white shadow-md hover:scale-105 transition-all cursor-pointer"
                    title="Upload new photo"
                  >
                    <Camera size={14} />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{profile.name}</h3>
                  <p className="text-xs text-slate-500">{profile.email}</p>
                  <p className="text-xs font-semibold text-[#1e6b65] mt-1">{profile.designation}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Upload size={14} />
                  <span>Upload Image</span>
                </button>

                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, avatarUrl: "" }))}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 cursor-pointer"
                    title="Remove custom photo"
                  >
                    <Trash2 size={14} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </Section>

          {/* Personal Information & Detailed Settings */}
          <Section title="Personal Information &amp; Preferences" subtitle="Update your official contact details, regional jurisdiction, and language preference.">
            <EmailStatusCard />

            {saveErr && (
              <div className="rounded-2xl p-3 border bg-red-50 border-red-200 text-red-700 text-xs font-semibold">{saveErr}</div>
            )}

            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Legal Name">
                  <input
                    className={inputCls}
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Neeta Joshi"
                    required
                  />
                </Field>

                <Field label="Email Address">
                  <input
                    className={inputCls}
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="admin@federation.com"
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Official Phone Number">
                  <input
                    className={inputCls}
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 9811000004"
                  />
                </Field>

                <Field label="Official Designation / Title">
                  <input
                    className={inputCls}
                    value={profile.designation}
                    onChange={(e) => setProfile((p) => ({ ...p, designation: e.target.value }))}
                    placeholder="e.g. Federation Super Admin / Apex Director"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Headquarters / Office Location">
                  <input
                    className={inputCls}
                    value={profile.location}
                    onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. Delhi Secretariat, New Delhi"
                  />
                </Field>

                <Field label="Preferred Platform Language">
                  <select
                    className={inputCls}
                    value={profile.language}
                    onChange={(e) => setProfile((p) => ({ ...p, language: e.target.value }))}
                  >
                    <option value="English">English (Default)</option>
                    <option value="Hindi">हिंदी (Hindi)</option>
                    <option value="Bengali">বাংলা (Bengali)</option>
                    <option value="Marathi">मराठी (Marathi)</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                    <option value="Telugu">తెలుగు (Telugu)</option>
                    <option value="Gujarati">ગુજરાતી (Gujarati)</option>
                    <option value="Punjabi">ਪੰਜਾਬੀ (Punjabi)</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="System Timezone">
                  <select
                    className={inputCls}
                    value={profile.timezone}
                    onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                  >
                    <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST, UTC +05:30)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                  </select>
                </Field>

                <Field label="Primary Contact Preference">
                  <select
                    className={inputCls}
                    value={profile.contactPreference}
                    onChange={(e) => setProfile((p) => ({ ...p, contactPreference: e.target.value }))}
                  >
                    <option value="Email">Email Notifications</option>
                    <option value="WhatsApp">WhatsApp Direct Alerts</option>
                    <option value="SMS">SMS Gateway Alerts</option>
                  </select>
                </Field>
              </div>

              <Field label="About / Professional Bio">
                <textarea
                  rows={3}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 outline-none focus:border-[#1e6b65] focus:bg-white"
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="State your role and operational jurisdiction..."
                />
              </Field>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[11px] text-slate-400 font-medium">Changing email requires one-time OTP verification.</p>
                <SaveBtn type="submit">Save Profile &amp; Avatar</SaveBtn>
              </div>
            </form>
          </Section>
        </div>
      )}

      {/* ── TAB 2: Appearance ── */}
      {tab === "appearance" && (
        <div className="orvia-card p-6">
          <AppearanceSettings />
        </div>
      )}

      {/* ── TAB 3: Security ── */}
      {tab === "security" && (
        <div className="space-y-4">
          <Section title="Change Password" subtitle="Use a strong password with at least 8 characters. A one-time code will be emailed to confirm the change.">
            <ChangePasswordSection onSaved={flash} />
          </Section>

          <Section title="Active Sessions" subtitle="Devices currently signed in to your account.">
            <div className="space-y-2">
              {[{ device: "Chrome · Windows", location: "Delhi, IN", current: true }, { device: "Mobile · Android", location: "Delhi, IN", current: false }].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{s.device}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{s.location}</p>
                  </div>
                  {s.current
                    ? <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">Current Session</span>
                    : <button type="button" className="text-xs font-bold text-red-600 hover:underline cursor-pointer">Revoke</button>}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB 4: Notifications ── */}
      {tab === "notifications" && (
        <div className="space-y-4">
          <Section title="Notification Preferences" subtitle="Choose what alerts you receive in the federation portal.">
            <div className="space-y-1">
              {[
                { key: "bookings",      label: "Cooperative Onboarding",  desc: "When a new cooperative requests federation link" },
                { key: "disputes",      label: "Escrow Disbursal Alerts", desc: "When a high-value payout is processed" },
                { key: "verifications", label: "Federation Audit Alerts", desc: "When annual compliance documents are uploaded" },
                { key: "payments",      label: "Commission Settlements",  desc: "When monthly federation commission is calculated" },
                { key: "weekly",        label: "Weekly Digest",           desc: "Weekly summary of national gig worker activity" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{label}</p>
                    <p className="text-[11px] text-slate-400">{desc}</p>
                  </div>
                  <button type="button" onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                    className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 cursor-pointer ${notifs[key] ? "bg-[#1e6b65]" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${notifs[key] ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-2 flex justify-end">
              <SaveBtn onClick={flash} />
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB 5: Federation & Escrow Account ── */}
      {tab === "federation" && (
        <div className="space-y-6">
          {/* Commission Rate Section */}
          <Section title="Federation Commission Rate" subtitle="This percentage is deducted before cooperative commissions are applied.">
            <form onSubmit={saveCommission} className="space-y-4">
              <Field label="Commission Rate (%)">
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  className={inputCls}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="e.g. 2.5"
                  required
                />
              </Field>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400">Statutory multi-state cooperative commission deduction.</p>
                <SaveBtn type="submit">
                  {isSavingComm ? "Saving..." : "Save Commission Rate"}
                </SaveBtn>
              </div>
            </form>
          </Section>

          {/* Multi-Bank Accounts & Escrow Gateway Directory */}
          <Section
            title="Federation Escrow &amp; Treasury Bank Accounts"
            subtitle="Manage multiple linked nodal bank accounts, Razorpay Escrow accounts, and Welfare fund pools."
          >
            <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500">
                {bankAccounts.length} Linked Settlement Gateway Accounts
              </span>
              <button
                type="button"
                onClick={() => {
                  setAddBankModal(true);
                  setBankFormErr("");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e6b65] text-white text-xs font-bold hover:bg-[#154e4a] shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add Bank Account</span>
              </button>
            </div>

            {/* Bank Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {bankAccounts.map((acc) => {
                const isPrimary = !!acc.isPrimary;
                const last4 = (acc.accountNumber || "").slice(-4) || "7561";

                return (
                  <div
                    key={acc.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3.5 relative ${
                      isPrimary
                        ? "bg-gradient-to-br from-emerald-50/60 to-slate-50 border-[#1e6b65] shadow-xs ring-1 ring-[#1e6b65]/20"
                        : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${isPrimary ? "bg-[#1e6b65] text-white" : "bg-slate-200 text-slate-700"}`}>
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                            {acc.bankName}
                          </h4>
                          <span className="text-[11px] font-semibold text-[#1e6b65]">
                            {acc.accountType || "Escrow Settlement"}
                          </span>
                        </div>
                      </div>

                      {isPrimary ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold border border-emerald-300 shadow-2xs shrink-0">
                          <BadgeCheck size={12} /> Primary Gateway
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryBank(acc.id)}
                          className="text-[11px] font-bold text-[#1e6b65] hover:underline cursor-pointer shrink-0"
                        >
                          Make Primary
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs pt-1 border-t border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Account Number:</span>
                        <span className="font-mono font-bold text-slate-900">•••• •••• {last4}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Account Holder:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[180px]">{acc.accountHolder}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">IFSC Code:</span>
                        <span className="font-mono font-bold text-slate-900">{acc.ifsc}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Virtual UPI Handle:</span>
                        <span className="font-mono font-bold text-[#1e6b65]">{acc.upi}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        {isPrimary ? "Default for all worker payouts" : "Secondary reserve account"}
                      </span>

                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBank(acc.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Remove bank account"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Danger Zone */}
          <Section title="Danger Zone" subtitle="Irreversible federation operations — proceed with caution.">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-red-200 bg-red-50/50 text-xs">
              <div>
                <p className="font-bold text-slate-900">Reset Federation Cache</p>
                <p className="text-[11px] text-slate-400">Clear temporary session cache and re-sync metrics from database.</p>
              </div>
              <button type="button" onClick={flash} className="px-4 py-2 rounded-full border border-red-200 text-red-600 font-bold hover:bg-red-600 hover:text-white transition-all cursor-pointer">
                Reset Cache
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* ── Add Bank Account Modal with Searchable Dropdown ── */}
      {addBankModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAddBankModal(false)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 lg:p-8 space-y-5 animate-scale-in border border-slate-200 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1e6b65] text-white flex items-center justify-center font-bold">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add Nodal Bank / Escrow Account</h2>
                  <p className="text-xs text-slate-500">Link a verified bank account for federation escrow payouts and reserve funds.</p>
                </div>
              </div>
              <button onClick={() => setAddBankModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {bankFormErr && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{bankFormErr}</span>
              </div>
            )}

            <form onSubmit={handleAddBankSubmit} className="space-y-4">
              {/* Searchable Bank Name Selection */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Bank Name (Searchable Suggestions)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => {
                      setNewBankName(e.target.value);
                      setBankSearch(e.target.value);
                      setBankDropdownOpen(true);
                    }}
                    onFocus={() => setBankDropdownOpen(true)}
                    placeholder="Search or type bank name (e.g. State Bank of India, HDFC...)"
                    className={inputCls}
                    required
                  />
                  <ChevronDown
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>

                {/* Dropdown Suggestions List */}
                {bankDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 space-y-1">
                    <div className="p-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Popular Scheduled &amp; Cooperative Banks:
                    </div>
                    {filteredBankSuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        Custom bank: &quot;{newBankName}&quot; (press Tab or enter details below)
                      </div>
                    ) : (
                      filteredBankSuggestions.map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => handleSelectBankSuggestion(bank)}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-[#1e6b65]/10 text-xs font-semibold text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-[#1e6b65]" />
                            <span>{bank.name}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {bank.tag}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Account Holder Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Account Beneficiary / Entity Name
                </label>
                <input
                  type="text"
                  value={newAccHolder}
                  onChange={(e) => setNewAccHolder(e.target.value)}
                  placeholder="e.g. Delhi State Labour Federation Escrow Pool"
                  className={inputCls}
                  required
                />
              </div>

              {/* Account Number & Confirm Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Bank Account Number
                  </label>
                  <input
                    type="password"
                    value={newAccNum}
                    onChange={(e) => setNewAccNum(e.target.value)}
                    placeholder="Enter Account Number"
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Confirm Account Number
                  </label>
                  <input
                    type="text"
                    value={newConfirmAccNum}
                    onChange={(e) => setNewConfirmAccNum(e.target.value)}
                    placeholder="Re-enter Account Number"
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* IFSC Code & Virtual UPI Handle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    IFSC Branch Code (11-Digits)
                  </label>
                  <input
                    type="text"
                    value={newIfsc}
                    onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001894"
                    maxLength={11}
                    className={`${inputCls} font-mono uppercase`}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Virtual UPI Handle (Optional)
                  </label>
                  <input
                    type="text"
                    value={newUpi}
                    onChange={(e) => setNewUpi(e.target.value)}
                    placeholder="e.g. sahakar.federation@sbi"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Account Purpose & Primary Checkbox */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Settlement Account Purpose
                </label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value)}
                  className={inputCls}
                >
                  <option value="Escrow Settlement Gateway">Escrow Settlement Gateway (Razorpay Route)</option>
                  <option value="Welfare Reserve Pool">Welfare &amp; Social Security Reserve Pool</option>
                  <option value="Operations Current Account">General Federation Operations Current Account</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 pt-1">
                <input
                  type="checkbox"
                  checked={newIsPrimary}
                  onChange={(e) => setNewIsPrimary(e.target.checked)}
                  className="rounded accent-[#1e6b65] h-4 w-4"
                />
                <span>Set as Default Primary Settlement Gateway</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddBankModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#1e6b65] text-white text-xs font-bold hover:bg-[#154e4a] shadow-md transition-all cursor-pointer"
                >
                  Save &amp; Link Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      <OtpModal
        open={emailOtpOpen}
        onClose={() => setEmailOtpOpen(false)}
        title="Confirm your new email"
        subtitle={<>We&apos;ve sent a 6-digit code to <span className="font-semibold text-slate-900">{profile.email}</span>. Enter it to finish updating your profile.</>}
        email={profile.email.trim()}
        purpose="change_email"
        onSubmit={handleEmailOtp}
        busy={emailBusy}
      />

    </div>
  );
}
