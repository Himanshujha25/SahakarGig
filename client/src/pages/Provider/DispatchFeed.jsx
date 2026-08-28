import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import {
  Radar, MapPin, Zap, IndianRupee, Check, Users, AlertTriangle, Radio, BellRing,
} from "lucide-react";

// ── Alarm sound using Web Audio API (no external file needed) ──────────────
// Single shared AudioContext — creating a new one per event never plays on
// Chrome/Edge/Safari because of the autoplay policy (context starts suspended).
let alarmCtx = null;
function getAlarmCtx() {
  try {
    if (!alarmCtx) alarmCtx = new (window.AudioContext || window.webkitAudioContext)();
    return alarmCtx;
  } catch { return null; }
}

// Autoplay policy: audio only unlocks after a user gesture. Resume the context
// on the first tap/click/keypress anywhere in the app so the alarm CAN ring later.
function unlockAlarmAudio() {
  const ctx = getAlarmCtx();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}
if (typeof window !== "undefined") {
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, unlockAlarmAudio, { once: true, passive: true })
  );
}

function playAlarm() {
  const ctx = getAlarmCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  // Urgent siren: alternating high tones, square wave = far more audible
  const notes = [880, 1100, 880, 1100, 880, 660];
  notes.forEach((freq, i) => {
    const t = now + i * 0.22;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

// ── Browser push notification (asks permission once) ──────────────────────
async function pushNotify(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") await Notification.requestPermission();
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icon-192.png", tag: "dispatch-alert" });
  }
}

export default function DispatchFeed() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [newAlert, setNewAlert] = useState(false); // flashing badge
  const alertTimerRef = useRef(null);

  function dedupe(list) {
    const seen = new Set();
    return list.filter((j) => (seen.has(j._id) ? false : (seen.add(j._id), true)));
  }

  async function load() {
    try {
      const { data } = await api.get("/bookings/broadcast/available");
      setJobs(dedupe(Array.isArray(data) ? data : []));
    } catch {} finally { setLoading(false); }
  }

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    load();

    function onNew(job) {
      // 1. Play alarm sound
      playAlarm();

      // 2. Vibrate device (mobile)
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);

      // 3. Browser push notification (works even if tab is in background)
      pushNotify(
        `🚨 New ${job.targetCategory || job.service} Job!`,
        `${job.locationText || "Nearby"} · ₹${job.price}/hr — Tap to accept`
      );

      // 4. Flash the alert badge for 5 seconds
      setNewAlert(true);
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = setTimeout(() => setNewAlert(false), 5000);

      // 5. Add card to feed
      setJobs((prev) => dedupe([{ ...job, _id: job.bookingId || job._id, isNew: true }, ...prev]));
    }

    function onClaimed(payload) {
      setJobs((prev) => prev.filter((j) => j._id !== payload?.bookingId));
    }

    function onCancelled(payload) {
      setJobs((prev) => prev.filter((j) => j._id !== payload?.bookingId));
      if (payload?.targetCategory || payload?.service) {
        setConflict(`${payload.targetCategory || payload.service} request was cancelled by the household.`);
        clearTimeout(alertTimerRef.current);
        alertTimerRef.current = setTimeout(() => setConflict(null), 5000);
      }
    }

    socket.on("booking:broadcast_new", onNew);
    socket.on("booking:claimed", onClaimed);
    socket.on("booking:cancelled", onCancelled);

    const poll = setInterval(load, 15000);
    return () => {
      socket.off("booking:broadcast_new", onNew);
      socket.off("booking:claimed", onClaimed);
      socket.off("booking:cancelled", onCancelled);
      clearInterval(poll);
      clearTimeout(alertTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function accept(job) {
    setBusy(job._id);
    setConflict(null);
    try {
      await api.patch(`/bookings/${job._id}/broadcast-accept`);
      setJobs((prev) => prev.filter((j) => j._id !== job._id));
      navigate(`/provider/job/${job._id}`);
    } catch (err) {
      if (err?.response?.status === 409) {
        setConflict("Job already claimed by another provider.");
        setJobs((prev) => prev.filter((j) => j._id !== job._id));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="w-full px-6 pt-8 pb-10 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            Live Job Dispatch
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Nearby broadcast requests matching your skills. First to accept wins the job.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Flashing NEW alert badge */}
          {newAlert && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-error text-white text-[13px] font-bold animate-pulse">
              <BellRing size={15} /> New Job Alert!
            </div>
          )}
          {jobs.length > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8edff] text-[#00288e] text-[13px] font-bold">
              <Radio size={15} /> {jobs.length} open job{jobs.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {conflict && (
        <div className="flex items-center gap-3 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-[13px] text-on-error-container">
          <AlertTriangle size={16} className="shrink-0" /> {conflict}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-outline-variant/60 bg-surface p-5 h-44" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface px-6 py-16 text-center">
          <Radar size={44} className="text-outline-variant" strokeWidth={1.5} />
          <p className="text-[15px] font-semibold text-on-surface">No open jobs right now</p>
          <p className="text-[14px] text-on-surface-variant max-w-sm">
            New broadcast requests in your area will appear here instantly with an alarm.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <div key={j._id}
              className={`flex flex-col gap-4 rounded-2xl border bg-surface p-5 transition-all duration-200 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] ${
                j.isNew
                  ? "border-[#00288e] shadow-[0_0_0_3px_rgba(0,40,142,0.15)]"
                  : j.isEmergency
                  ? "border-error/40"
                  : "border-outline-variant/60 hover:border-outline"
              }`}>

              {/* New badge */}
              {j.isNew && (
                <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-[#00288e] text-white text-[10px] font-bold animate-pulse">
                  <BellRing size={10} /> NEW
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-bold text-on-surface">{j.targetCategory || j.service}</p>
                    {j.isEmergency && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fce8e8] text-[#ba1a1a] text-[10px] font-bold">
                        <Zap size={10} /> Emergency
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                    <Users size={12} /> {j.householdId?.name || "Household"}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#e8edff] text-[#00288e] px-2.5 py-1 text-[11px] font-bold">
                  <Radar size={11} /> Open
                </span>
              </div>

              <div className="space-y-2 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5 text-[13px]">
                <p className="flex items-center gap-2 text-on-surface-variant">
                  <MapPin size={14} className="text-[#00288e]" /> {j.locationText || j.targetCategory}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-on-surface-variant">
                    {j.createdAt ? new Date(j.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                  </p>
                  <p className="flex items-center gap-1 text-[15px] font-bold text-on-surface">
                    <IndianRupee size={13} /> {j.price ?? 250}<span className="text-[11px] font-normal text-on-surface-variant">/hr</span>
                  </p>
                </div>
              </div>

              <button
                disabled={busy === j._id}
                onClick={() => accept(j)}
                className="h-11 w-full flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-[#e8edff] text-[#00288e] text-[13px] font-bold hover:border-primary hover:bg-[#d7e3ff] hover:shadow-[0_4px_14px_rgba(0,40,142,0.18)] active:scale-[0.98] transition-all duration-200 disabled:opacity-60">
                <Check size={15} strokeWidth={2.5} />
                {busy === j._id ? "Accepting…" : "Accept Job"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
