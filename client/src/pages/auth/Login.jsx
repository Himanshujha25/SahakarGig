import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";
import { ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-3 sm:p-6 overflow-y-auto">

      <div className="flex w-full max-w-[1200px] min-h-[600px] my-auto flex-col lg:flex-row rounded-2xl">

        {/* Left: Image card */}
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
              Empowering Communities, Elevating Work.
            </h1>
            <p className="text-[14px] leading-[22px] text-white/85">
              Join the premier cooperative network designed for institutional precision and community trust.
            </p>
          </div>
        </div>

        {/* Right: Form pane */}
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
              <h2 className="text-[28px] leading-[36px] font-bold text-on-surface tracking-tight mb-2">Welcome back</h2>
              <p className="text-[14px] text-on-surface-variant">Sign in to access your cooperative dashboard.</p>
            </div>

            {/* Demo pills */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-outline uppercase">Demo:</span>
              {[
                ["nitinprakash268@gmail.com", "Coop Admin"],
                ["nitin268@gmail.com", "Household"],
                ["nitin@gmail.com", "Gig Worker"],
                ["coder268@gmail.com", "Federation"],
              ].map(([email, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => fillDemo(email)}
                  className="px-3 py-1 rounded-full border border-outline-variant bg-surface-container-low text-[12px] font-semibold hover:bg-primary hover:text-white hover:border-primary transition cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>

            {err && (
              <div className="mb-4 rounded-lg bg-error-container border border-error/20 px-4 py-3 flex items-center gap-3 text-on-error-container">
                <Icon name="error" className="text-[18px] text-error shrink-0" />
                <span className="text-[13px] font-medium">{err}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="identifier" className="block text-[13px] font-semibold text-on-surface mb-1.5">
                  Email or Phone Number
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="person" className="text-[18px] text-outline group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your credentials"
                    className="block w-full pl-10 pr-3 py-2.5 border border-outline-variant rounded-lg bg-white text-on-surface text-[14px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-[13px] font-semibold text-on-surface mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="lock" className="text-[18px] text-outline group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-primary border-outline-variant rounded accent-primary cursor-pointer"
                  />
                  <span className="text-[13px] text-on-surface-variant">Remember me</span>
                </label>
                <a href="#" className="text-[13px] font-semibold text-primary hover:text-primary-container transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 rounded-lg text-[14px] font-semibold text-on-primary bg-primary hover:bg-primary-container active:scale-[0.98] transition-all duration-200 disabled:opacity-70 cursor-pointer"
              >
                {loading && <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-[12px] text-on-surface-variant">Or continue with</span>
              </div>
            </div>

            {/* Social */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => alert("Connecting with e-Pramaan…")}
                className="inline-flex justify-center items-center gap-2 py-2.5 px-4 border border-outline-variant rounded-lg bg-white text-[13px] font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <Icon name="assured_workload" className="text-[18px] text-primary" />
                e-Pramaan
              </button>
              <button
                type="button"
                onClick={() => alert("Connecting with Aadhaar…")}
                className="inline-flex justify-center items-center gap-2 py-2.5 px-4 border border-outline-variant rounded-lg bg-white text-[13px] font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <Icon name="fingerprint" className="text-[18px] text-primary" />
                Aadhaar
              </button>
            </div>

            <p className="mt-6 text-center text-[13px] text-on-surface-variant">
              Not part of a cooperative yet?{" "}
              <Link to="/signup" className="font-semibold text-primary hover:text-primary-container transition-colors">
                Register Society
              </Link>
              {" · "}
              <Link to="/federation-signup" className="font-semibold text-primary hover:text-primary-container transition-colors">
                Register Federation
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
