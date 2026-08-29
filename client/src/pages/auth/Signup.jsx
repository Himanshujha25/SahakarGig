import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Icon from "../../components/Icon";
import AuthShell from "../../components/AuthShell";
import OtpModal from "../../components/OtpModal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBoqNwMxz89ThfO04GrechILX6d7P7jQC29TiL-bJp1Z_rv7BUIVUv3vfudaddaI88MO_bJ6EyCpehmz15WPybx_G_pbOiBHhbE0-q8f4JBKgdXUQpeRQVuJnopnwjQ32XMwTWgY_Zg3kx3Xic2v2GVRdypB3_TeHTi1J66Wpwrk6qPCYE9o5gSSylqb51PWwMQkkwKYsbO_JbC9mfSdWuoXk0IzPSz7ZECOXMbw_-oQbqrbuOfnQ";

const ROLES = [
  { value: "Household",         label: "Household",       icon: "home" },
  { value: "Provider",          label: "Service Provider", icon: "handyman" },
  { value: "Cooperative Admin", label: "Cooperative",      icon: "domain" },
];

const inputCls = "block w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface text-[13.5px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteName = searchParams.get("name") || "";
  const inviteEmail = searchParams.get("email") || "";
  const invitePhone = searchParams.get("phone") || "";
  const inviteCoopName = searchParams.get("coopName") || "";
  const inviteSkill = searchParams.get("skill") || "";

  const [form, setForm] = useState({
    name: inviteName,
    email: inviteEmail,
    phone: invitePhone,
    password: "",
    role: inviteName || inviteEmail ? "Provider" : "",
    cooperativeId: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [coops, setCoops] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  useEffect(() => {
    if (inviteName || inviteEmail) {
      setForm((f) => ({
        ...f,
        name: inviteName || f.name,
        email: inviteEmail || f.email,
        phone: invitePhone || f.phone,
        role: "Provider"
      }));
    }
  }, [inviteName, inviteEmail, invitePhone]);

  useEffect(() => {
    if (form.role === "Provider") {
      api.get("/providers/cooperatives").then((r) => {
        const data = (r.data && r.data.length > 0) ? r.data : [
          { _id: "coop_karolbagh_01", name: "Karol Bagh Labour Cooperative" },
          { _id: "coop_connaught_02", name: "Central Delhi Artisan Cooperative" },
          { _id: "coop_southdelhi_03", name: "South Delhi Skill Welfare Cooperative" }
        ];
        setCoops(data);

        // Pre-select cooperative based on inviteCoopName query parameter
        const searchTarget = (inviteCoopName || "Karol Bagh").toLowerCase();
        const matched = data.find(c =>
          c.name.toLowerCase().includes(searchTarget) ||
          searchTarget.includes(c.name.toLowerCase()) ||
          c._id === searchParams.get("coopId")
        );

        if (matched) {
          setForm(f => ({ ...f, cooperativeId: matched._id }));
        } else if (data.length > 0) {
          setForm(f => ({ ...f, cooperativeId: data[0]._id }));
        }
      }).catch(() => {
        const fallbackData = [
          { _id: "coop_karolbagh_01", name: "Karol Bagh Labour Cooperative" },
          { _id: "coop_connaught_02", name: "Central Delhi Artisan Cooperative" },
          { _id: "coop_southdelhi_03", name: "South Delhi Skill Welfare Cooperative" }
        ];
        setCoops(fallbackData);
        setForm(f => ({ ...f, cooperativeId: fallbackData[0]._id }));
      });
    }
  }, [form.role, inviteCoopName, searchParams]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // Step 1: validate + open OTP verification for the entered email
  function submit(e) {
    e.preventDefault();
    setErr("");
    if (!EMAIL_RE.test(form.email.trim())) {
      return setErr("Please enter a valid email address.");
    }
    if (form.password && form.password.length < 8) {
      return setErr("Password must be at least 8 characters long.");
    }
    if (form.role === "Provider" && !form.cooperativeId) {
      return setErr("Please select a cooperative.");
    }
    const payload = { name: form.name, email: form.email, phone: form.phone, password: form.password, role: form.role };
    if (form.role === "Provider") payload.cooperativeId = form.cooperativeId;
    setPendingPayload(payload);
    setOtpOpen(true);
  }

  // Step 2: OTP verified — create the account with the code attached
  async function handleOtpVerified(code) {
    setLoading(true);
    try {
      const u = await signup({ ...pendingPayload, otp: code });
      setOtpOpen(false);
      if (u.role === "Household") navigate("/household");
      else if (u.role === "Provider") navigate("/provider");
      else navigate("/admin");
    } catch (e2) {
      throw e2; // OTP/verification errors surface inside the modal
    } finally { setLoading(false); }
  }

  // Non-OTP failures (e.g. duplicate email) show inline instead
  async function verifyWrapper(code) {
    try { await handleOtpVerified(code); }
    catch (e) {
      const m = e.response?.data?.message || "";
      if (/OTP|Incorrect|expired|attempt|code|verified/i.test(m)) throw e;
      setOtpOpen(false);
      setErr(m || "Registration failed. Please try again.");
    }
  }

  return (
    <AuthShell
      title="Join the Cooperative Economy."
      subtitle="Connect, work, and grow within a trusted community ecosystem built for everyone."
      back="/"
      backLabel="Back to Home"
    >
      <div className="mb-4">
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">Create Account</h2>
        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">Select your role to get started.</p>
      </div>

      {inviteCoopName && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 flex items-start gap-3 shadow-xs">
          <Icon name="verified_user" className="text-[22px] text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-xs space-y-0.5">
            <strong className="block font-black text-emerald-950 dark:text-emerald-200">🎉 Invited by {inviteCoopName}!</strong>
            <p className="opacity-90 font-medium">Your member profile details ({inviteSkill ? `${inviteSkill} • ` : ""}{inviteEmail}) have been pre-filled. Create a password below to complete registration!</p>
          </div>
        </div>
      )}

      {/* Role Cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => set("role", r.value)}
            className={`flex flex-col items-center text-center py-3 px-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.97] ${
              form.role === r.value
                ? "border-primary bg-surface-container-high shadow-xs"
                : "border-outline-variant bg-surface-container-low hover:border-primary/50"
            }`}
          >
            <Icon
              name={r.icon}
              className={`text-[24px] mb-1.5 transition-colors ${form.role === r.value ? "text-primary" : "text-outline"}`}
              strokeWidth={1.5}
            />
            <span className="text-[12px] font-semibold text-on-surface leading-tight">{r.label}</span>
          </button>
        ))}
      </div>

      {form.role ? (
        <>
          {err && (
            <div className="mb-3.5 rounded-lg bg-error-container border border-error/20 px-3.5 py-2.5 flex items-center gap-2.5 text-on-error-container">
              <Icon name="error" className="text-[17px] text-error shrink-0" />
              <span className="text-[12.5px] font-medium">{err}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-[12.5px] font-semibold text-on-surface mb-1">
                Full Name / Organization Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Enter your name"
                className={inputCls}
              />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="email" className="block text-[12.5px] font-semibold text-on-surface mb-1">Email</label>
                <input
                  id="email" type="email" required value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="name@mail.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-[12.5px] font-semibold text-on-surface mb-1">Phone</label>
                <input
                  id="phone" type="tel" value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 9XXXXXXXXX"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[12.5px] font-semibold text-on-surface mb-1">Password</label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? "text" : "password"} required minLength={8}
                  value={form.password} onChange={(e) => set("password", e.target.value)}
                  placeholder="At least 8 characters"
                  className={inputCls + " pr-9"}
                />
                <button
                  type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[17px]" />
                </button>
              </div>
            </div>

            {/* Cooperative dropdown (Provider only) */}
            {form.role === "Provider" && (
              <div>
                <label htmlFor="coop" className="block text-[12.5px] font-semibold text-on-surface mb-1">Select Cooperative</label>
                <select
                  id="coop" value={form.cooperativeId}
                  onChange={(e) => set("cooperativeId", e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Select Cooperative --</option>
                  {coops.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {/* Cooperative Admin note */}
            {form.role === "Cooperative Admin" && (
              <p className="rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-[12.5px] text-on-surface-variant">
                Registering a cooperative society? Use the{" "}
                <Link to="/coop-signup" className="font-semibold text-primary hover:underline">dedicated form</Link>.
              </p>
            )}

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                required
                className="w-3.5 h-3.5 mt-0.5 text-primary border-outline-variant rounded accent-primary cursor-pointer"
              />
              <span className="text-[12px] text-on-surface-variant leading-snug">
                I agree to the{" "}
                <a href="#" className="text-primary hover:underline">Terms &amp; Conditions</a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-[13.5px] font-semibold bg-primary text-on-primary shadow-[0_2px_10px_rgba(30,107,101,0.25)] hover:opacity-90 hover:shadow-[0_6px_18px_rgba(30,107,101,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 cursor-pointer"
            >
              {loading && <span className="h-4 w-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
              {loading ? "Verifying & Creating..." : "Create Account"}
              {!loading && <Icon name="arrow_forward" className="text-[17px]" />}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center text-[13px] text-on-surface-variant italic opacity-60 py-4">
          Please select a role above to continue registration.
        </div>
      )}

      <p className="mt-4 text-center font-body-md text-xs text-on-surface-variant">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:opacity-80 transition-opacity">
          Sign in
        </Link>
      </p>

      {/* Email OTP verification modal — account is created only after the email is confirmed */}
      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title="Verify your email"
        subtitle={`We've sent a 6-digit code to ${form.email}. Enter it below to finish creating your account.`}
        email={form.email.trim()}
        purpose="signup"
        ctaLabel="Verify & Create Account"
        onVerify={verifyWrapper}
      />
    </AuthShell>
  );
}

