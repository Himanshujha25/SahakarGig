import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import AuthShell from "../../components/AuthShell";
import Field from "../../components/Field";
import Icon from "../../components/Icon";
import OtpModal from "../../components/OtpModal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inputCls = "block w-full pl-9 pr-3 py-2 border border-outline-variant rounded-lg bg-white text-on-surface text-[13.5px] focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-outline-variant outline-none";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [step, setStep] = useState("email"); // email | newpw | done
  const [pendingCode, setPendingCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sentInfo, setSentInfo] = useState("");

  // Step 1: cross-check the email is registered BEFORE any OTP is sent.
  async function submitEmail(e) {
    e.preventDefault();
    setErr("");
    setSentInfo("");
    if (!EMAIL_RE.test(email.trim())) return setErr("Please enter a valid email address.");
    setChecking(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      if (!data.emailRegistered) {
        setErr(data.message || "No account is registered with this email address.");
        return;
      }
      setSentInfo(data.message);
      setOtpOpen(true);
    } catch (e2) {
      setErr(e2.response?.data?.message || "Could not start password reset. Please try again.");
    } finally { setChecking(false); }
  }

  // Step 2: OTP verified → move to the "set new password" step
  function handleOtpVerified(code) {
    setPendingCode(code);
    setOtpOpen(false);
    setStep("newpw");
  }

  // Step 3: commit the new password with the verified code
  async function submitNewPassword(e) {
    e.preventDefault();
    setErr("");
    if (newPw.length < 8) return setErr("Password must be at least 8 characters.");
    if (newPw !== confirmPw) return setErr("Passwords do not match.");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { email, code: pendingCode, newPassword: newPw });
      setStep("done");
    } catch (e2) {
      setErr(e2.response?.data?.message || "Could not reset password. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <AuthShell
      title="Secure Account Recovery."
      subtitle="Securely reset your password with a one-time code sent to your registered email address."
      back="/login"
      backLabel="Back to Sign in"
    >
      <div className="mb-4">
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
          {step === "email" && "Forgot password?"}
          {step === "newpw" && "Set a new password"}
          {step === "done" && "Password updated!"}
        </h2>
        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
          {step === "email" && "Enter your account's email and we'll send you a one-time reset code."}
          {step === "newpw" && <>Verified for <span className="font-semibold">{email}</span>. Choose a strong new password.</>}
          {step === "done" && "Your password has been reset successfully."}
        </p>
      </div>

      {/* Same error banner pattern as Login.jsx */}
      {err && (
        <div className="mb-3.5 rounded-lg bg-error-container p-3 text-xs sm:text-[13px] font-medium text-on-error-container flex items-center gap-2.5 border border-error/30 shadow-xs">
          <Icon name="error" className="text-[18px] text-error shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* Success banner */}
      {step === "done" && (
        <div className="mb-4 rounded-xl p-3.5 flex items-center gap-3 bg-[#e6f9ec] border border-[#006d30]/20 text-[#006d30] shadow-xs">
          <Icon name="check_circle" className="text-[20px] shrink-0" />
          <p className="text-xs sm:text-sm font-semibold">You can now sign in with your new password.</p>
        </div>
      )}

      {step !== "done" ? (
        step === "email" ? (
          <form onSubmit={submitEmail} className="space-y-3.5">
            <div>
              <label htmlFor="resetEmail" className="block text-[12.5px] font-semibold text-on-surface mb-1">
                Registered Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="mail" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="resetEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mail.com"
                  autoComplete="email"
                  className={inputCls}
                />
              </div>
            </div>

            {email.trim() && !err && (
              <p className="text-[11.5px] font-medium text-on-surface-variant flex items-center gap-1.5">
                <Icon name="verified_user" className="text-[14px] text-primary" />
                We'll first confirm this email belongs to an account, then send your code.
              </p>
            )}

            <button
              type="submit"
              disabled={checking}
              className="w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-[13.5px] font-semibold border border-primary/30 bg-[#e8edff] text-[#00288e] hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_4px_14px_rgba(0,40,142,0.18)] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 cursor-pointer"
            >
              {checking && (
                <span className="inline-block h-4 w-4 border-2 border-[#00288e]/30 border-t-[#00288e] rounded-full animate-spin" />
              )}
              {checking ? "Checking email…" : "Send Reset Code"}
              {!checking && <Icon name="arrow_forward" className="text-[17px]" />}
            </button>
          </form>
        ) : (
          <form onSubmit={submitNewPassword} className="space-y-3.5">
            <div>
              <label htmlFor="newPw" className="block text-[12.5px] font-semibold text-on-surface mb-1">
                New Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="lock" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="newPw"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={inputCls + " pr-9"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                >
                  <Icon name={showPw ? "visibility_off" : "visibility"} className="text-[17px]" />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPw" className="block text-[12.5px] font-semibold text-on-surface mb-1">
                Confirm New Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="lock" className="text-[17px] text-outline group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  id="confirmPw"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={inputCls + " pr-9"}
                />
              </div>
            </div>

            {confirmPw && newPw !== confirmPw && (
              <p className="text-[11.5px] font-semibold text-error">Passwords do not match.</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-[13.5px] font-semibold border border-primary/30 bg-[#e8edff] text-[#00288e] hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_4px_14px_rgba(0,40,142,0.18)] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 cursor-pointer"
            >
              {busy && (
                <span className="inline-block h-4 w-4 border-2 border-[#00288e]/30 border-t-[#00288e] rounded-full animate-spin" />
              )}
              {busy ? "Resetting…" : "Reset Password"}
            </button>
          </form>
        )
      ) : (
        <Link
          to="/login"
          className="w-full flex justify-center items-center gap-2 py-2.5 rounded-lg text-[13.5px] font-semibold border border-primary/30 bg-[#e8edff] text-[#00288e] hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_4px_14px_rgba(0,40,142,0.18)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          Sign in now
          <Icon name="arrow_forward" className="text-[17px]" />
        </Link>
      )}

      <p className="mt-4 text-center font-body-md text-xs text-on-surface-variant">
        Remembered it?{" "}
        <Link to="/login" className="font-semibold text-primary hover:text-primary-container transition-colors">
          Back to sign in
        </Link>
      </p>

      {/* OTP verification modal — code was already sent by /auth/forgot-password,
          so autoSend is off. Resend still re-issues via /auth/send-otp. */}
      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title="Verify it's you"
        subtitle={sentInfo || <>A 6-digit reset code is on its way to <span className="font-semibold text-on-surface">{email}</span>. Enter it below.</>}
        email={email}
        purpose="reset_password"
        ctaLabel="Verify Code"
        autoSend={false}
        onVerify={handleOtpVerified}
      />
    </AuthShell>
  );
}

