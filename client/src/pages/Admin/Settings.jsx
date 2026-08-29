import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  User, Lock, Bell, Building2, Save, CheckCircle2, Palette, ShieldCheck,
  Mail, Phone, Shield, Sparkles, AlertCircle, RefreshCw, Camera, Upload, Trash2
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

const inputCls = "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-xs font-semibold text-slate-900 outline-none transition-all focus:border-[#00288e] focus:bg-white focus:ring-2 focus:ring-[#00288e]/20 placeholder:text-slate-400";

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    avatarUrl: user?.avatarUrl || "",
    designation: user?.designation || "Cooperative Administrator & Secretary",
    location: user?.location || "Delhi NCR, India",
    language: user?.language || "English",
    timezone: user?.timezone || "Asia/Kolkata (IST)",
    contactPreference: user?.contactPreference || "Email",
    bio: user?.bio || "Managing verified cooperative workforce and local gig dispatches.",
  });

  const [notifs, setNotifs] = useState({ bookings: true, disputes: true, verifications: true, payments: false, weekly: true });
  const [coop, setCoop] = useState({ name: "", address: "", regNumber: "", contactEmail: "" });

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
        designation: user.designation || prev.designation,
        location: user.location || prev.location,
        language: user.language || prev.language,
        timezone: user.timezone || prev.timezone,
        contactPreference: user.contactPreference || prev.contactPreference,
        bio: user.bio || prev.bio,
      }));
    }
  }, [user]);

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Image size should be less than 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setProfile((p) => ({ ...p, avatarUrl: base64 }));
      try {
        updateProfile({ avatarUrl: base64 });
      } catch {}
      flash();
    };
    reader.readAsDataURL(file);
  }

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
          welfareFundAllocation: data.welfareFundAllocation || 10,
          commissionRate: data.commissionRate || 8,
          registrationDoc: data.registrationDoc,
        });
      }
    }).catch(() => {});
  }, []);

  function flash() { setSaved(true); setSaveErr(""); setTimeout(() => setSaved(false), 2500); }

  async function saveCoop(e) {
    e.preventDefault();
    try {
      await api.patch("/admin/cooperative", {
        name: coop.name,
        contactEmail: coop.contactEmail,
        contactPhone: coop.contactPhone,
        region: coop.region,
        district: coop.district,
        commissionRate: coop.commissionRate,
        welfareFundAllocation: coop.welfareFundAllocation,
      });
      flash();
    } catch (err) {
      setSaveErr("Failed to save cooperative profile.");
    }
  }

  async function handleUploadDoc() {
    const url = prompt("Enter Registration Document URL or Cloud Storage Link:", coop.registrationDoc?.url || "https://sahakargig.gov.in/docs/coop-registration-certificate.pdf");
    if (!url) return;
    try {
      await api.post("/admin/cooperative/doc", {
        name: "Cooperative Registration Certificate",
        url,
      });
      setCoop(c => ({ ...c, registrationDoc: { name: "Cooperative Registration Certificate", url, uploadedAt: new Date() } }));
      flash();
    } catch {
      setSaveErr("Failed to update registration certificate.");
    }
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
          {/* Avatar Upload Card */}
          <Section title="Profile Picture &amp; Identity" subtitle="Upload a photo for your cooperative administrator badge across the console.">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#00288e]/20 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[#00288e] flex items-center justify-center text-white text-2xl font-extrabold shadow-md ring-4 ring-[#00288e]/20">
                      {(profile.name || "A").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1.5 -right-1.5 p-2 rounded-full bg-[#00288e] text-white shadow-md hover:scale-105 transition-all cursor-pointer"
                    title="Upload new photo"
                  >
                    <Camera size={14} />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{profile.name || "Cooperative Admin"}</h3>
                  <p className="text-xs text-slate-500">{profile.email}</p>
                  <p className="text-xs font-semibold text-[#00288e] mt-1">{profile.designation}</p>
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
                    onClick={() => {
                      setProfile((p) => ({ ...p, avatarUrl: "" }));
                      try { updateProfile({ avatarUrl: "" }); } catch {}
                      flash();
                    }}
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
                    placeholder="e.g. Suresh Patel"
                    required
                  />
                </Field>

                <Field label="Email Address">
                  <input
                    className={inputCls}
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="admin@coop.com"
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
                    placeholder="+91 98765 43210"
                  />
                </Field>

                <Field label="Official Designation / Title">
                  <input
                    className={inputCls}
                    value={profile.designation}
                    onChange={(e) => setProfile((p) => ({ ...p, designation: e.target.value }))}
                    placeholder="e.g. Cooperative Secretary / Operations Lead"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Headquarters / Office Location">
                  <input
                    className={inputCls}
                    value={profile.location}
                    onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. Karol Bagh, Central Delhi"
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
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 outline-none focus:border-[#00288e] focus:bg-white"
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="State your role and cooperative operations..."
                />
              </Field>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[11px] text-slate-400 font-medium">Changing email requires one-time OTP verification.</p>
                <SaveBtn type="submit">Save Profile &amp; Photo</SaveBtn>
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
        <div className="space-y-6">
          <Section title="Cooperative Details" subtitle="Official registration and contact details of your registered society.">
            <form onSubmit={saveCoop} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cooperative Name">
                  <input className={inputCls} value={coop.name} onChange={e => setCoop(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Karol Bagh Labour Cooperative" required />
                </Field>
                <Field label="Registration Number">
                  <input className={inputCls} value={coop.regNumber} readOnly placeholder="e.g. DL-COOP-2026-001" />
                </Field>
                <Field label="Contact Email">
                  <input className={inputCls} type="email" value={coop.contactEmail} onChange={e => setCoop(c => ({ ...c, contactEmail: e.target.value }))} placeholder="contact@coop.com" />
                </Field>
                <Field label="Contact Phone">
                  <input className={inputCls} type="tel" value={coop.contactPhone} onChange={e => setCoop(c => ({ ...c, contactPhone: e.target.value }))} placeholder="+91 9811000004" />
                </Field>
                <Field label="Operational Region / State">
                  <input className={inputCls} value={coop.region} onChange={e => setCoop(c => ({ ...c, region: e.target.value }))} placeholder="Delhi NCR" />
                </Field>
                <Field label="District">
                  <input className={inputCls} value={coop.district} onChange={e => setCoop(c => ({ ...c, district: e.target.value }))} placeholder="Central Delhi" />
                </Field>
              </div>
              <div className="pt-2 flex justify-end">
                <SaveBtn type="submit">Save Cooperative Profile</SaveBtn>
              </div>
            </form>
          </Section>

          <Section title="Registration Certificate &amp; Compliance Document" subtitle="Statutory society registration certificate verified by Registrar.">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00288e] text-white flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{coop.registrationDoc?.name || "Cooperative Registration Certificate"}</h4>
                  <p className="text-[11px] text-slate-400">Status: {coop.registrationDoc ? "Verified & Active ✓" : "Pending Upload"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {coop.registrationDoc?.url && (
                  <a
                    href={coop.registrationDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#00288e] hover:bg-slate-50"
                  >
                    View Certificate
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleUploadDoc}
                  className="px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#001f70] cursor-pointer"
                >
                  {coop.registrationDoc ? "Re-upload Certificate" : "Upload Document"}
                </button>
              </div>
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
