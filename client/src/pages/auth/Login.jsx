import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";
import AuthShell from "../../components/AuthShell";
import { toast } from "../../lib/toast";

const GOOGLE_ICON = (
  <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBqd8zsjxsBCPLstNY3rkhVc0f0-xjt0cXpHTsYV3jdaOlLQMvM2o-eaojR97WW3B3yXkJjNM6lXaTVCKOmu5ZOEoQ-zdNyfpOaesnbzqw95q_el-1LbiU7Pow12erD6-NNlOWM89u0WfWjAVlR8AwZCxhT4yCsY5zFk2If2sscr4CQRLQWFQ4ZkIPn7EEXn94mfnJ32Fu3RuNCdpIZqT_f5jeuG-6VPImhDey89SdyWQ5iHh6Iyw";

export default function Login() {
  const { t } = useTranslation();
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function afterAuth(u) {
    if (redirectUrl && redirectUrl.startsWith("/")) {
      navigate(redirectUrl);
      return;
    }

    let searchIntent = null;
    try {
      const raw = localStorage.getItem("sg_pending_search_intent");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() < parsed.expiresAt) searchIntent = parsed;
        else localStorage.removeItem("sg_pending_search_intent");
      }
    } catch {}

    if (u.role === "Household") {
      if (searchIntent && (searchIntent.query || searchIntent.location)) {
        const params = new URLSearchParams();
        if (searchIntent.query) params.set("query", searchIntent.query);
        if (searchIntent.location) params.set("location", searchIntent.location);
        navigate(`/household/find?${params.toString()}`);
        return;
      }
      navigate("/household");
    }
    else if (u.role === 'Provider') navigate('/provider');
    else if (u.role === 'Federation Admin') navigate('/federation');
    else navigate('/admin');
  }

  const googleLoginFlow = useGoogleLogin({
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
        const u = await googleLogin(payload);
        await afterAuth(u);
      } catch (e) {
        setErr(e.response?.data?.message || "Google sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setErr("Google sign-in was cancelled or failed. Please try again."),
  });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await login(identifier, password);
      await afterAuth(u);
    } catch (e) {
      setErr(e.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fillDemo = (email) => { setIdentifier(email); setPassword("123456789"); setErr(""); };

  return (
    <AuthShell
      title={t('empoweringCommunities', "Empowering Communities, Elevating Work.")}
      subtitle={t('loginSub', "Join the premier cooperative network designed for institutional precision and community trust.")}
      back="/"
      backLabel={t('backToHome', "Back to Home")}
      heroImage={HERO_IMAGE}
    >
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.12em] mb-2.5">
          <Icon name="verified" className="text-[12px] text-primary" />
          {t('secureSignIn', 'Secure Sign In')}
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight leading-tight">{t('welcomeBack', 'Welcome back')}</h2>
        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1.5">{t('signInSubtitle', 'Sign in to your dashboard.')}</p>
      </div>

      {/* Demo pills — desktop/tablet only */}
      <div className="hidden sm:block mb-5">
        <span className="block text-[10px] font-bold tracking-widest text-on-surface-variant/70 uppercase mb-2">{t('demoAccounts', 'Demo Accounts')}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            ["coop.test@gmail.com", t('coopAdmin', "Coop Admin")],
            ["household.test@gmail.com", t('household', "Household")],
            ["plumber.test@gmail.com", t('provider', "Gig Worker")],
            ["federation.test@gmail.com", t('fedAdmin', "Federation")],
          ].map(([email, label]) => (
            <button
              key={email}
              type="button"
              onClick={() => fillDemo(email)}
              className="px-2.5 py-1 rounded-full border border-outline-variant bg-surface-container-low text-[11px] font-semibold hover:bg-primary hover:text-on-primary hover:border-primary hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-xs"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="mb-3.5 rounded-lg bg-error-container border border-error/20 px-3.5 py-2.5 flex items-center gap-2.5 text-on-error-container">
          <Icon name="error" className="text-[17px] text-error shrink-0" />
          <span className="text-[12.5px] font-medium">{err}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="identifier" className="block text-[12px] font-bold text-on-surface mb-1.5">
            {t('emailOrPhone', 'Email or Phone Number')}
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Icon name="person" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
            </div>
            <input
              id="identifier"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t('enterCredentials', 'Enter your credentials')}
              className="block w-full pl-10 pr-3.5 py-3 border border-outline-variant rounded-xl bg-surface-container-low text-on-surface text-[13.5px] focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-outline-variant outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-[12px] font-bold text-on-surface mb-1.5">
            {t('password', 'Password')}
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Icon name="lock" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full pl-10 pr-10 py-3 border border-outline-variant rounded-xl bg-surface-container-low text-on-surface text-[13.5px] focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-outline-variant outline-none shadow-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface transition-colors focus:outline-none cursor-pointer"
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
            <span className="text-[12.5px] text-on-surface-variant">{t('rememberMe', 'Remember me')}</span>
          </label>
          <Link to="/forgot-password" className="text-[12.5px] font-semibold text-primary hover:opacity-80 transition-opacity">
            {t('forgotPassword', 'Forgot password?')}
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-3 rounded-xl text-[13.5px] font-bold bg-primary text-on-primary shadow-[0_4px_14px_rgba(30,107,101,0.3)] hover:opacity-90 hover:shadow-[0_8px_24px_rgba(30,107,101,0.45)] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 cursor-pointer"
        >
          {loading && <span className="h-4 w-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
          {loading ? t('signingIn', 'Signing in...') : t('signIn', 'Sign In')}
          {!loading && <Icon name="arrow_forward" className="text-[16px]" />}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-outline-variant" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-surface-container-lowest text-[11.5px] text-on-surface-variant">{t('orContinueWith', 'Or continue with')}</span>
        </div>
      </div>

      {/* Social */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={googleLoginFlow}
          disabled={loading}
          className="inline-flex justify-center items-center gap-2 py-2.5 px-3 border border-outline-variant rounded-xl bg-surface-container-low text-[12.5px] font-semibold text-on-surface hover:bg-surface-container-high hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-xs"
        >
          {GOOGLE_ICON}
          Google
        </button>
        <button
          type="button"
          onClick={() => toast.info("Connecting with e-Pramaan SSO portal…")}
          className="inline-flex justify-center items-center gap-2 py-2.5 px-3 border border-outline-variant rounded-xl bg-surface-container-low text-[12.5px] font-semibold text-on-surface hover:bg-surface-container-high hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-xs"
        >
          <Icon name="assured_workload" className="text-[17px] text-primary" />
          e-Pramaan
        </button>
      </div>

      <div className="mt-5 text-center">
        <p className="text-xs text-on-surface-variant">{t('notPartCoopYet', 'Not part of a cooperative yet?')}</p>
        <div className="mt-2 flex items-center justify-center gap-2.5">
          <Link
            to="/signup"
            className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-[12px] font-bold text-primary hover:bg-primary hover:text-on-primary transition-all duration-200 cursor-pointer"
          >
            {t('registerSociety', 'Register Society')}
          </Link>
          <span className="w-1 h-1 rounded-full bg-outline shrink-0" />
          <Link
            to="/federation-signup"
            className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-[12px] font-bold text-primary hover:bg-primary hover:text-on-primary transition-all duration-200 cursor-pointer"
          >
            {t('registerFederation', 'Register Federation')}
          </Link>
        </div>
      </div>

      {/* Trust line — desktop only to keep mobile minimal */}
      <p className="hidden sm:flex mt-4 text-center text-[10.5px] text-on-surface-variant/60 items-center justify-center gap-1.5">
        <Icon name="shield" className="text-[13px] text-primary/70" />
        Protected by 256-bit SSL · Razorpay Escrow
      </p>
    </AuthShell>
  );
}
