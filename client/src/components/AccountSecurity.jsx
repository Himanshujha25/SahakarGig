import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import OtpModal from "./OtpModal";
import Icon from "./Icon";

/* ------------------------------------------------------------------ */
/*  Email verification status card — drops into any Settings page.    */
/*  Green/amber languages reuse the app's existing chip vocabulary.   */
/* ------------------------------------------------------------------ */

export function EmailStatusCard({ onVerified }) {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const verified = !!user?.emailVerified;

  async function handleVerify(code) {
    await api.post("/auth/verify-email", { code });
    setOpen(false);
    await refreshUser();
    onVerified?.();
  }

  return (
    <>
      <div className={`flex items-center justify-between gap-4 p-4 rounded-xl border shadow-xs ${
        verified
          ? "border-[#006d30]/25 bg-[#e6f9ec]"
          : "border-tertiary/25 bg-tertiary-fixed/40"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            verified ? "bg-[#e6f9ec]" : "bg-tertiary-fixed"}`}>
            <Icon name={verified ? "verified_user" : "gpp_maybe"}
              className={verified ? "text-[18px] text-[#006d30]" : "text-[18px] text-on-tertiary-fixed-variant"} />
          </div>
          <div className="min-w-0">
            <p className="font-body-md text-sm font-semibold text-on-surface">Email Verification</p>
            <p className="font-body-md text-xs text-on-surface-variant truncate">
              {verified
                ? `${user?.email || "Your email"} is verified.`
                : <>Your email <span className="font-semibold">{user?.email}</span> is not verified yet.</>}
            </p>
          </div>
        </div>
        {!verified && (
          <button onClick={() => setOpen(true)}
            className="shrink-0 h-9 px-4 rounded-xl border border-primary/25 bg-surface-container-lowest text-primary text-xs font-semibold hover:border-primary hover:bg-surface-container active:scale-[0.98] transition-all duration-200 cursor-pointer">
            Verify Now
          </button>
        )}
      </div>

      <OtpModal
        open={open}
        onClose={() => setOpen(false)}
        title="Verify your email"
        email={user?.email}
        purpose="verify_email"
        ctaLabel="Confirm Verification"
        onVerify={handleVerify}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Change password — current password check + emailed one-time code. */
/*  Inputs mirror <Field/>, buttons mirror the Settings SaveBtn.      */
/* ------------------------------------------------------------------ */

export function ChangePasswordSection({ onSaved }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}
  const [saving, setSaving] = useState(false);

  const mismatch = confirm && next !== confirm;

  function save() {
    setMsg(null);
    if (!current) return setMsg({ type: "err", text: "Please enter your current password." });
    if (next.length < 8) return setMsg({ type: "err", text: "New password must be at least 8 characters." });
    if (next !== confirm) return setMsg({ type: "err", text: "Passwords do not match." });
    if (next === current) return setMsg({ type: "err", text: "New password must be different from the current one." });
    setOtpOpen(true);
  }

  async function verifyWrapper(code) {
    try {
      setSaving(true);
      const { data } = await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: next,
        code,
      });
      setCurrent(""); setNext(""); setConfirm(""); setOtpOpen(false);
      setMsg({ type: "ok", text: data.message || "Password updated successfully." });
      onSaved?.();
    } catch (e) {
      const m = e.response?.data?.message || "";
      if (/OTP|Incorrect|expired|attempt|code/i.test(m)) throw e; // OTP error → stay inside modal
      setOtpOpen(false);
      setMsg({ type: "err", text: m || "Could not update password." });
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <PwField label="Current Password" visible={showPw} toggle={() => setShowPw(v => !v)}
        value={current} onChange={setCurrent} placeholder="Enter current password" />
      <PwField label="New Password" visible={showPw} toggle={() => setShowPw(v => !v)}
        value={next} onChange={setNext} placeholder="At least 8 characters" />
      <PwField label="Confirm New Password" visible={showPw} toggle={() => setShowPw(v => !v)}
        value={confirm} onChange={setConfirm} placeholder="Repeat new password" />

      {mismatch && <p className="font-body-md text-xs font-semibold text-error">Passwords do not match.</p>}

      {/* Same banner patterns as Login.jsx / OtpModal.jsx */}
      {msg && (
        msg.type === "ok" ? (
          <div className="rounded-xl px-3.5 py-3 flex items-center gap-2.5 bg-[#e6f9ec] border border-[#006d30]/20 text-[#006d30] shadow-xs">
            <Icon name="check_circle" className="text-[18px] shrink-0" />
            <span className="font-body-md text-sm font-medium">{msg.text}</span>
          </div>
        ) : (
          <div className="rounded-xl p-3.5 flex items-center gap-2.5 bg-error-container border border-error/30 text-on-error-container shadow-xs">
            <Icon name="error" className="text-[20px] shrink-0" />
            <span className="font-body-md text-sm font-medium">{msg.text}</span>
          </div>
        )
      )}

      <button type="button" onClick={save} disabled={saving}
        className="h-10 inline-flex items-center gap-2 px-5 rounded-xl border border-primary/25 bg-surface-container-lowest text-primary text-[13px] font-bold hover:border-primary hover:bg-surface-container hover:shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60">
        <Icon name="save" className="text-[16px]" strokeWidth={2.5} />
        Update Password
      </button>
      <p className="font-body-md text-xs text-on-surface-variant">
        For security, we'll email you a one-time code to confirm this change.
      </p>

      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title="Confirm password change"
        subtitle={`Enter the one-time code we emailed to ${user?.email || "your inbox"} to authorise this change.`}
        email={user?.email}
        purpose="change_password"
        ctaLabel="Change Password"
        onVerify={verifyWrapper}
      />
    </div>
  );
}

function PwField({ label, value, onChange, placeholder, visible, toggle }) {
  // Label + input identical to the shared <Field/> component, plus an eye toggle
  return (
    <label className="block w-full">
      <span className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">{label}</span>
      <div className="relative w-full">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full py-3 pr-11 pl-4 bg-surface border border-outline-variant rounded-xl text-on-surface font-body-md text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        />
        <button type="button" onClick={toggle} tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer">
          <Icon name={visible ? "visibility_off" : "visibility"} className="text-[20px]" />
        </button>
      </div>
    </label>
  );
}
