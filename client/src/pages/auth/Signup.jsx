import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import AuthShell from "../../components/AuthShell";
import OtpModal from "../../components/OtpModal";
import FileUpload from "../../components/FileUpload";
import {
  User, Mail, Phone, Lock, Building2, Briefcase, MapPin, IndianRupee,
  ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, Eye, EyeOff,
  Check, AlertCircle, Home, Wrench, Building
} from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ROLES = [
  { value: "Household",         label: "Household",       desc: "Customer Account",  icon: Home },
  { value: "Provider",          label: "Gig Worker",      desc: "Service Provider",  icon: Wrench },
  { value: "Cooperative Admin", label: "Cooperative",     desc: "Society Entity",    icon: Building },
];

const SKILL_CATEGORIES = [
  "Electrician", "Plumber", "Carpenter", "AC Repair & Service",
  "Home Deep Cleaning", "Painter", "Elder Care & Nursing",
  "Cook & Chef", "Appliance Technician", "Gardener & Landscaper", "Pest Control"
];

const GOVT_ID_TYPES = [
  "Aadhaar Card", "PAN Card", "Voter ID Card", "Driving License", "e-Shram Card"
];

const COOP_SECTORS = [
  "Gig & Domestic Labor Services", "Artisan & Handloom Society",
  "Urban Services Cooperative", "Women Empowerment Collective", "Multi-State Labor Federation"
];

const inputCls = "w-full h-9 px-3 rounded-lg bg-slate-900/90 border border-slate-700/80 text-white text-xs placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition";
const labelCls = "block text-[11px] font-semibold text-slate-300 mb-1";

export default function Signup() {
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteName = searchParams.get("name") || "";
  const inviteEmail = searchParams.get("email") || "";
  const invitePhone = searchParams.get("phone") || "";
  const inviteSkill = searchParams.get("skill") || "";
  const initialRole = searchParams.get("role") || (inviteName || inviteEmail ? "Provider" : "Household");

  const [role, setRole] = useState(initialRole);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [coops, setCoops] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const [form, setForm] = useState({
    name: inviteName,
    email: inviteEmail,
    phone: invitePhone,
    password: "",
    confirmPassword: "",
    avatarUrl: "",
    // Provider specific
    primarySkill: inviteSkill || "Electrician",
    experienceYears: "2",
    hourlyRate: "350",
    bio: "",
    address: "",
    cooperativeId: "",
    idType: "Aadhaar Card",
    idNumber: "",
    idDocUrl: "",
    skillCertUrl: "",
    policeVerificationUrl: "",
    payoutUpi: "",
    // Cooperative Admin specific
    coopName: "",
    registrationId: "",
    state: "Delhi",
    district: "Central Delhi",
    presidentName: "",
    sector: "Gig & Domestic Labor Services",
    memberCount: "25",
    coopRegDocUrl: "",
    bylawsDocUrl: "",
    societyPanDocUrl: "",
    bankAccount: "",
    bankIfsc: "",
  });

  useEffect(() => {
    if (inviteName || inviteEmail) {
      setForm((f) => ({
        ...f,
        name: inviteName || f.name,
        email: inviteEmail || f.email,
        phone: invitePhone || f.phone,
        primarySkill: inviteSkill || f.primarySkill,
      }));
      setRole("Provider");
    }
  }, [inviteName, inviteEmail, invitePhone, inviteSkill]);

  useEffect(() => {
    api.get("/providers/cooperatives").then((r) => {
      const data = (r.data && r.data.length > 0) ? r.data : [
        { _id: "coop_karolbagh_01", name: "Karol Bagh Labour Cooperative Society" },
        { _id: "coop_connaught_02", name: "Central Delhi Artisan Cooperative" },
        { _id: "coop_southdelhi_03", name: "South Delhi Skill Welfare Cooperative" }
      ];
      setCoops(data);
      if (data.length > 0 && !form.cooperativeId) {
        setForm(f => ({ ...f, cooperativeId: data[0]._id }));
      }
    }).catch(() => {
      const fallbackData = [
        { _id: "coop_karolbagh_01", name: "Karol Bagh Labour Cooperative Society" },
        { _id: "coop_connaught_02", name: "Central Delhi Artisan Cooperative" },
        { _id: "coop_southdelhi_03", name: "South Delhi Skill Welfare Cooperative" }
      ];
      setCoops(fallbackData);
      setForm(f => ({ ...f, cooperativeId: fallbackData[0]._id }));
    });
  }, []);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleGoogleAuth() {
    let userEmail = form.email.trim();
    let userName = form.name.trim();

    if (!userEmail || !EMAIL_RE.test(userEmail)) {
      const input = window.prompt("Enter your Google Account email address:");
      if (!input) return;
      if (!EMAIL_RE.test(input.trim())) {
        return setErr("Please enter a valid Google email address.");
      }
      userEmail = input.trim();
      userName = userEmail.split("@")[0];
    }

    setLoading(true);
    setErr("");
    try {
      await googleLogin({
        email: userEmail,
        name: userName || "Household User",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      });
      const redirectUrl = searchParams.get("redirect");
      if (redirectUrl && redirectUrl.startsWith("/")) {
        navigate(redirectUrl);
      } else {
        navigate("/household");
      }
    } catch (e) {
      setErr(e.response?.data?.message || "Google Authentication failed. Please use standard email signup.");
    } finally {
      setLoading(false);
    }
  }

  function handleNextStep(e) {
    if (e) e.preventDefault();
    setErr("");

    if (role === "Provider") {
      if (step === 1) {
        if (!form.name.trim()) return setErr("Please enter full legal name.");
        if (!EMAIL_RE.test(form.email.trim())) return setErr("Please enter a valid email address.");
        if (!form.password || form.password.length < 8) return setErr("Password must be at least 8 characters.");
        if (form.password !== form.confirmPassword) return setErr("Passwords do not match. Please re-enter.");
        setStep(2);
      } else if (step === 2) {
        if (!form.cooperativeId) return setErr("Please select a cooperative society.");
        if (!form.idNumber.trim()) return setErr("Please enter government ID number.");
        if (!form.idDocUrl) return setErr("Please upload government ID document proof.");
        setStep(3);
      }
    } else if (role === "Cooperative Admin") {
      if (step === 1) {
        if (!form.coopName.trim()) return setErr("Please enter cooperative society legal name.");
        if (!form.registrationId.trim()) return setErr("Please enter statutory registration ID.");
        if (!EMAIL_RE.test(form.email.trim())) return setErr("Please enter official email address.");
        if (!form.password || form.password.length < 8) return setErr("Password must be at least 8 characters.");
        if (form.password !== form.confirmPassword) return setErr("Passwords do not match. Please re-enter.");
        setStep(2);
      } else if (step === 2) {
        if (!form.presidentName.trim()) return setErr("Please enter president/secretary name.");
        setStep(3);
      }
    }
  }

  function submitFinal(e) {
    e.preventDefault();
    setErr("");

    if (!EMAIL_RE.test(form.email.trim())) {
      return setErr("Please enter a valid email address.");
    }
    if (form.password.length < 8) {
      return setErr("Password must be at least 8 characters long.");
    }
    if (form.password !== form.confirmPassword) {
      return setErr("Passwords do not match. Please re-enter.");
    }

    if (role === "Household") {
      if (!form.name.trim()) return setErr("Please enter your name.");
      setPendingPayload({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
        role: "Household"
      });
      setOtpOpen(true);
    } else if (role === "Provider") {
      if (!form.skillCertUrl && !form.policeVerificationUrl) {
        return setErr("Please upload skill certificate or police verification.");
      }

      const documentDetails = [];
      if (form.idDocUrl) {
        documentDetails.push({
          docType: form.idType,
          docNumber: form.idNumber,
          docUrl: form.idDocUrl,
        });
      }
      if (form.skillCertUrl) {
        documentDetails.push({
          docType: "Skill Certificate",
          docNumber: "SKILL-CERT",
          docUrl: form.skillCertUrl,
        });
      }
      if (form.policeVerificationUrl) {
        documentDetails.push({
          docType: "Police Verification Certificate",
          docNumber: "POLICE-CLEARANCE",
          docUrl: form.policeVerificationUrl,
        });
      }

      setPendingPayload({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
        role: "Provider",
        cooperativeId: form.cooperativeId,
        skills: [form.primarySkill],
        hourlyRate: Number(form.hourlyRate) || 350,
        experienceYears: Number(form.experienceYears) || 1,
        bio: form.bio,
        address: form.address,
        payoutUpi: form.payoutUpi,
        documentDetails,
      });
      setOtpOpen(true);
    } else if (role === "Cooperative Admin") {
      if (!form.coopRegDocUrl) {
        return setErr("Please upload Cooperative Registration Certificate PDF.");
      }

      const documents = [];
      if (form.coopRegDocUrl) documents.push({ docType: "Registration Certificate", docUrl: form.coopRegDocUrl });
      if (form.bylawsDocUrl) documents.push({ docType: "Society Bylaws", docUrl: form.bylawsDocUrl });
      if (form.societyPanDocUrl) documents.push({ docType: "Society PAN Card", docUrl: form.societyPanDocUrl });

      setPendingPayload({
        name: form.name || form.presidentName || form.coopName,
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
        role: "Cooperative Admin",
        cooperative: {
          name: form.coopName,
          registrationId: form.registrationId,
          region: `${form.district}, ${form.state}`,
          district: form.district,
          state: form.state,
          presidentName: form.presidentName,
          sector: form.sector,
          memberCount: Number(form.memberCount) || 25,
          documents,
          payoutBank: {
            accountNumber: form.bankAccount,
            ifsc: form.bankIfsc,
          }
        }
      });
      setOtpOpen(true);
    }
  }

  async function handleOtpVerified(code) {
    setLoading(true);
    try {
      const u = await signup({ ...pendingPayload, otp: code });
      setOtpOpen(false);

      const redirectUrl = searchParams.get("redirect");
      if (redirectUrl && redirectUrl.startsWith("/")) {
        navigate(redirectUrl);
      } else if (u.role === "Household") {
        navigate("/household");
      } else if (u.role === "Provider") {
        navigate("/provider");
      } else {
        navigate("/admin");
      }
    } catch (e2) {
      throw e2;
    } finally {
      setLoading(false);
    }
  }

  async function verifyWrapper(code) {
    try {
      await handleOtpVerified(code);
    } catch (e) {
      const m = e.response?.data?.message || "";
      if (/OTP|Incorrect|expired|attempt|code|verified/i.test(m)) throw e;
      setOtpOpen(false);
      setErr(m || "Registration failed. Please try again.");
    }
  }

  return (
    <AuthShell
      title="Join the Cooperative Economy."
      subtitle="Connect, work, and build wealth in a verified, community-governed ecosystem."
      back="/"
      backLabel="Back to Home"
    >
      <div className="w-full space-y-3">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
            Create Account
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {role === "Household" && "Instant consumer onboarding for home services"}
            {role === "Provider" && `Step ${step} of 3: Worker Identity & Skill Verification`}
            {role === "Cooperative Admin" && `Step ${step} of 3: Society Statutory Registration`}
          </p>
        </div>

        {/* ── Role Selector ── */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          {ROLES.map((r) => {
            const IconComp = r.icon;
            const isSelected = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => { setRole(r.value); setStep(1); setErr(""); }}
                className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#00288e] text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <IconComp size={15} />
                <span className="truncate">{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Enterprise 3-Step Breadcrumbs (for Gig Worker & Cooperative) ── */}
        {role !== "Household" && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-bold ${
                step > 1 ? "bg-emerald-600 text-white" : step === 1 ? "bg-[#00288e] text-white" : "bg-slate-800 text-slate-400"
              }`}>
                {step > 1 ? "✓" : "1"}
              </span>
              <span className={step >= 1 ? "font-bold text-slate-200" : "text-slate-500"}>
                {role === "Provider" ? "Profile" : "Society Info"}
              </span>
            </div>

            <span className="text-slate-600">─</span>

            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-bold ${
                step > 2 ? "bg-emerald-600 text-white" : step === 2 ? "bg-[#00288e] text-white" : "bg-slate-800 text-slate-400"
              }`}>
                {step > 2 ? "✓" : "2"}
              </span>
              <span className={step >= 2 ? "font-bold text-slate-200" : "text-slate-500"}>
                {role === "Provider" ? "Cooperative & ID" : "Governance"}
              </span>
            </div>

            <span className="text-slate-600">─</span>

            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-bold ${
                step === 3 ? "bg-[#00288e] text-white" : "bg-slate-800 text-slate-400"
              }`}>
                3
              </span>
              <span className={step === 3 ? "font-bold text-slate-200" : "text-slate-500"}>
                Documents
              </span>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-lg bg-red-950/60 border border-red-800/80 px-3 py-1.5 flex items-center gap-2 text-red-200 text-xs font-semibold">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* 1. HOUSEHOLD ONBOARDING                                     */}
        {/* ─────────────────────────────────────────────────────────── */}
        {role === "Household" && (
          <form onSubmit={submitFinal} className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full h-9 px-3 rounded-lg border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-2 my-1">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">or sign up with email</span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>

            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Himanshu Jha"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Email Address *</label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="name@domain.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Mobile (Phone)</label>
                <input
                  type="tel" value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 9876543210"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} required minLength={8}
                    value={form.password} onChange={(e) => set("password", e.target.value)}
                    placeholder="8+ characters"
                    className={inputCls + " pr-8"}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"} required minLength={8}
                    value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                    placeholder="Re-enter password"
                    className={inputCls + " pr-8"}
                  />
                  <button
                    type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full h-10 mt-2 rounded-lg bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {loading ? "Creating..." : "Create Household Account"}
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* 2. GIG WORKER 3-STEP ONBOARDING                             */}
        {/* ─────────────────────────────────────────────────────────── */}
        {role === "Provider" && (
          <div>
            {/* STEP 1: Personal & Trade Details */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Full Legal Name *</label>
                    <input
                      type="text" required value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Ramesh Kumar"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Mobile (Phone) *</label>
                    <input
                      type="tel" required value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+91 9876543210"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email Address *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="ramesh@worker.in"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Primary Trade Skill</label>
                    <select
                      value={form.primarySkill}
                      onChange={(e) => set("primarySkill", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      {SKILL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Experience (Years)</label>
                    <input
                      type="number" min={1} max={40} value={form.experienceYears}
                      onChange={(e) => set("experienceYears", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Hourly Rate (₹)</label>
                    <input
                      type="number" min={100} value={form.hourlyRate}
                      onChange={(e) => set("hourlyRate", e.target.value)}
                      placeholder="350"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Locality / Area</label>
                    <input
                      type="text" value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="e.g. Noida Sector 62"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"} required minLength={8}
                        value={form.password} onChange={(e) => set("password", e.target.value)}
                        placeholder="8+ characters"
                        className={inputCls + " pr-8"}
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"} required minLength={8}
                        value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                        placeholder="Re-enter password"
                        className={inputCls + " pr-8"}
                      />
                      <button
                        type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 mt-2 rounded-lg bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>Next: Cooperative & ID Details</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}

            {/* STEP 2: Cooperative Selection & Govt ID */}
            {step === 2 && (
              <form onSubmit={handleNextStep} className="space-y-2.5">
                <div>
                  <label className={labelCls}>Accredited Cooperative Society *</label>
                  <select
                    value={form.cooperativeId}
                    onChange={(e) => set("cooperativeId", e.target.value)}
                    className={inputCls + " cursor-pointer"}
                  >
                    <option value="">-- Select Cooperative Society --</option>
                    {coops.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Govt ID Type *</label>
                    <select
                      value={form.idType}
                      onChange={(e) => set("idType", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      {GOVT_ID_TYPES.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>ID Document Number *</label>
                    <input
                      type="text" required value={form.idNumber}
                      onChange={(e) => set("idNumber", e.target.value)}
                      placeholder="XXXX-XXXX-XXXX"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Upload Government ID Document (PDF / Photo) *</label>
                  <FileUpload
                    label={`Upload ${form.idType}`}
                    folder="sahakargig/kyc"
                    multiple={false}
                    onSelect={(url) => set("idDocUrl", url)}
                  />
                  {form.idDocUrl && (
                    <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                      <CheckCircle2 size={13} /> Document uploaded successfully
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button" onClick={() => setStep(1)}
                    className="h-10 px-4 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 rounded-lg bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Next: Certifications & Clearance</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Trade Certifications & Police Verification */}
            {step === 3 && (
              <form onSubmit={submitFinal} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Trade / Skill Certificate</label>
                    <FileUpload
                      label="Skill Proof"
                      folder="sahakargig/certificates"
                      multiple={false}
                      onSelect={(url) => set("skillCertUrl", url)}
                    />
                    {form.skillCertUrl && (
                      <p className="text-[10.5px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Uploaded
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Police Clearance (PCC)</label>
                    <FileUpload
                      label="Police PCC"
                      folder="sahakargig/police"
                      multiple={false}
                      onSelect={(url) => set("policeVerificationUrl", url)}
                    />
                    {form.policeVerificationUrl && (
                      <p className="text-[10.5px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Uploaded
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Direct Escrow Payout UPI ID</label>
                  <input
                    type="text" value={form.payoutUpi}
                    onChange={(e) => set("payoutUpi", e.target.value)}
                    placeholder="ramesh@okaxis"
                    className={inputCls}
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/60 text-[11px] text-blue-200">
                  <p className="font-semibold text-blue-300 flex items-center gap-1 mb-0.5">
                    <ShieldCheck size={14} /> Cooperative Verification Gate
                  </p>
                  Your credentials will be audited by the cooperative society board. Active dispatching unlocks upon approval.
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button" onClick={() => setStep(2)}
                    className="h-10 px-4 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="submit" disabled={loading}
                    className="flex-1 h-10 rounded-lg bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {loading ? "Submitting..." : "Submit Application & Verify Email"}
                    <Check size={14} />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* 3. COOPERATIVE SOCIETY 3-STEP ONBOARDING                    */}
        {/* ─────────────────────────────────────────────────────────── */}
        {role === "Cooperative Admin" && (
          <div>
            {/* STEP 1: Society Info */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-2.5">
                <div>
                  <label className={labelCls}>Cooperative Society Legal Name *</label>
                  <input
                    type="text" required value={form.coopName}
                    onChange={(e) => set("coopName", e.target.value)}
                    placeholder="Karol Bagh Artisan Cooperative Society"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Reg. ID (MSCS / State) *</label>
                    <input
                      type="text" required value={form.registrationId}
                      onChange={(e) => set("registrationId", e.target.value)}
                      placeholder="MSCS/ND/2021/882"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Official Contact Phone *</label>
                    <input
                      type="tel" required value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+91 11 2578 9900"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>State *</label>
                    <input
                      type="text" required value={form.state}
                      onChange={(e) => set("state", e.target.value)}
                      placeholder="Delhi"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>District *</label>
                    <input
                      type="text" required value={form.district}
                      onChange={(e) => set("district", e.target.value)}
                      placeholder="Central Delhi"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Official Society Email *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="admin@coop.in"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"} required minLength={8}
                        value={form.password} onChange={(e) => set("password", e.target.value)}
                        placeholder="8+ characters"
                        className={inputCls + " pr-8"}
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"} required minLength={8}
                        value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                        placeholder="Re-enter password"
                        className={inputCls + " pr-8"}
                      />
                      <button
                        type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 mt-2 rounded-lg bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>Next: Governance & Leadership</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}

            {/* STEP 2: Governance & Sector */}
            {step === 2 && (
              <form onSubmit={handleNextStep} className="space-y-2.5">
                <div>
                  <label className={labelCls}>President / Secretary Full Name *</label>
                  <input
                    type="text" required value={form.presidentName}
                    onChange={(e) => set("presidentName", e.target.value)}
                    placeholder="Dr. Anil Verma"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Cooperative Sector *</label>
                  <select
                    value={form.sector}
                    onChange={(e) => set("sector", e.target.value)}
                    className={inputCls + " cursor-pointer"}
                  >
                    {COOP_SECTORS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Active Registered Worker Members *</label>
                  <input
                    type="number" min={5} value={form.memberCount}
                    onChange={(e) => set("memberCount", e.target.value)}
                    placeholder="50"
                    className={inputCls}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button" onClick={() => setStep(1)}
                    className="h-10 px-4 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 rounded-lg bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Next: Statutory Documents</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Statutory Document Uploads */}
            {step === 3 && (
              <form onSubmit={submitFinal} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Registration Certificate *</label>
                    <FileUpload
                      label="Upload Reg. Cert"
                      folder="sahakargig/coop-docs"
                      multiple={false}
                      onSelect={(url) => set("coopRegDocUrl", url)}
                    />
                    {form.coopRegDocUrl && (
                      <p className="text-[10.5px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Uploaded
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Society Bylaws (PDF)</label>
                    <FileUpload
                      label="Upload Bylaws"
                      folder="sahakargig/coop-docs"
                      multiple={false}
                      onSelect={(url) => set("bylawsDocUrl", url)}
                    />
                    {form.bylawsDocUrl && (
                      <p className="text-[10.5px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Uploaded
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Cooperative Bank A/C</label>
                    <input
                      type="text" value={form.bankAccount}
                      onChange={(e) => set("bankAccount", e.target.value)}
                      placeholder="998811223344"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Bank IFSC Code</label>
                    <input
                      type="text" value={form.bankIfsc}
                      onChange={(e) => set("bankIfsc", e.target.value)}
                      placeholder="SBIN0001234"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/60 text-[11px] text-blue-200">
                  <p className="font-semibold text-blue-300 flex items-center gap-1 mb-0.5">
                    <Building2 size={14} /> Federation Accreditation Review
                  </p>
                  Your registration documents will be audited by the National Federation Board before accreditation activation.
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button" onClick={() => setStep(2)}
                    className="h-10 px-4 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="submit" disabled={loading}
                    className="flex-1 h-10 rounded-lg bg-[#00288e] hover:bg-[#001f70] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {loading ? "Submitting..." : "Submit Registration Application"}
                    <Check size={14} />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Link */}
        <div className="pt-1 text-center">
          <p className="text-xs text-slate-400">
            Already registered?{" "}
            <Link
              to="/login"
              className="font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer ml-1"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Email OTP verification modal */}
      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title="Confirm your email"
        subtitle={`We've sent a 6-digit confirmation code to ${form.email}. Enter it below to complete registration.`}
        email={form.email.trim()}
        purpose="signup"
        ctaLabel="Verify & Activate"
        onVerify={verifyWrapper}
      />
    </AuthShell>
  );
}
