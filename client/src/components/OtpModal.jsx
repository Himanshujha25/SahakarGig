import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import OtpInput from "./OtpInput";
import Icon from "./Icon";

const RESEND_SECONDS = 45;

/**
 * Reusable OTP dialog. Sends an OTP to `email` for the given server-side
 * `purpose` when opened (and on demand via Resend), then calls
 * `onVerify(code)` with the entered code. Parent decides what verification
 * means (reset password, change password, verify email, change email…).
 *
 * Props: open, onClose, title, subtitle, email, purpose, onVerify(async fn),
 *        ctaLabel, autoSend (default true — set false when the parent already
 *        triggered the send itself, e.g. forgot-password initiation).
 */
export default function OtpModal({
  open, onClose, title = "Verify with OTP", subtitle,
  email, purpose, onVerify, ctaLabel = "Verify", autoSend = true,
}) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const sendOtp = useCallback(async () => {
    if (!email || !purpose) return;
    setSending(true); setErr(""); setInfo("");
    try {
      const { data } = await api.post("/auth/send-otp", { email, purpose });
      setInfo(data.message || "OTP sent.");
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setErr(e.response?.data?.message || "Could not send OTP. Please try again.");
    } finally { setSending(false); }
  }, [email, purpose]);

  // auto-send on open (skipped when the parent already initiated the send)
  useEffect(() => {
    if (open && autoSend) { setCode(""); setErr(""); setInfo(""); sendOtp(); }
    else if (open) { setCode(""); setErr(""); setInfo(""); setCooldown(RESEND_SECONDS); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // countdown timer
  useEffect(() => {
    if (!open || cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [open, cooldown]);

  useEffect(() => {
    function esc(e) { if (e.key === "Escape" && open) onClose?.(); }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    if (code.length < 6 || verifying) return;
    setVerifying(true); setErr("");
    try {
      await onVerify(code);
      // parent closes on success; reset here in case it stays open
      setCode("");
    } catch (e2) {
      setErr(e2.response?.data?.message || e2.message || "Verification failed.");
      setCode("");
    } finally { setVerifying(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-body-md antialiased">
      <div className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-surface-container-lowest shadow-lg ring-1 ring-black/5 p-6 sm:p-8">
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
          <Icon name="close" className="text-[20px]" />
        </button>

        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
            <Icon name="mark_email_read" className="text-[20px] text-primary" />
          </div>
          <h3 className="font-heading text-[18px] font-bold text-on-surface tracking-tight">{title}</h3>
        </div>
        <p className="text-[13px] text-on-surface-variant mb-5">
          {subtitle || <>We've sent a 6-digit code to <span className="font-semibold text-on-surface">{email}</span>. Enter it below.</>}
        </p>

        {(err || info) && (
          err ? (
            /* Same error banner as Login.jsx */
            <div className="mb-4 rounded-lg bg-error-container border border-error/20 px-4 py-3 flex items-center gap-3 text-on-error-container">
              <Icon name="error" className="text-[18px] text-error shrink-0" />
              <span className="text-[13px] font-medium">{err}</span>
            </div>
          ) : (
            /* Same success chip as the Settings "Saved" toast */
            <div className="mb-4 rounded-lg px-4 py-3 flex items-center gap-3 bg-[#e6f9ec] border border-[#006d30]/20 text-[#006d30]">
              <Icon name="check_circle" className="text-[18px] shrink-0" />
              <span className="text-[13px] font-medium">{info}</span>
            </div>
          )
        )}

        <form onSubmit={submit} className="space-y-5">
          <OtpInput value={code} onChange={setCode} disabled={verifying} />

          <button type="submit" disabled={code.length < 6 || verifying}
            className="w-full flex justify-center items-center gap-2 py-3 rounded-lg text-[14px] font-semibold border border-primary/30 bg-[#e8edff] text-[#00288e] hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_4px_14px_rgba(0,40,142,0.18)] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 cursor-pointer">
            {verifying && (
              <span className="inline-block h-4 w-4 border-2 border-[#00288e]/30 border-t-[#00288e] rounded-full animate-spin" />
            )}
            {verifying ? "Verifying…" : ctaLabel}
          </button>

          <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
            <span>Didn't receive the code?</span>
            <button type="button" onClick={() => { if (cooldown > 0) return; sendOtp(); }}
              disabled={sending || cooldown > 0}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-container transition-colors disabled:opacity-50 cursor-pointer">
              <Icon name="refresh" className={`text-[14px] ${sending ? "animate-spin" : ""}`} strokeWidth={2.4} />
              {cooldown > 0 && !sending ? `Resend in ${cooldown}s` : sending ? "Sending…" : "Resend OTP"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
