import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  User, Lock, Bell, Building2, Save, CheckCircle2, Palette, ShieldCheck,
  Mail, Phone, Shield, Sparkles, AlertCircle, RefreshCw
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
  { id: "cooperative",   label: "Cooperative",     Icon: Building2 },
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

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "", phone: "" });
  const [notifs, setNotifs] = useState({ bookings: true, disputes: true, verifications: true, payments: false, weekly: true });
  const [coop, setCoop] = useState({ name: "", address: "", regNumber: "", contactEmail: "" });

  const [emailOtpOpen, setEmailOtpOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    api.get("/admin/dashboard").then(({ data }) => {
      if (data?.cooperative) {
        setCoop(c => ({ ...c, name: data.cooperative.name || "", regNumber: data.cooperative.regNumber || "" }));
      }
    }).catch(() => {});
  }, []);

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

  function SaveBtn({ onClick, type = "button", children }) {
    return (
      <button type={type} onClick={onClick} className="orvia-btn-primary cursor-pointer text-xs py-2.5 px-5">
        <Save size={15} />
        <span>{children || "Save Changes"}</span>
      </button>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-8 space-y-4">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Cooperative Settings & Preferences
            </h1>
            <span className="orvia-badge-lime text-xs">
              <ShieldCheck size={13} /> Admin Console
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Manage your account profile, security credentials, and cooperative agency details.</p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f7fee7] border border-[#d9f99d] text-xs font-bold text-[#4d7c0f] animate-alert-in">
            <CheckCircle2 size={15} className="text-[#65a30d]" />
            <span>Saved successfully</span>
          </div>
        )}
      </div>

      {/* ── Orvia Capsule Pill Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={active ? "orvia-pill-selected inline-flex items-center gap-1.5 shrink-0 cursor-pointer text-xs py-1.5 px-4" : "orvia-pill-unselected inline-flex items-center gap-1.5 shrink-0 cursor-pointer text-xs py-1.5 px-4"}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Profile ── */}
      {tab === "profile" && (
        <div className="space-y-4">
          <Section title="Personal Information" subtitle="Update your admin display name, email, and contact details.">
            <div className="flex items-center gap-4 pb-2">
              <div className="w-14 h-14 rounded-2xl bg-[#1e6b65] flex items-center justify-center text-white text-xl font-extrabold shrink-0 shadow-md">
                {(user?.name || "A").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-900">{user?.name || "Admin"}</p>
                <p className="text-xs font-medium text-slate-500">{user?.email}</p>
                <div className="pt-1.5">
                  <span className="orvia-badge-lime text-[11px]">Cooperative Admin</span>
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
                <input className={inputCls} type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="admin@coop.com" />
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
              {[{ device: "Chrome · Windows", location: "Nagpur, IN", current: true }, { device: "Mobile · Android", location: "Nagpur, IN", current: false }].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{s.device}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{s.location}</p>
                  </div>
                  {s.current
                    ? <span className="orvia-badge-lime text-[11px]">Current Session</span>
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
          <Section title="Notification Preferences" subtitle="Choose what alerts you receive in the admin console.">
            <div className="space-y-1">
              {[
                { key: "bookings",      label: "New Bookings",          desc: "When a new booking is placed in your cooperative" },
                { key: "disputes",      label: "Dispute Raised",        desc: "When a household or provider raises a dispute" },
                { key: "verifications", label: "Verification Requests", desc: "When a provider submits documents for review" },
                { key: "payments",      label: "Payment Settlements",   desc: "When a payment is captured or refunded" },
                { key: "weekly",        label: "Weekly Summary",        desc: "Weekly digest of bookings, revenue, and activity" },
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

      {/* ── TAB 5: Cooperative ── */}
      {tab === "cooperative" && (
        <div className="space-y-4">
          <Section title="Cooperative Details" subtitle="Basic information about your registered cooperative society.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cooperative Name">
                <input className={inputCls} value={coop.name} onChange={e => setCoop(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Karol Bagh Labour Cooperative" />
              </Field>
              <Field label="Registration Number">
                <input className={inputCls} value={coop.regNumber} onChange={e => setCoop(c => ({ ...c, regNumber: e.target.value }))} placeholder="e.g. DL/COO/2024/001" />
              </Field>
              <Field label="Contact Email">
                <input className={inputCls} type="email" value={coop.contactEmail} onChange={e => setCoop(c => ({ ...c, contactEmail: e.target.value }))} placeholder="contact@coop.com" />
              </Field>
              <Field label="Address">
                <input className={inputCls} value={coop.address} onChange={e => setCoop(c => ({ ...c, address: e.target.value }))} placeholder="Ghaziabad, UP" />
              </Field>
            </div>
            <div className="pt-2 flex justify-end">
              <SaveBtn onClick={flash} />
            </div>
          </Section>

          <Section title="Danger Zone" subtitle="Irreversible actions — proceed with caution.">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-red-200 bg-red-50/50 text-xs">
              <div>
                <p className="font-bold text-slate-900">Reset Cooperative Cache</p>
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
        ctaLabel="Update Email"
        onVerify={handleEmailOtp}
      />
    </div>
  );
}
