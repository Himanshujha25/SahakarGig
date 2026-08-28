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
    <div className="space-y-3">
      <PwField label="Current Password" visible={showPw} toggle={() => setShowPw(v => !v)}
        value={current} onChange={setCurrent} placeholder="Enter current password" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <PwField label="New Password" visible={showPw} toggle={() => setShowPw(v => !v)}
          value={next} onChange={setNext} placeholder="At least 8 characters" />
        <PwField label="Confirm New Password" visible={showPw} toggle={() => setShowPw(v => !v)}
          value={confirm} onChange={setConfirm} placeholder="Repeat new password" />
      </div>

      {mismatch && <p className="text-[11px] font-bold text-error">Passwords do not match.</p>}

      {msg && (
        msg.type === "ok" ? (
          <div className="rounded-xl px-3 py-2 flex items-center gap-2 bg-[#e6f9ec] border border-[#006d30]/20 text-[#006d30] text-xs font-semibold">
            <Icon name="check_circle" className="text-[16px] shrink-0" />
            <span>{msg.text}</span>
          </div>
        ) : (
          <div className="rounded-xl p-2.5 flex items-center gap-2 bg-error-container border border-error/30 text-on-error-container text-xs font-semibold">
            <Icon name="error" className="text-[16px] shrink-0" />
            <span>{msg.text}</span>
          </div>
        )
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-on-surface-variant">
          We'll email a one-time OTP code to confirm this change.
        </p>
        <button type="button" onClick={save} disabled={saving}
          className="h-9 inline-flex items-center gap-1.5 px-4 rounded-full bg-[#1e6b65] text-white text-xs font-bold hover:bg-[#145e58] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 shrink-0">
          <Icon name="save" className="text-[15px]" strokeWidth={2.5} />
          <span>Update Password</span>
        </button>
      </div>

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
  return (
    <label className="block w-full">
      <span className="block text-[11px] font-bold text-on-surface uppercase tracking-wider mb-1">{label}</span>
      <div className="relative w-full">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full h-9 px-3 pr-9 bg-surface border border-outline-variant rounded-xl text-on-surface text-xs focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none"
        />
        <button type="button" onClick={toggle} tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer">
          <Icon name={visible ? "visibility_off" : "visibility"} className="text-[16px]" />
        </button>
      </div>
    </label>
  );
}
