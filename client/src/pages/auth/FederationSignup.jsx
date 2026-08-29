import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthShell from '../../components/AuthShell';
import Icon from '../../components/Icon';
import OtpModal from '../../components/OtpModal';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const inputCls = "block w-full pl-9 pr-3 py-2 border border-outline-variant rounded-lg bg-white text-on-surface text-[13.5px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none";

export default function FederationSignup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fedName: '', fedReg: '', fedRegion: '',
    name: '', email: '', phone: '', password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // Step 1: validate + open OTP verification for the entered email
  function submit(e) {
    e.preventDefault();
    setErr('');
    if (!EMAIL_RE.test(form.email.trim())) return setErr('Please enter a valid email address.');
    if (form.password && form.password.length < 8) return setErr('Password must be at least 8 characters long.');
    setOtpOpen(true);
  }

  // Step 2: OTP verified — create the account with the code attached
  async function handleOtpVerified(code) {
    try {
      setBusy(true);
      const u = await signup({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: 'Federation Admin',
        federation: {
          name: form.fedName,
          registrationId: form.fedReg,
          region: form.fedRegion,
        },
        otp: code,
      });
      setOtpOpen(false);
      if (u.role === 'Federation Admin') navigate('/federation');
    } catch (e) {
      throw e; // OTP/verification errors surface inside the modal
    } finally { setBusy(false); }
  }

  // Non-OTP failures (e.g. duplicate email) show as an inline error instead
  async function verifyWrapper(code) {
    try { await handleOtpVerified(code); }
    catch (e) {
      const m = e.response?.data?.message || '';
      if (/OTP|Incorrect|expired|attempt|code|verified/i.test(m)) throw e;
      setOtpOpen(false);
      setErr(m || 'Federation registration failed');
    }
  }

  return (
    <AuthShell
      title="Register Your Federation"
      subtitle="Set up a Labour Cooperative Federation to oversee multiple cooperative societies."
      back="/login"
      backLabel="Back to Sign in"
    >
      <div className="mb-4">
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
          Federation Signup
        </h2>
        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
          Create the federation and your admin account.
        </p>
      </div>

      {err && (
        <div className="mb-3.5 rounded-lg bg-error-container p-3 text-xs sm:text-[13px] font-medium text-on-error-container flex items-center gap-2.5 border border-error/30">
          <Icon name="error" className="text-[17px] text-error shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-3.5">
        {/* Section 1: Federation Details */}
        <div className="rounded-xl border border-outline-variant/70 bg-white p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-1 text-primary font-heading font-bold text-[13px] border-b border-outline-variant/30">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="account_balance" className="text-[15px]" />
            </div>
            <span>Federation Details</span>
          </div>

          {/* Federation Name */}
          <div>
            <label htmlFor="fedName" className="block text-[12.5px] font-semibold text-on-surface mb-1">
              Federation Name
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="domain" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
              </div>
              <input
                id="fedName"
                type="text"
                required
                value={form.fedName}
                onChange={(e) => set('fedName', e.target.value)}
                placeholder="e.g. Maharashtra Labour Federation"
                className={inputCls}
              />
            </div>
          </div>

          {/* Registration ID & Region / State */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="fedReg" className="block text-[12.5px] font-semibold text-on-surface mb-1">
                Registration ID
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="badge" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="fedReg"
                  type="text"
                  required
                  value={form.fedReg}
                  onChange={(e) => set('fedReg', e.target.value)}
                  placeholder="e.g. FED/MH/2024/001"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label htmlFor="fedRegion" className="block text-[12.5px] font-semibold text-on-surface mb-1">
                Region / State
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="location_on" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="fedRegion"
                  type="text"
                  required
                  value={form.fedRegion}
                  onChange={(e) => set('fedRegion', e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Admin Account */}
        <div className="rounded-xl border border-outline-variant/70 bg-white p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-1 text-primary font-heading font-bold text-[13px] border-b border-outline-variant/30">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="admin_panel_settings" className="text-[15px]" />
            </div>
            <span>Admin Account</span>
          </div>

          {/* Admin Full Name */}
          <div>
            <label htmlFor="name" className="block text-[12.5px] font-semibold text-on-surface mb-1">
              Admin Full Name
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="person" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
              </div>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Enter admin full name"
                className={inputCls}
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="email" className="block text-[12.5px] font-semibold text-on-surface mb-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="mail" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="admin@federation.com"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label htmlFor="phone" className="block text-[12.5px] font-semibold text-on-surface mb-1">
                Phone Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="call" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+91 9XXXXXXXXX"
                  className={inputCls}
                />
              </div>
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
                minLength={8}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="At least 8 characters"
                className={inputCls + " pr-9"}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[17px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={busy}
          className="w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-[13.5px] font-semibold bg-primary text-on-primary shadow-[0_2px_10px_rgba(30,107,101,0.25)] hover:opacity-90 hover:shadow-[0_6px_18px_rgba(30,107,101,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 cursor-pointer"
        >
          {busy && <span className="h-4 w-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />}
          {busy ? "Registering Federation..." : "Register Federation"}
          {!busy && <Icon name="arrow_forward" className="text-[17px]" />}
        </button>
      </form>

      <p className="mt-4 text-center font-body-md text-xs text-on-surface-variant">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:opacity-80 transition-opacity">
          Sign in
        </Link>
      </p>

      {/* Email OTP verification modal */}
      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title="Verify your email"
        subtitle={`We've sent a 6-digit code to ${form.email}. Enter it below to register your federation.`}
        email={form.email}
        purpose="signup"
        ctaLabel="Register Federation"
        onVerify={verifyWrapper}
      />
    </AuthShell>
  );
}

