import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Icon from "../../components/Icon";
import { ArrowLeft } from "lucide-react";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBoqNwMxz89ThfO04GrechILX6d7P7jQC29TiL-bJp1Z_rv7BUIVUv3vfudaddaI88MO_bJ6EyCpehmz15WPybx_G_pbOiBHlbE0-q8f4JBKgdXUQpeRQVuJnopnwjQ32XMwTWgY_Zg3kx3Xic2v2GVRdypB3_TeHTi1J66Wpwrk6qPCYE9o5gSSylqb51PWwMQkkwKYsbO_JbC9mfSdWuoXk0IzPSz7ZECOXMbw_-oQbqrbuOfnQ";

const ROLES = [
  { value: "Household",        label: "Household",        icon: "home" },
  { value: "Provider",         label: "Service Provider", icon: "handyman" },
  { value: "Cooperative Admin",label: "Cooperative",      icon: "domain" },
];

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "", cooperativeId: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [coops, setCoops] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.role === "Provider") {
      api.get("/providers/cooperatives").then((r) => setCoops(r.data)).catch(() => setCoops([]));
    }
  }, [form.role]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const payload = { name: form.name, email: form.email, phone: form.phone, password: form.password, role: form.role };
    if (form.role === "Provider") payload.cooperativeId = form.cooperativeId;
    try {
      const u = await signup(payload);
      if (u.role === "Household") navigate("/household");
      else if (u.role === "Provider") navigate("/provider");
      else navigate("/admin");
    } catch (e) {
      setErr(e.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-3 sm:p-6 overflow-y-auto">

      <div className="flex w-full max-w-[1200px] min-h-[600px] my-auto flex-col lg:flex-row rounded-2xl">

        {/* Left: Image card — identical to Login */}
        <div className="hidden lg:flex w-[420px] shrink-0 relative flex-col justify-between p-8 overflow-hidden group rounded-2xl shadow-lg ring-1 ring-black/5">
          <div
            className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-[20s] ease-linear group-hover:scale-105"
            style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
          />
          <div className="absolute inset-0 bg-primary/75 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent" />

          <div className="relative z-10 flex items-center gap-2">
            <Icon name="handshake" className="text-[24px] text-white" strokeWidth={1.5} />
            <span className="font-bold text-[20px] text-white tracking-tight">SahakarGig</span>
          </div>

          <div className="relative z-10 max-w-xs">
            <h1 className="font-bold text-white mb-3 text-[22px] leading-[30px] tracking-tight">
              Join the Cooperative Economy.
            </h1>
            <p className="text-[14px] leading-[22px] text-white/85">
              Connect, work, and grow within a trusted community ecosystem built for everyone.
            </p>
          </div>
        </div>

        {/* Right: Form pane — same padding/structure as Login */}
        <div className="flex-1 relative flex flex-col justify-center px-14 py-8 bg-white overflow-y-auto">

          {/* Back button — fixed top-left of pane */}
          <div className="absolute top-6 left-8 right-8 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#444653] hover:text-[#00288e] transition-colors duration-200 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
              Back to Home
            </Link>
            <div className="lg:hidden flex items-center gap-2">
              <Icon name="handshake" className="text-[24px] text-primary" strokeWidth={1.5} />
              <span className="font-bold text-[20px] text-primary tracking-tight">SahakarGig</span>
            </div>
          </div>

          <div className="max-w-md w-full mx-auto">

            {/* Heading */}
            <div className="mb-6">
              <h2 className="text-[28px] leading-[36px] font-bold text-on-surface tracking-tight mb-2">Create Account</h2>
              <p className="text-[14px] text-on-surface-variant">Select your role to get started.</p>
            </div>

            {/* Role Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set("role", r.value)}
                  className={`flex flex-col items-center text-center py-4 px-2 rounded-lg border transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                    form.role === r.value
                      ? "border-primary bg-surface-container-low shadow-sm"
                      : "border-outline-variant bg-white hover:border-primary/50"
                  }`}
                >
                  <Icon
                    name={r.icon}
                    className={`text-[28px] mb-2 transition-colors ${form.role === r.value ? "text-primary" : "text-outline"}`}
                    strokeWidth={1.5}
                  />
                  <span className="text-[13px] font-semibold text-on-surface leading-tight">{r.label}</span>
                </button>
              ))}
            </div>

            {/* Form fields — only shown after role selected */}
            {form.role ? (
              <>
                {err && (
                  <div className="mb-4 rounded-lg bg-error-container border border-error/20 px-4 py-3 flex items-center gap-3 text-on-error-container">
                    <Icon name="error" className="text-[18px] text-error shrink-0" />
                    <span className="text-[13px] font-medium">{err}</span>
                  </div>
                )}

                <form onSubmit={submit} className="space-y-4">

                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-[13px] font-semibold text-on-surface mb-1.5">
                      Full Name / Organization Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Enter your name"
                      className="block w-full px-3 py-2.5 border border-outline-variant rounded-lg bg-white text-on-surface text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none"
                    />
                  </div>

                  {/* Email + Phone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="email" className="block text-[13px] font-semibold text-on-surface mb-1.5">Email</label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="name@mail.com"
                        className="block w-full px-3 py-2.5 border border-outline-variant rounded-lg bg-white text-on-surface text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-[13px] font-semibold text-on-surface mb-1.5">Phone</label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="+91 XXXXX"
                        className="block w-full px-3 py-2.5 border border-outline-variant rounded-lg bg-white text-on-surface text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-[13px] font-semibold text-on-surface mb-1.5">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name="lock" className="text-[18px] text-outline group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-10 py-2.5 border border-outline-variant rounded-lg bg-white text-on-surface text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors focus:outline-none cursor-pointer"
                      >
                        <Icon name={showPassword ? "visibility" : "visibility_off"} className="text-[18px]" />
                      </button>
                    </div>
                  </div>

                  {/* Cooperative dropdown */}
                  {form.role === "Provider" && (
                    <div>
                      <label htmlFor="coop" className="block text-[13px] font-semibold text-on-surface mb-1.5">Select Cooperative</label>
                      <select
                        id="coop"
                        value={form.cooperativeId}
                        onChange={(e) => set("cooperativeId", e.target.value)}
                        className="block w-full px-3 py-2.5 border border-outline-variant rounded-lg bg-white text-on-surface text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                      >
                        <option value="">-- Select Cooperative --</option>
                        {coops.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Cooperative Admin note */}
                  {form.role === "Cooperative Admin" && (
                    <p className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-[13px] text-on-surface-variant">
                      Registering a cooperative? Use the{" "}
                      <Link to="/coop-signup" className="font-semibold text-primary hover:underline">dedicated form</Link>.
                    </p>
                  )}

                  {/* Terms */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      className="w-4 h-4 mt-0.5 text-primary border-outline-variant rounded accent-primary cursor-pointer"
                    />
                    <span className="text-[13px] text-on-surface-variant leading-snug">
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
                    className="w-full flex justify-center items-center gap-2 py-3 rounded-lg text-[14px] font-semibold text-on-primary bg-primary hover:bg-primary-container active:scale-[0.98] transition-all duration-200 disabled:opacity-70 cursor-pointer"
                  >
                    {loading && <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {loading ? "Creating..." : "Create Account"}
                    {!loading && <Icon name="arrow_forward" className="text-[18px]" />}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center text-[14px] text-on-surface-variant italic opacity-60 py-6">
                Please select a role above to continue registration.
              </div>
            )}

            <p className="mt-6 text-center text-[13px] text-on-surface-variant">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:text-primary-container transition-colors">
                Sign in
              </Link>
            </p>

            <div className="mt-4 flex justify-center gap-6 text-[11px] text-outline">
              <a href="#" className="hover:text-on-surface-variant transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-on-surface-variant transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-on-surface-variant transition-colors">Help Center</a>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
