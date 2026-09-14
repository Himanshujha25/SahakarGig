import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../../i18n";
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

const GOOGLE_ICON = (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const ROLES = [
  { value: "Household",         key: "household",     label: "Household",       desc: "Customer Account",  icon: Home },
  { value: "Provider",          key: "provider",      label: "Gig Worker",      desc: "Service Provider",  icon: Wrench },
  { value: "Cooperative Admin", key: "coopAdmin",     label: "Cooperative",     desc: "Society Entity",    icon: Building },
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

const inputCls = "w-full h-10 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface text-xs placeholder:text-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition shadow-xs font-medium";
const labelCls = "block text-[12px] font-bold text-on-surface mb-1";

// Shared step progress bar for all multi-step signup flows.
function StepBar({ step, total, labels }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">Step {step} of {total}</p>
        <p className="text-[10px] font-bold text-primary">{labels[step - 1]}</p>
      </div>
      <div className="flex gap-1.5">
        {labels.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-primary" : "bg-surface-variant"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Signup() {
  const { t, i18n } = useTranslation();
  const { signup } = useAuth();
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
  const [locatingArea, setLocatingArea] = useState(false);

  const [form, setForm] = useState({
    name: inviteName,
    email: inviteEmail,
    phone: invitePhone,
    password: "",
    confirmPassword: "",
    avatarUrl: "",
    // Household specific
    householdAddress: "",
    householdCity: "",
    householdPincode: "",
    householdState: "",
    bio: "",
    householdSize: "",
    prefLang: i18n.language || "en",
    emergencyContactName: "",
    emergencyContactPhone: "",
    specialInstructions: "",
    location: "",
    // Provider specific
    primarySkill: inviteSkill || "",
    experienceYears: "",
    hourlyRate: "",
    address: "",
    cooperativeId: "",
    idType: "",
    idNumber: "",
    idDocUrl: "",
    skillCertUrl: "",
    policeVerificationUrl: "",
    payoutUpi: "",
    // Cooperative Admin specific
    coopName: "",
    registrationId: "",
    state: "",
    district: "",
    coopAddress: "",
    secretaryName: "",
    foundedYear: "",
    presidentName: "",
    sector: "",
    memberCount: "",
    commissionRate: "",
    welfareFundAllocation: "",
    coopRegDocUrl: "",
    bylawsDocUrl: "",
    societyPanDocUrl: "",
    bankAccount: "",
    bankIfsc: "",
    bankName: "",
    bankHolderName: "",
  });

  useEffect(() => {
    if (i18n.language && form.prefLang !== i18n.language) {
      setForm((f) => ({ ...f, prefLang: i18n.language }));
    }
  }, [i18n.language]);

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

  // Google OAuth: verify identity then auto-fill the form so the user only
  // needs to complete the remaining role-specific fields before submitting.
  const googleAutoFill = useGoogleLogin({
    flow: 'auth-code',
    ux_mode: 'popup',
    onSuccess: async (tokenResponse) => {
      setErr("");
      setLoading(true);
      try {
        const payload = {
          credential: tokenResponse.credential || tokenResponse.id_token,
          code: tokenResponse.code,
        };
        const { data } = await api.post("/auth/google/profile", payload);
        const profile = data.profile || {};
        const gEmail = profile.email || "";
        const gName = profile.name || "";
        const gPicture = profile.avatarUrl || "";

        setForm((f) => ({
          ...f,
          name: f.name || gName,
          email: gEmail,
          avatarUrl: gPicture,
          presidentName: f.presidentName || gName,
          coopName: f.coopName || "",
          bio: f.bio || "",
        }));

        if (profile.givenName) {
          setForm((f) => ({ ...f, coopName: f.coopName || `${profile.givenName}'s Cooperative` }));
        }

        if (data.emailRegistered) {
          setErr("This Google account is already registered. Please sign in instead.");
        } else {
          setErr("");
        }
        setLoading(false);
      } catch (e) {
        setLoading(false);
        setErr(e.response?.data?.message || "Google sign-in failed. Please use standard email signup.");
      }
    },
    onError: () => {
      setLoading(false);
      setErr("Google sign-in was cancelled or failed. Please try again.");
    },
  });

  async function detectArea() {
    if (!("geolocation" in navigator)) {
      setErr("Geolocation is not supported on this device. Please enter your area manually.");
      return;
    }
    setLocatingArea(true);
    setErr("");
    try {
      const getFix = () => new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      );
      let { latitude, longitude, accuracy } = (await getFix()).coords;

      const refined = await new Promise((resolve) => {
        let best = { latitude, longitude, accuracy };
        if (best.accuracy <= 25) return resolve(best);
        const watchId = navigator.geolocation.watchPosition(
          (p) => {
            if (p.coords.accuracy < best.accuracy) best = p.coords;
            if (best.accuracy <= 25) {
              navigator.geolocation.clearWatch(watchId);
              resolve(best);
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 0 }
        );
        setTimeout(() => {
          navigator.geolocation.clearWatch(watchId);
          resolve(best);
        }, 10000);
      });
      latitude = refined.latitude;
      longitude = refined.longitude;
      accuracy = refined.accuracy;

      let locality = "";
      let city = "";
      let state = "";
      let pincode = "";
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        );
        const data = await resp.json();
        const addr = data?.address || {};

        const parts = [
          [addr.house_number, addr.road].filter(Boolean).join(" "),
          addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || "",
        ].filter(Boolean);

        locality = parts.join(", ") ||
          addr.road || addr.town || addr.village || addr.city || addr.state || "";

        city = addr.city || addr.town || addr.village || addr.county || "";
        state = addr.state || "";
        pincode = addr.postcode || "";
      } catch {
        locality = "";
      }

      setForm((f) => ({
        ...f,
        address: locality || f.address,
        householdAddress: locality || f.householdAddress,
        householdCity: city || f.householdCity,
        householdState: state || f.householdState,
        householdPincode: pincode || f.householdPincode,
        location: { lat: latitude, lng: longitude },
      }));
      if (locality) {
        setErr("");
        if (accuracy > 100) {
          setErr("Location detected, but GPS accuracy was low (±" + Math.round(accuracy) + " m). Please double-check the address fields.");
        }
      }
    } catch {
      setErr(
        "Could not detect your location. Please allow location access in the browser and try again, or enter your area manually."
      );
    } finally {
      setLocatingArea(false);
    }
  }

  function validateIdNumber(type, value) {
    const v = value.replace(/[\s-]/g, "");
    switch (type) {
      case "Aadhaar Card":
        return /^\d{12}$/.test(v) ? "" : "Aadhaar number must be exactly 12 digits (you entered " + v.length + ").";
      case "PAN Card":
        return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()) ? "" : "PAN must be 10 characters in ABCDE1234F format.";
      case "Voter ID Card":
        return /^[A-Z]{3}\d{7}$/.test(v.toUpperCase()) ? "" : "Voter ID must be 3 letters followed by 7 digits (e.g. ABC1234567).";
      case "Driving License":
        return v.length >= 8 ? "" : "Driving License number looks too short (min 8 characters).";
      default:
        return v.length >= 6 ? "" : "Please enter a valid ID number (min 6 characters).";
    }
  }

  function handleNextStep(e) {
    if (e) e.preventDefault();
    setErr("");

    if (role === "Household") {
      if (step === 1) {
        if (!form.name.trim()) return setErr("Please enter your name.");
        if (!EMAIL_RE.test(form.email.trim())) return setErr("Please enter a valid email address.");
        if (!form.password || form.password.length < 8) return setErr("Password must be at least 8 characters.");
        if (form.password !== form.confirmPassword) return setErr("Passwords do not match. Please re-enter.");
        setStep(2);
      }
      return;
    }

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
        const idErr = validateIdNumber(form.idType, form.idNumber);
        if (idErr) return setErr(idErr);
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
        role: "Household",
        avatarUrl: form.avatarUrl,
        bio: form.bio,
        address: form.householdAddress,
        householdSize: form.householdSize ? Number(form.householdSize) : undefined,
        prefLang: form.prefLang,
        location: form.householdCity
          ? `${form.householdCity}${form.householdState ? ", " + form.householdState : ""}`
          : "",
        emergencyContact: {
          name: form.emergencyContactName,
          phone: form.emergencyContactPhone,
        },
        specialInstructions: form.specialInstructions,
        geoLocation:
          form.location && form.location.lat !== undefined && form.location.lng !== undefined
            ? form.location
            : undefined,
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
          region: [form.district, form.state].filter(Boolean).join(", "),
          district: form.district,
          state: form.state,
          address: form.coopAddress,
          presidentName: form.presidentName,
          secretaryName: form.secretaryName,
          foundedYear: form.foundedYear,
          sector: form.sector,
          memberCount: Number(form.memberCount) || 25,
          commissionRate: Number(form.commissionRate) || 8,
          welfareFundAllocation: Number(form.welfareFundAllocation) || 10,
          documents,
          payoutBank: {
            holderName: form.bankHolderName,
            accountNumber: form.bankAccount,
            ifsc: form.bankIfsc,
            bankName: form.bankName,
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
      title={t('joinCoopEconomy', "Join the Cooperative Economy.")}
      subtitle={t('joinCoopSubtitle', "Connect, work, and build wealth in a verified, community-governed ecosystem.")}
      back="/"
      backLabel={t('backToHome', "Back to Home")}
    >
      <div className="w-full space-y-3.5">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight leading-tight">
            {t('createAccount', "Create Account")}
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 font-medium">
            {role === "Household" && `${t('step', 'Step')} ${step} ${t('of', 'of')} 2: ${t('homeServicesOnboarding', 'Home Services Onboarding')}`}
            {role === "Provider" && `${t('step', 'Step')} ${step} ${t('of', 'of')} 3: ${t('workerIdentitySkillVerify', 'Worker Identity & Skill Verification')}`}
            {role === "Cooperative Admin" && `${t('step', 'Step')} ${step} ${t('of', 'of')} 3: ${t('societyStatutoryReg', 'Society Statutory Registration')}`}
          </p>
        </div>

        {/* ── Role Selector ── */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-surface-container-low border border-outline-variant/80 shadow-xs">
          {ROLES.map((r) => {
            const IconComp = r.icon;
            const isSelected = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => { setRole(r.value); setStep(1); setErr(""); }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/60"
                }`}
              >
                <IconComp size={15} />
                <span className="truncate">{t(r.key, r.label)}</span>
              </button>
            );
          })}
        </div>

        {/* ── Enterprise Step Breadcrumbs (all roles) ── */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/80 text-xs shadow-xs">
          {(role === "Household"
            ? [t('login', "Login"), t('addressAndHousehold', "Address & Household")]
            : role === "Provider"
              ? [t('profile', "Profile"), t('coopAndId', "Cooperative & ID"), t('documents', "Documents")]
              : [t('societyInfo', "Society Info"), t('governance', "Governance"), t('documents', "Documents")]
          ).map((label, idx) => {
            const n = idx + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={label} className="flex items-center gap-1.5 flex-1 justify-center">
                {idx > 0 && <span className="text-outline-variant mr-1.5">─</span>}
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-bold ${
                  done ? "bg-emerald-600 text-white" : active ? "bg-primary text-on-primary shadow-xs" : "bg-surface-variant text-on-surface-variant/70"
                }`}>
                  {done ? "✓" : n}
                </span>
                <span className={step >= n ? "font-bold text-on-surface" : "text-on-surface-variant/60"}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {err && (
          <div className="rounded-xl bg-error-container border border-error/20 px-3.5 py-2.5 flex items-center gap-2.5 text-on-error-container text-xs font-medium shadow-xs">
            <AlertCircle size={15} className="text-error shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* 1. HOUSEHOLD ONBOARDING                                     */}
        {/* ─────────────────────────────────────────────────────────── */}
        {role === "Household" && (
          <div>
          {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-3">
            <button
              type="button"
              onClick={googleAutoFill}
              disabled={loading}
              className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              {GOOGLE_ICON}
              <span>{loading ? t('signingIn', "Connecting…") : t('autoFillWithGoogle', "Auto-fill with Google")}</span>
            </button>

            <StepBar step={step} total={2} labels={[t('personalAndLogin', "Personal & Login"), t('addressAndHousehold', "Address & Household")]} />

            <div className="flex items-center gap-2 my-1.5">
              <div className="h-px bg-outline-variant flex-1" />
              <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">{t('orSignUpWithEmail', "OR SIGN UP WITH EMAIL")}</span>
              <div className="h-px bg-outline-variant flex-1" />
            </div>

            <div>
              <label className={labelCls}>{t('fullName', "Full Name")} *</label>
              <input
                type="text" required value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t('enterFullName', "Enter your full name")}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>{t('preferredLanguage', "Preferred Language")}</label>
              <select
                value={form.prefLang || i18n.language}
                onChange={(e) => {
                  const code = e.target.value;
                  set("prefLang", code);
                  i18n.changeLanguage(code);
                }}
                className={inputCls + " cursor-pointer"}
              >
                <option value="" disabled>{t('selectPreferredLanguage', "Select preferred language")}</option>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.native} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelCls}>{t('emailAddress', "Email Address")} *</label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="name@domain.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('mobilePhone', "Mobile (Phone)")}</label>
                <input
                  type="tel" value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 9876543210"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelCls}>{t('password', "Password")} *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} required minLength={8}
                    value={form.password} onChange={(e) => set("password", e.target.value)}
                    placeholder={t('eightPlusChars', "8+ characters")}
                    className={inputCls + " pr-9"}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('confirmPassword', "Confirm Password")} *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"} required minLength={8}
                    value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                    placeholder={t('reEnterPassword', "Re-enter password")}
                    className={inputCls + " pr-9"}
                  />
                  <button
                    type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-10 mt-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-[0_4px_14px_rgba(30,107,101,0.3)] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>{t('nextAddressDetails', "Next: Address & Household Details")}</span>
              <ArrowRight size={14} />
            </button>
          </form>
          )}

          {step === 2 && (
          <form onSubmit={submitFinal} className="space-y-3">
            {/* Residential Address */}
            <div>
              <label className={labelCls}>{t('houseStreetAddress', "House / Street Address")}</label>
              <input
                type="text" value={form.householdAddress}
                onChange={(e) => set("householdAddress", e.target.value)}
                placeholder={t('houseStreetPlaceholder', "House no, society, street")}
                className={inputCls}
              />
              <button
                type="button"
                onClick={detectArea}
                disabled={locatingArea}
                className="mt-1.5 w-full h-8 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
              >
                <MapPin size={13} />
                {locatingArea ? t('detectingLocation', "Detecting your location…") : t('useCurrentLocation', "📍 Use my current location")}
              </button>
              <p className="text-[10.5px] text-on-surface-variant/70 mt-1">{t('autoFillGpsNote', "Auto-fills address, city & state from your GPS.")}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>{t('city', "City")}</label>
                <input
                  type="text" value={form.householdCity}
                  onChange={(e) => set("householdCity", e.target.value)}
                  placeholder="Mumbai"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('state', "State")}</label>
                <input
                  type="text" value={form.householdState}
                  onChange={(e) => set("householdState", e.target.value)}
                  placeholder="Maharashtra"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('pinCode', "PIN Code")}</label>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  value={form.householdPincode}
                  onChange={(e) => set("householdPincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="400001"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelCls}>{t('householdSize', "Household Size")}</label>
                <input
                  type="number" min={1} max={30} value={form.householdSize}
                  onChange={(e) => set("householdSize", e.target.value)}
                  placeholder="e.g. 4"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('emergencyContactName', "Emergency Contact Name")}</label>
                <input
                  type="text" value={form.emergencyContactName}
                  onChange={(e) => set("emergencyContactName", e.target.value)}
                  placeholder="Next of kin"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>{t('emergencyContactPhone', "Emergency Contact Phone")}</label>
              <input
                type="tel" value={form.emergencyContactPhone}
                onChange={(e) => set("emergencyContactPhone", e.target.value)}
                placeholder="+91 9XXXXXXXXX"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>{t('aboutYouSpecialInstructions', "About You / Special Instructions")}</label>
              <textarea
                rows={2} value={form.specialInstructions}
                onChange={(e) => set("specialInstructions", e.target.value)}
                placeholder="Any access notes, preferred service timings, health/preferences for service visits"
                className={inputCls + " resize-none"}
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button" onClick={() => setStep(1)}
                className="h-10 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-high cursor-pointer shadow-xs"
              >
                <ArrowLeft size={14} /> {t('back', "Back")}
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-[0_4px_14px_rgba(30,107,101,0.3)] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {loading ? t('creating', "Creating...") : t('createHouseholdAccount', "Create Household Account")}
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
          )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* 2. GIG WORKER 3-STEP ONBOARDING                             */}
        {/* ─────────────────────────────────────────────────────────── */}
        {role === "Provider" && (
          <div>
            <StepBar step={step} total={3} labels={[t('personalAndTrade', "Personal & Trade"), t('coopAndId', "Cooperative & ID"), t('certifications', "Certifications")]} />
            {/* STEP 1: Personal & Trade Details */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-3">
                <button
                  type="button"
                  onClick={googleAutoFill}
                  disabled={loading}
                  className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  {GOOGLE_ICON}
                  <span>{loading ? t('signingIn', "Connecting…") : t('autoFillWithGoogle', "Auto-fill with Google")}</span>
                </button>
                <div className="flex items-center gap-2 my-1.5">
                  <div className="h-px bg-outline-variant flex-1" />
                  <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">{t('orFillManually', "OR FILL MANUALLY")}</span>
                  <div className="h-px bg-outline-variant flex-1" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('fullLegalName', "Full Legal Name")} *</label>
                    <input
                      type="text" required value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder={t('enterFullLegalName', "Enter your full legal name")}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('mobilePhone', "Mobile (Phone)")} *</label>
                    <input
                      type="tel" required value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+91 9876543210"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{t('emailAddress', "Email Address")} *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('primaryTradeSkill', "Primary Trade Skill")}</label>
                    <select
                      value={form.primarySkill}
                      onChange={(e) => set("primarySkill", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      <option value="" disabled>{t('selectPrimarySkill', "Select your primary skill")}</option>
                      {SKILL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t('experienceYears', "Experience (Years)")}</label>
                    <input
                      type="number" min={1} max={40} value={form.experienceYears}
                      onChange={(e) => set("experienceYears", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('hourlyRate', "Hourly Rate (₹)")}</label>
                    <input
                      type="number" min={100} value={form.hourlyRate}
                      onChange={(e) => set("hourlyRate", e.target.value)}
                      placeholder="350"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('localityArea', "Locality / Area")}</label>
                    <input
                      type="text" value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="e.g. Noida Sector 62"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={detectArea}
                      disabled={locatingArea}
                      className="mt-1.5 w-full h-8 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                    >
                      {MapPin ? <MapPin size={13} /> : null}
                      {locatingArea ? t('detectingLocation', "Detecting your location…") : t('useCurrentLocation', "📍 Use my current location")}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('password', "Password")} *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"} required minLength={8}
                        value={form.password} onChange={(e) => set("password", e.target.value)}
                        placeholder={t('eightPlusChars', "8+ characters")}
                        className={inputCls + " pr-9"}
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{t('confirmPassword', "Confirm Password")} *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"} required minLength={8}
                        value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                        placeholder={t('reEnterPassword', "Re-enter password")}
                        className={inputCls + " pr-9"}
                      />
                      <button
                        type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 mt-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-[0_4px_14px_rgba(30,107,101,0.3)] flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>{t('nextCoopDetails', "Next: Cooperative & ID Details")}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}

            {/* STEP 2: Cooperative Selection & Govt ID */}
            {step === 2 && (
              <form onSubmit={handleNextStep} className="space-y-3">
                <div>
                  <label className={labelCls}>{t('accreditedCoop', "Accredited Cooperative Society")} *</label>
                  <select
                    value={form.cooperativeId}
                    onChange={(e) => set("cooperativeId", e.target.value)}
                    className={inputCls + " cursor-pointer"}
                  >
                    <option value="">{t('selectCoopSociety', "-- Select Cooperative Society --")}</option>
                    {coops.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('govtIdType', "Govt ID Type")} *</label>
                    <select
                      required
                      value={form.idType}
                      onChange={(e) => set("idType", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      <option value="" disabled>{t('selectIdType', "Select ID type")}</option>
                      {GOVT_ID_TYPES.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t('idDocNumber', "ID Document Number")} *</label>
                    <input
                      type="text" required value={form.idNumber}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (form.idType === "Aadhaar Card") {
                          set("idNumber", raw.replace(/\D/g, "").slice(0, 12));
                        } else if (form.idType === "PAN Card") {
                          set("idNumber", raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
                        } else {
                          set("idNumber", raw);
                        }
                      }}
                      maxLength={form.idType === "Aadhaar Card" ? 12 : form.idType === "PAN Card" ? 10 : undefined}
                      placeholder={
                        form.idType === "Aadhaar Card" ? "12-digit Aadhaar number"
                        : form.idType === "PAN Card" ? "ABCDE1234F"
                        : "Enter ID number"
                      }
                      className={inputCls}
                    />
                    {form.idType === "Aadhaar Card" && (
                      <p className="text-[10.5px] text-on-surface-variant/70 mt-1">{t('aadhaarFormatNote', "Exactly 12 digits, numbers only — no spaces or dashes.")}</p>
                    )}
                    {form.idType === "PAN Card" && (
                      <p className="text-[10.5px] text-on-surface-variant/70 mt-1">{t('panFormatNote', "10 characters in ABCDE1234F format.")}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{t('uploadGovtIdDoc', "Upload Government ID Document (PDF / Photo)")} *</label>
                  <FileUpload
                    label={`Upload ${form.idType}`}
                    folder="sahakargig/kyc"
                    multiple={false}
                    onSelect={(url) => set("idDocUrl", url)}
                  />
                  {form.idDocUrl && (
                    <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                      <CheckCircle2 size={13} /> {t('docUploadedSuccess', "Document uploaded successfully")}
                    </p>
                  )}
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button" onClick={() => setStep(1)}
                    className="h-10 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-high cursor-pointer shadow-xs"
                  >
                    <ArrowLeft size={14} /> {t('back', "Back")}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-[0_4px_14px_rgba(30,107,101,0.3)] flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>{t('nextCertifications', "Next: Certifications & Clearance")}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Trade Certifications & Police Verification */}
            {step === 3 && (
              <form onSubmit={submitFinal} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('tradeSkillCert', "Trade / Skill Certificate")}</label>
                    <FileUpload
                      label="Skill Proof"
                      folder="sahakargig/certificates"
                      multiple={false}
                      onSelect={(url) => set("skillCertUrl", url)}
                    />
                    {form.skillCertUrl && (
                      <p className="text-[10.5px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Uploaded
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>{t('policeClearancePcc', "Police Clearance (PCC)")}</label>
                    <FileUpload
                      label="Police PCC"
                      folder="sahakargig/police"
                      multiple={false}
                      onSelect={(url) => set("policeVerificationUrl", url)}
                    />
                    {form.policeVerificationUrl && (
                      <p className="text-[10.5px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Uploaded
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{t('directEscrowUpi', "Direct Escrow Payout UPI ID")}</label>
                  <input
                    type="text" value={form.payoutUpi}
                    onChange={(e) => set("payoutUpi", e.target.value)}
                    placeholder="yourupi@bank"
                    className={inputCls}
                  />
                </div>

                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-[11.5px] text-on-surface">
                  <p className="font-bold text-primary flex items-center gap-1 mb-0.5">
                    <ShieldCheck size={14} /> {t('coopVerifyGateTitle', "Cooperative Verification Gate")}
                  </p>
                  {t('coopVerifyGateDesc', "Your credentials will be audited by the cooperative society board. Active dispatching unlocks upon approval.")}
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button" onClick={() => setStep(2)}
                    className="h-10 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-high cursor-pointer shadow-xs"
                  >
                    <ArrowLeft size={14} /> {t('back', "Back")}
                  </button>
                  <button
                    type="submit" disabled={loading}
                    className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-[0_4px_14px_rgba(30,107,101,0.3)] flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {loading ? t('submitting', "Submitting...") : t('submitAppVerifyEmail', "Submit Application & Verify Email")}
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
            <StepBar step={step} total={3} labels={[t('societyInfo', "Society Info"), t('governance', "Governance & Sector"), t('documents', "Documents")]} />
            {/* STEP 1: Society Info */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-3">
                <button
                  type="button"
                  onClick={googleAutoFill}
                  disabled={loading}
                  className="w-full h-10 px-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  {GOOGLE_ICON}
                  <span>{loading ? t('signingIn', "Connecting…") : t('autoFillWithGoogle', "Auto-fill with Google")}</span>
                </button>
                <div className="flex items-center gap-2 my-1.5">
                  <div className="h-px bg-outline-variant flex-1" />
                  <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">{t('orFillManually', "OR FILL MANUALLY")}</span>
                  <div className="h-px bg-outline-variant flex-1" />
                </div>
                <div>
                  <label className={labelCls}>{t('coopLegalName', "Cooperative Society Legal Name")} *</label>
                  <input
                    type="text" required value={form.coopName}
                    onChange={(e) => set("coopName", e.target.value)}
                    placeholder={t('enterCoopLegalName', "Enter society legal name")}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('regIdMscs', "Reg. ID (MSCS / State)")} *</label>
                    <input
                      type="text" required value={form.registrationId}
                      onChange={(e) => set("registrationId", e.target.value)}
                      placeholder="MSCS/ND/2021/882"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('officialContactPhone', "Official Contact Phone")} *</label>
                    <input
                      type="tel" required value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+91 11 2578 9900"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('state', "State")} *</label>
                    <input
                      type="text" required value={form.state}
                      onChange={(e) => set("state", e.target.value)}
                      placeholder="Delhi"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('district', "District")} *</label>
                    <input
                      type="text" required value={form.district}
                      onChange={(e) => set("district", e.target.value)}
                      placeholder="Central Delhi"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{t('registeredOfficeAddress', "Registered Office Address")}</label>
                  <textarea
                    rows={2} value={form.coopAddress}
                    onChange={(e) => set("coopAddress", e.target.value)}
                    placeholder={t('fullOfficeAddressPlaceholder', "Full society office address")}
                    className={inputCls + " resize-none"}
                  />
                </div>

                <div>
                  <label className={labelCls}>{t('yearOfEstablishment', "Year of Establishment")}</label>
                  <input
                    type="text" value={form.foundedYear}
                    onChange={(e) => set("foundedYear", e.target.value)}
                    placeholder="e.g. 2015"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>{t('officialSocietyEmail', "Official Society Email")} *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="admin@coop.in"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('password', "Password")} *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"} required minLength={8}
                        value={form.password} onChange={(e) => set("password", e.target.value)}
                        placeholder={t('eightPlusChars', "8+ characters")}
                        className={inputCls + " pr-9"}
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{t('confirmPassword', "Confirm Password")} *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"} required minLength={8}
                        value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                        placeholder={t('reEnterPassword', "Re-enter password")}
                        className={inputCls + " pr-9"}
                      />
                      <button
                        type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-10 mt-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-[0_4px_14px_rgba(30,107,101,0.3)] flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>{t('nextGovernance', "Next: Governance & Leadership")}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}

            {/* STEP 2: Governance & Sector */}
            {step === 2 && (
              <form onSubmit={handleNextStep} className="space-y-3">
                <div>
                  <label className={labelCls}>{t('presidentSecretaryName', "President / Secretary Full Name")} *</label>
                  <input
                    type="text" required value={form.presidentName}
                    onChange={(e) => set("presidentName", e.target.value)}
                    placeholder={t('enterPresidentName', "Enter president's full name")}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('secretaryName', "Society Secretary Name")}</label>
                    <input
                      type="text" value={form.secretaryName}
                      onChange={(e) => set("secretaryName", e.target.value)}
                      placeholder={t('secretaryPlaceholder', "Secretary of the society")}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('commissionRate', "Commission Rate (%)")}</label>
                    <input
                      type="number" step="0.5" min={0} max={50} value={form.commissionRate}
                      onChange={(e) => set("commissionRate", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{t('coopSector', "Cooperative Sector")} *</label>
                  <select
                    value={form.sector}
                    onChange={(e) => set("sector", e.target.value)}
                    className={inputCls + " cursor-pointer"}
                  >
                    <option value="" disabled>{t('selectCoopSector', "Select cooperative sector")}</option>
                    {COOP_SECTORS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>{t('activeMemberCount', "Active Registered Worker Members")} *</label>
                  <input
                    type="number" min={5} value={form.memberCount}
                    onChange={(e) => set("memberCount", e.target.value)}
                    placeholder="50"
                    className={inputCls}
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button" onClick={() => setStep(1)}
                    className="h-10 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-high cursor-pointer shadow-xs"
                  >
                    <ArrowLeft size={14} /> {t('back', "Back")}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-[0_4px_14px_rgba(30,107,101,0.3)] flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>{t('nextStatutoryDocs', "Next: Statutory Documents")}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Statutory Document Uploads */}
            {step === 3 && (
              <form onSubmit={submitFinal} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('regCertDoc', "Registration Certificate")} *</label>
                    <FileUpload
                      label="Upload Reg. Cert"
                      folder="sahakargig/coop-docs"
                      multiple={false}
                      onSelect={(url) => set("coopRegDocUrl", url)}
                    />
                    {form.coopRegDocUrl && (
                      <p className="text-[10.5px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Uploaded
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>{t('societyBylawsPdf', "Society Bylaws (PDF)")}</label>
                    <FileUpload
                      label="Upload Bylaws"
                      folder="sahakargig/coop-docs"
                      multiple={false}
                      onSelect={(url) => set("bylawsDocUrl", url)}
                    />
                    {form.bylawsDocUrl && (
                      <p className="text-[10.5px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> Uploaded
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('accountHolderName', "Account Holder Name")}</label>
                    <input
                      type="text" value={form.bankHolderName}
                      onChange={(e) => set("bankHolderName", e.target.value)}
                      placeholder="Society name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('bankName', "Bank Name")}</label>
                    <input
                      type="text" value={form.bankName}
                      onChange={(e) => set("bankName", e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>{t('coopBankAcc', "Cooperative Bank A/C")}</label>
                    <input
                      type="text" value={form.bankAccount}
                      onChange={(e) => set("bankAccount", e.target.value)}
                      placeholder="998811223344"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('bankIfscCode', "Bank IFSC Code")}</label>
                    <input
                      type="text" value={form.bankIfsc}
                      onChange={(e) => set("bankIfsc", e.target.value)}
                      placeholder="SBIN0001234"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-[11.5px] text-on-surface">
                  <p className="font-bold text-primary flex items-center gap-1 mb-0.5">
                    <Building2 size={14} /> {t('federationReviewTitle', "Federation Accreditation Review")}
                  </p>
                  {t('federationReviewDesc', "Your registration documents will be audited by the National Federation Board before accreditation activation.")}
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button" onClick={() => setStep(2)}
                    className="h-10 px-4 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-high cursor-pointer shadow-xs"
                  >
                    <ArrowLeft size={14} /> {t('back', "Back")}
                  </button>
                  <button
                    type="submit" disabled={loading}
                    className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-[0_4px_14px_rgba(30,107,101,0.3)] flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {loading ? t('submitting', "Submitting...") : t('submitRegApp', "Submit Registration Application")}
                    <Check size={14} />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Link */}
        <div className="pt-2 text-center">
          <p className="text-xs text-on-surface-variant font-medium">
            {t('alreadyRegistered', "Already registered?")}{" "}
            <Link
              to="/login"
              className="font-bold text-primary hover:underline cursor-pointer ml-1"
            >
              {t('signIn', "Sign In")}
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
