import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { AIIcon, AIBadge } from "../../components/AIIcon";
import {
  Radar, MapPin, Zap, IndianRupee, Check, Users, AlertTriangle, Radio, BellRing,
  Volume2, VolumeX, Bell, Play, ShieldAlert, X
} from "lucide-react";

// ── Web Audio Engine (Autoplay compliant) ──────────────────────────────
let alarmCtx = null;
function getAlarmCtx() {
  try {
    if (!alarmCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) alarmCtx = new AudioContextClass();
    }
    return alarmCtx;
  } catch { return null; }
}

async function ensureAlarmUnlocked() {
  const ctx = getAlarmCtx();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

if (typeof window !== "undefined") {
  ["pointerdown", "keydown", "touchstart", "click"].forEach((ev) =>
    window.addEventListener(ev, () => { ensureAlarmUnlocked(); }, { passive: true })
  );
}

async function playAlarmSound(isEmergency = false) {
  const ctx = getAlarmCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return; }
  }

  const now = ctx.currentTime;
  const notes = isEmergency
    ? [1000, 1500, 1000, 1500, 1000, 1500, 1200]
    : [880, 1100, 880, 1100, 880, 660];

  notes.forEach((freq, i) => {
    const t = now + i * (isEmergency ? 0.18 : 0.22);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = isEmergency ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(isEmergency ? 0.35 : 0.25, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isEmergency ? 0.15 : 0.18));
    osc.start(t);
    osc.stop(t + (isEmergency ? 0.17 : 0.20));
  });
}

// ── Push Notification Dispatch ──────────────────────────────────────
async function pushNotify(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/icon-192.png", tag: "dispatch-alert" });
    } catch {
      /* fallback on restricted webview environments */
    }
  }
}

export default function DispatchFeed() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [newAlert, setNewAlert] = useState(false);
  const [latestJobAlert, setLatestJobAlert] = useState(null);
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
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

  useEffect(() => {
    if (!socket.connected) socket.connect();
    load();

    function onNew(job) {
      // 1. Play Web Audio alarm sound if not muted
      if (!alarmMuted) {
        playAlarmSound(!!job.isEmergency);
      }

      // 2. Vibrate mobile device pattern
      if (navigator.vibrate) {
        navigator.vibrate(job.isEmergency ? [300, 100, 300, 100, 500] : [200, 100, 200, 100, 400]);
      }

      // 3. Browser Push Notification
      pushNotify(
        `${job.isEmergency ? "🚨 EMERGENCY" : "⚡ Instant"} ${job.targetCategory || job.service} Job!`,
        `${job.locationText || "Nearby"} · ₹${job.price}/hr — Tap to accept first`
      );

      // 4. Flash visual banner
      setLatestJobAlert(job);
      setNewAlert(true);
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = setTimeout(() => setNewAlert(false), 8000);

      // 5. Update feed
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

    const poll = setInterval(load, 12000);
    return () => {
      socket.off("booking:broadcast_new", onNew);
      socket.off("booking:claimed", onClaimed);
      socket.off("booking:cancelled", onCancelled);
      clearInterval(poll);
      clearTimeout(alertTimerRef.current);
    };
  }, [alarmMuted]);

  // Presence + live GPS stream while this page is open → household radar shows
  // the worker's live pin (accurate distance), not a stale saved location.
  useEffect(() => {
    if (!navigator.geolocation) return;
    if (!socket.connected) socket.connect();
    let watchId = null;
    let last = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          last = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          if (socket.connected) socket.emit("provider:heartbeat", last);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    } catch {}
    const tick = setInterval(() => {
      if (last && socket.connected) socket.emit("provider:heartbeat", last);
    }, 10000);
    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      clearInterval(tick);
    };
  }, []);

  async function handleTestAlarm() {
    await ensureAlarmUnlocked();
    playAlarmSound(false);
  }

  async function handleEnablePush() {
    if ("Notification" in window) {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      if (res === "granted") {
        new Notification("SahakarGig Alerts Active", {
          body: "You will receive instant alarms when new jobs are posted nearby.",
        });
      }
    }
  }

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
    <div className="w-full px-4 sm:px-6 pt-8 pb-10 space-y-6 max-w-7xl mx-auto">

      {/* Flashing Urgent New Job Alert Bar */}
      {newAlert && latestJobAlert && (
        <div className="rounded-2xl border border-error bg-error/10 p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error text-white flex items-center justify-center shrink-0">
              <BellRing size={20} className="animate-bounce" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-on-surface">
                {latestJobAlert.isEmergency ? "🚨 Emergency Request Alert!" : "⚡ New Broadcast Job Nearby!"}
              </p>
              <p className="text-[12px] text-on-surface-variant">
                {latestJobAlert.targetCategory || latestJobAlert.service} · {latestJobAlert.locationText} · <strong className="text-on-surface">₹{latestJobAlert.price}/hr</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => accept(latestJobAlert)}
              disabled={busy === latestJobAlert._id}
              className="flex-1 sm:flex-initial h-9 px-4 rounded-xl bg-[#00288e] text-white text-[12.5px] font-bold hover:bg-[#173bab] transition-all cursor-pointer"
            >
              {busy === latestJobAlert._id ? "Accepting…" : "Accept Now"}
            </button>
            <button
              onClick={() => setNewAlert(false)}
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Header & Alarm Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            Live Job Dispatch
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Nearby broadcast requests matching your skills. First worker to accept wins the job.
          </p>
        </div>

        {/* Audio & Notification Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Test Sound Button */}
          <button
            type="button"
            onClick={handleTestAlarm}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 bg-[#e8edff] text-[#00288e] text-[12.5px] font-bold hover:bg-[#d7e3ff] transition-all cursor-pointer"
            title="Test alarm siren sound"
          >
            <Play size={14} className="fill-[#00288e]" /> Test Alarm Sound
          </button>

          {/* Mute Toggle Button */}
          <button
            type="button"
            onClick={() => setAlarmMuted((m) => !m)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] font-bold transition-all cursor-pointer ${
              alarmMuted
                ? "border-error/40 bg-error-container/50 text-on-error-container"
                : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/40"
            }`}
            title={alarmMuted ? "Alarm Sound Muted" : "Alarm Sound Enabled"}
          >
            {alarmMuted ? <VolumeX size={15} className="text-error" /> : <Volume2 size={15} className="text-[#00288e]" />}
            {alarmMuted ? "Muted" : "Sound ON"}
          </button>

          {/* Push Notification Button */}
          {notifPermission !== "granted" && (
            <button
              type="button"
              onClick={handleEnablePush}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-on-primary text-[12.5px] font-bold hover:shadow-md transition-all cursor-pointer"
            >
              <Bell size={14} /> Enable Push Alerts
            </button>
          )}

          {jobs.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e8edff] text-[#00288e] text-[12.5px] font-bold">
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
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface px-6 py-16 text-center shadow-2xs">
          <div className="relative">
            <Radar size={48} className="text-[#00288e]" strokeWidth={1.5} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00288e] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00288e]" />
            </span>
          </div>
          <h3 className="text-[16px] font-bold text-on-surface">Listening for broadcast jobs…</h3>
          <p className="text-[13.5px] text-on-surface-variant max-w-md">
            New broadcast requests matching your category in your area will appear here instantly with an alarm siren sound and push notification.
          </p>
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleTestAlarm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-[12px] font-bold text-on-surface hover:border-primary cursor-pointer"
            >
              <Volume2 size={13} className="text-[#00288e]" /> Test Alarm Audio
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <div key={j._id}
              className={`flex flex-col justify-between gap-4 rounded-2xl border bg-surface p-5 transition-all duration-200 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] ${
                j.isNew
                  ? "border-[#00288e] shadow-[0_0_0_3px_rgba(0,40,142,0.15)]"
                  : j.isEmergency
                  ? "border-error/50 bg-error-container/10"
                  : "border-outline-variant/60 hover:border-outline"
              }`}>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {j.isNew ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00288e] text-white text-[10.5px] font-bold animate-pulse">
                      <BellRing size={11} /> NEW JOB
                    </span>
                  ) : j.isEmergency ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error text-white text-[10.5px] font-bold">
                      <Zap size={11} /> EMERGENCY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e8edff] text-[#00288e] text-[10.5px] font-bold">
                      <Radio size={11} /> BROADCAST
                    </span>
                  )}
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    {j.createdAt ? new Date(j.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] font-bold text-on-surface">{j.targetCategory || j.service}</h3>
                    <p className="text-[12.5px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                      <Users size={13} /> {j.householdId?.name || "Verified Household"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="flex items-center justify-end gap-0.5 text-[17px] font-extrabold text-[#00288e]">
                      <IndianRupee size={15} /> {j.price ?? 250}
                    </p>
                    <p className="text-[10.5px] text-on-surface-variant font-semibold">per hour</p>
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3 text-[13px]">
                  <p className="flex items-center gap-2 text-on-surface font-semibold truncate">
                    <MapPin size={15} className="text-[#00288e] shrink-0" /> {j.locationText || j.targetCategory}
                  </p>
                  {j.isEmergency && (
                    <p className="text-[11.5px] font-bold text-error flex items-center gap-1">
                      <ShieldAlert size={13} /> Priority instant emergency response required
                    </p>
                  )}
                </div>
              </div>

              <button
                disabled={busy === j._id}
                onClick={() => accept(j)}
                className="h-11 w-full flex items-center justify-center gap-2 rounded-xl bg-[#00288e] text-white text-[13.5px] font-bold hover:bg-[#173bab] hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-60 cursor-pointer">
                <Check size={16} strokeWidth={2.5} />
                {busy === j._id ? "Accepting Job…" : "Accept & Claim Job"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
