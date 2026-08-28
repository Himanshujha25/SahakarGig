import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  User, Lock, Bell, Building2, Save, CheckCircle2, Palette, ShieldCheck,
  Mail, Phone, Shield, Sparkles, AlertCircle, RefreshCw, IndianRupee, Percent
} from "lucide-react";
import OtpModal from "../../components/OtpModal";
import { EmailStatusCard, ChangePasswordSection } from "../../components/AccountSecurity";
import AppearanceSettings from "../../components/AppearanceSettings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TABS = [
  { id: "profile",       label: "Profile",        Icon: User },
  { id: "appearance",    label: "Appearance",     Icon: Palette },
  { id: "security",      label: "Security",        Icon: Lock },
  { id: "notifications", label: "Notifications",   Icon: Bell },
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
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [profile, setProfile] = useState({ name: user?.name || "Neeta Joshi", email: user?.email || "federation@sahakargig.com", phone: "+91 9811000004" });
  const [notifs, setNotifs] = useState({ bookings: true, disputes: true, verifications: true, payments: true, weekly: true });
  const [commissionRate, setCommissionRate] = useState("2.5");
  const [isSavingComm, setIsSavingComm] = useState(false);

  const [emailOtpOpen, setEmailOtpOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  function flash() { setSaved(true); setSaveErr(""); setTimeout(() => setSaved(false), 2500); }

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

  return (
    <div className="w-full max-w-4xl mx-auto p-6 lg:p-8 space-y-6 text-slate-900">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
          Federation Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your federation profile, escrow bank accounts, commission rates, and account security.
        </p>
      </div>

      {/* Toast Notification */}
      {saved && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* 5-Tab Navigation Pill Bar (Identical to Admin Settings) */}
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

      {/* ── TAB 1: Profile ── */}
      {tab === "profile" && (
        <div className="space-y-4">
          <Section title="Personal Information" subtitle="Update your federation admin display name, email, and contact details.">
            <div className="flex items-center gap-4 pb-2">
              <div className="w-14 h-14 rounded-2xl bg-[#1e6b65] flex items-center justify-center text-white text-xl font-extrabold shrink-0 shadow-md">
                {(profile.name || "F").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-900">{profile.name}</p>
                <p className="text-xs font-medium text-slate-500">{profile.email}</p>
                <div className="pt-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                    Federation Super Admin
                  </span>
                </div>
              </div>
            </div>

            <EmailStatusCard />

            {saveErr && (
              <div className="rounded-2xl p-3 border bg-red-50 border-red-200 text-red-700 text-xs font-semibold">{saveErr}</div>
            )}

            <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name">
                <input className={inputCls} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
              </Field>
              <Field label="Email Address">
                <input className={inputCls} type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="admin@federation.com" />
              </Field>
              <Field label="Phone Number">
                <input className={inputCls} type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </Field>
              <div className="sm:col-span-2 pt-2 flex items-center justify-between">
                <p className="text-[11px] text-slate-400 font-medium">Changing email requires one-time OTP verification.</p>
                <SaveBtn type="submit">Save Changes</SaveBtn>
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
        <div className="space-y-4">
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

          <Section title="Cooperative Bank Account & Escrow Gateway" subtitle="Federation Bank Account details for Razorpay Escrow payouts.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <Field label="Bank Name">
                <input className={inputCls} readOnly value="State Bank of India (Escrow Federation Branch)" />
              </Field>

              <Field label="Account Number">
                <input className={inputCls} readOnly value="110293847561" />
              </Field>

              <Field label="IFSC Code">
                <input className={inputCls} readOnly value="SBIN0001894" />
              </Field>

              <Field label="UPI Escrow Handle">
                <input className={inputCls} readOnly value="sahakar.federation@sbi" />
              </Field>
            </div>
          </Section>

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

      {/* OTP Modal */}
      <OtpModal
        open={emailOtpOpen}
        onClose={() => setEmailOtpOpen(false)}
        title="Confirm your new email"
        subtitle={<>We've sent a 6-digit code to <span className="font-semibold text-slate-900">{profile.email}</span>. Enter it to finish updating your profile.</>}
        email={profile.email.trim()}
        purpose="change_email"
        onSubmit={handleEmailOtp}
        busy={emailBusy}
      />

    </div>
  );
}
