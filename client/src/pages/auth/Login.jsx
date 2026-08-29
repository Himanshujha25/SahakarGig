import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";
import AuthShell from "../../components/AuthShell";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBqd8zsjxsBCPLstNY3rkhVc0f0-xjt0cXpHTsYV3jdaOlLQMvM2o-eaojR97WW3B3yXkJjNM6lXaTVCKOmu5ZOEoQ-zdNyfpOaesnbzqw95q_el-1LbiU7Pow12erD6-NNlOWM89u0WfWjAVlR8AwZCxhT4yCsY5zFk2If2sscr4CQRLQWFQ4ZkIPn7EEXn94mfnJ32Fu3RuNCdpIZqT_f5jeuG-6VPImhDey89SdyWQ5iHh6Iyw";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await login(identifier, password);
      if (u.role === "Household") navigate("/household");
      else if (u.role === 'Provider') navigate('/provider');
      else if (u.role === 'Federation Admin') navigate('/federation');
      else navigate('/admin');
    } catch (e) {
      setErr(e.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fillDemo = (email) => { setIdentifier(email); setPassword("123456789"); setErr(""); };

  return (
    <AuthShell
      title="Empowering Communities, Elevating Work."
      subtitle="Join the premier cooperative network designed for institutional precision and community trust."
      back="/"
      backLabel="Back to Home"
      heroImage={HERO_IMAGE}
    >
      <div className="mb-4">
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">Welcome back</h2>
        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">Sign in to access your cooperative dashboard.</p>
      </div>

      {/* Demo pills */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="text-[10.5px] font-bold tracking-widest text-outline uppercase">Demo:</span>
        {[
          ["coop.test@gmail.com", "Coop Admin"],
          ["household.test@gmail.com", "Household"],
          ["plumber.test@gmail.com", "Gig Worker"],
          ["federation.test@gmail.com", "Federation"],
        ].map(([email, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => fillDemo(email)}
            className="px-2.5 py-0.5 rounded-full border border-outline-variant bg-surface-container-low text-[11px] font-semibold hover:bg-primary hover:text-on-primary hover:border-primary transition cursor-pointer"
          >
            {label}
          </button>
        ))}
      </div>

      {err && (
        <div className="mb-3.5 rounded-lg bg-error-container border border-error/20 px-3.5 py-2.5 flex items-center gap-2.5 text-on-error-container">
          <Icon name="error" className="text-[17px] text-error shrink-0" />
          <span className="text-[12.5px] font-medium">{err}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-3.5">
        {/* Email */}
        <div>
          <label htmlFor="identifier" className="block text-[12.5px] font-semibold text-on-surface mb-1">
            Email or Phone Number
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="person" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
            </div>
            <input
              id="identifier"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your credentials"
              className="block w-full pl-9 pr-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface text-[13.5px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-[12.5px] font-semibold text-on-surface mb-1">
            Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="lock" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full pl-9 pr-9 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface text-[13.5px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors focus:outline-none cursor-pointer"
            >
              <Icon name={showPassword ? "visibility" : "visibility_off"} className="text-[17px]" />
            </button>
          </div>
        </div>

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 text-primary border-outline-variant rounded accent-primary cursor-pointer"
            />
            <span className="text-[12.5px] text-on-surface-variant">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-[12.5px] font-semibold text-primary hover:opacity-80 transition-opacity">
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-[13.5px] font-semibold bg-primary text-on-primary shadow-[0_2px_10px_rgba(30,107,101,0.25)] hover:opacity-90 hover:shadow-[0_6px_18px_rgba(30,107,101,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 cursor-pointer"
        >
          {loading && <span className="h-4 w-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-3.5 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-outline-variant" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-surface-container-lowest text-[11.5px] text-on-surface-variant">Or continue with</span>
        </div>
      </div>

      {/* Social */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => alert("Connecting with e-Pramaan…")}
          className="inline-flex justify-center items-center gap-2 py-2 px-3 border border-outline-variant rounded-lg bg-surface-container-low text-[12.5px] font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <Icon name="assured_workload" className="text-[17px] text-primary" />
          e-Pramaan
        </button>
        <button
          type="button"
          onClick={() => alert("Connecting with Aadhaar…")}
          className="inline-flex justify-center items-center gap-2 py-2 px-3 border border-outline-variant rounded-lg bg-surface-container-low text-[12.5px] font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <Icon name="fingerprint" className="text-[17px] text-primary" />
          Aadhaar
        </button>
      </div>

      <p className="mt-4 text-center font-body-md text-xs text-on-surface-variant">
        Not part of a cooperative yet?{" "}
        <Link to="/signup" className="font-semibold text-primary hover:opacity-80 transition-opacity">
          Register Society
        </Link>
        {" · "}
        <Link to="/federation-signup" className="font-semibold text-primary hover:opacity-80 transition-opacity">
          Register Federation
        </Link>
      </p>
    </AuthShell>
  );
}
