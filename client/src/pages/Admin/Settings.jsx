import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { User, Lock, Bell, Building2, Save, CheckCircle2, Eye, EyeOff } from "lucide-react";

const TABS = [
  { id: "profile",       label: "Profile",        Icon: User },
  { id: "security",      label: "Security",        Icon: Lock },
  { id: "notifications", label: "Notifications",   Icon: Bell },
  { id: "cooperative",   label: "Cooperative",     Icon: Building2 },
];

function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-outline-variant/60 bg-surface p-6 space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-on-surface">{title}</h2>
        {subtitle && <p className="text-[13px] text-on-surface-variant mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.06em]">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50";

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "", phone: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [notifs, setNotifs] = useState({ bookings: true, disputes: true, verifications: true, payments: false, weekly: true });
  const [coop, setCoop] = useState({ name: "", address: "", regNumber: "", contactEmail: "" });

  useEffect(() => {
    api.get("/admin/dashboard").then(({ data }) => {
      if (data?.cooperative) {
        setCoop(c => ({ ...c, name: data.cooperative.name || "", regNumber: data.cooperative.regNumber || "" }));
      }
    }).catch(() => {});
  }, []);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2500); }

  function SaveBtn({ onClick }) {
    return (
      <button onClick={onClick}
        className="h-10 inline-flex items-center gap-2 px-5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-[#173bab] hover:shadow-[0_4px_16px_rgba(0,40,142,0.2)] transition-all duration-200">
        <Save size={14} strokeWidth={2.5} />
        Save Changes
      </button>
    );
  }

  return (
    <div className="w-full px-6 pt-8 pb-24 lg:pb-10 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Settings
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">Manage your account, security, and cooperative preferences.</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e6f9ec] border border-[#006d30]/20 text-[13px] font-bold text-[#006d30]">
            <CheckCircle2 size={15} strokeWidth={2.5} />
            Saved successfully
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-container-low border border-outline-variant/40 w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              tab === id
                ? "bg-surface text-primary shadow-sm border border-outline-variant/40"
                : "text-on-surface-variant hover:text-on-surface"
            }`}>
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="space-y-5 max-w-2xl">
          <Section title="Personal Information" subtitle="Update your display name, email, and contact details.">
            <div className="flex items-center gap-4 pb-2">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-[22px] font-bold shrink-0">
                {(user?.name || "A").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[15px] font-bold text-on-surface">{user?.name || "Admin"}</p>
                <p className="text-[13px] text-on-surface-variant">{user?.email}</p>
                <span className="mt-1 inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#e8edff] text-[#00288e]">Cooperative Admin</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name">
                <input className={inputCls} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
              </Field>
              <Field label="Email Address">
                <input className={inputCls} type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="admin@coop.com" />
              </Field>
              <Field label="Phone Number">
                <input className={inputCls} type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </Field>
            </div>
            <SaveBtn onClick={flash} />
          </Section>
        </div>
      )}

      {/* Security tab */}
      {tab === "security" && (
        <div className="space-y-5 max-w-2xl">
          <Section title="Change Password" subtitle="Use a strong password with at least 8 characters.">
            <div className="space-y-4">
              <Field label="Current Password">
                <div className="relative">
                  <input className={inputCls + " pr-11"} type={showPw ? "text" : "password"} value={passwords.current}
                    onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="New Password">
                <input className={inputCls} type="password" value={passwords.next}
                  onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} placeholder="New password" />
              </Field>
              <Field label="Confirm New Password">
                <input className={inputCls} type="password" value={passwords.confirm}
                  onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
              </Field>
            </div>
            {passwords.next && passwords.confirm && passwords.next !== passwords.confirm && (
              <p className="text-[12px] text-error font-semibold">Passwords do not match.</p>
            )}
            <SaveBtn onClick={flash} />
          </Section>

          <Section title="Active Sessions" subtitle="Devices currently signed in to your account.">
            <div className="space-y-2">
              {[{ device: "Chrome · Windows", location: "Nagpur, IN", current: true }, { device: "Mobile · Android", location: "Nagpur, IN", current: false }].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
                  <div>
                    <p className="text-[13px] font-semibold text-on-surface">{s.device}</p>
                    <p className="text-[11px] text-on-surface-variant">{s.location}</p>
                  </div>
                  {s.current
                    ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#e6f9ec] text-[#006d30]">Current</span>
                    : <button className="text-[12px] font-bold text-error hover:underline">Revoke</button>}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Notifications tab */}
      {tab === "notifications" && (
        <div className="space-y-5 max-w-2xl">
          <Section title="Notification Preferences" subtitle="Choose what alerts you receive in the admin console.">
            <div className="space-y-1">
              {[
                { key: "bookings",      label: "New Bookings",          desc: "When a new booking is placed in your cooperative" },
                { key: "disputes",      label: "Dispute Raised",        desc: "When a household or provider raises a dispute" },
                { key: "verifications", label: "Verification Requests", desc: "When a provider submits documents for review" },
                { key: "payments",      label: "Payment Settlements",   desc: "When a payment is captured or refunded" },
                { key: "weekly",        label: "Weekly Summary",        desc: "Weekly digest of bookings, revenue, and activity" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3.5 border-b border-outline-variant/30 last:border-0">
                  <div>
                    <p className="text-[14px] font-semibold text-on-surface">{label}</p>
                    <p className="text-[12px] text-on-surface-variant">{desc}</p>
                  </div>
                  <button onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                    className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 ${notifs[key] ? "bg-primary" : "bg-outline-variant"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${notifs[key] ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
            <SaveBtn onClick={flash} />
          </Section>
        </div>
      )}

      {/* Cooperative tab */}
      {tab === "cooperative" && (
        <div className="space-y-5 max-w-2xl">
          <Section title="Cooperative Details" subtitle="Basic information about your registered cooperative society.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cooperative Name">
                <input className={inputCls} value={coop.name} onChange={e => setCoop(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Nagpur Seva Cooperative" />
              </Field>
              <Field label="Registration Number">
                <input className={inputCls} value={coop.regNumber} onChange={e => setCoop(c => ({ ...c, regNumber: e.target.value }))} placeholder="e.g. MH/COO/2024/001" />
              </Field>
              <Field label="Contact Email">
                <input className={inputCls} type="email" value={coop.contactEmail} onChange={e => setCoop(c => ({ ...c, contactEmail: e.target.value }))} placeholder="contact@coop.com" />
              </Field>
              <Field label="Address">
                <input className={inputCls} value={coop.address} onChange={e => setCoop(c => ({ ...c, address: e.target.value }))} placeholder="City, State" />
              </Field>
            </div>
            <SaveBtn onClick={flash} />
          </Section>

          <Section title="Danger Zone" subtitle="Irreversible actions — proceed with caution.">
            <div className="flex items-center justify-between p-4 rounded-xl border border-error/20 bg-error-container/10">
              <div>
                <p className="text-[14px] font-bold text-on-surface">Reset All Data</p>
                <p className="text-[12px] text-on-surface-variant">Permanently delete all bookings, reviews, and provider records.</p>
              </div>
              <button className="h-9 px-4 rounded-xl border border-error text-error text-[13px] font-bold hover:bg-error hover:text-white transition-all duration-200">
                Reset
              </button>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
