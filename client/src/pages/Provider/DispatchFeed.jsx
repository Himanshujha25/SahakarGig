import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import {
  Radar, MapPin, Zap, IndianRupee, Check, Users, AlertTriangle, Radio, BellRing,
  Volume2, VolumeX, Bell, Play, ShieldAlert, X, Clock, Siren, Square
} from "lucide-react";

// ── High-Power 15-Second Emergency Siren Web Audio Engine ──────────────
let alarmCtx = null;
let activeSirenNodes = null;
let sirenTimeout = null;

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
    try { await ctx.resume(); } catch { return false; }
  }
  return ctx.state === "running";
}

if (typeof window !== "undefined") {
  ["pointerdown", "keydown", "touchstart", "click"].forEach((ev) =>
    window.addEventListener(ev, () => { ensureAlarmUnlocked(); }, { passive: true })
  );
}

function stopAlarmSound() {
  if (sirenTimeout) {
    clearTimeout(sirenTimeout);
    sirenTimeout = null;
  }
  if (activeSirenNodes) {
    try {
      activeSirenNodes.oscillators.forEach((osc) => {
        try { osc.stop(); osc.disconnect(); } catch {}
      });
      if (activeSirenNodes.gain) {
        activeSirenNodes.gain.disconnect();
      }
    } catch {}
    activeSirenNodes = null;
  }
}

async function playAlarmSound(isEmergency = true, durationSec = 15) {
  stopAlarmSound();
  const ctx = getAlarmCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return; }
  }

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  
  // High volume (0.80) for loud emergency alert
  masterGain.gain.setValueAtTime(0.001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.80, now + 0.1);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = "sawtooth";
  osc2.type = "triangle";

  // Frequency modulation: Siren sweeps between 680Hz and 1380Hz every 0.6 seconds
  const cycleCount = Math.ceil(durationSec / 0.6);
  for (let i = 0; i < cycleCount; i++) {
    const t = now + i * 0.6;
    osc1.frequency.setValueAtTime(680, t);
    osc1.frequency.linearRampToValueAtTime(1380, t + 0.3);
    osc1.frequency.linearRampToValueAtTime(680, t + 0.6);

    osc2.frequency.setValueAtTime(700, t);
    osc2.frequency.linearRampToValueAtTime(1400, t + 0.3);
    osc2.frequency.linearRampToValueAtTime(700, t + 0.6);
  }

  osc1.connect(masterGain);
  osc2.connect(masterGain);

  osc1.start(now);
  osc2.start(now);

  const endTime = now + durationSec;
  masterGain.gain.setValueAtTime(0.80, endTime - 0.2);
  masterGain.gain.exponentialRampToValueAtTime(0.001, endTime);

  osc1.stop(endTime);
  osc2.stop(endTime);

  activeSirenNodes = { oscillators: [osc1, osc2], gain: masterGain };
  sirenTimeout = setTimeout(() => {
    stopAlarmSound();
  }, durationSec * 1000);
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
    } catch {}
  }
}

// TTL per job card in seconds before auto-escalation/removal
const JOB_EXPIRY_SEC = 60; // 1 minute auto-escalation

// ── Per-provider job declines (remembered for the broadcast TTL) ──────────
const DECLINE_KEY = "sg_declined_broadcast_jobs";

function loadDeclined() {
  try {
    const raw = JSON.parse(localStorage.getItem(DECLINE_KEY) || "{}");
    const now = Date.now();
    const clean = {};
    for (const [id, ts] of Object.entries(raw)) {
      if (now - Number(ts) < JOB_EXPIRY_SEC * 1000) clean[id] = Number(ts);
    }
    return clean;
  } catch { return {}; }
}

function isDeclined(id, declinedMap) {
  if (!id || !declinedMap) return false;
  const ts = declinedMap[id];
  return !!ts && Date.now() - Number(ts) < JOB_EXPIRY_SEC * 1000;
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
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const alertTimerRef = useRef(null);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  const [declined, setDeclined] = useState(loadDeclined);
  const declinedRef = useRef(declined);
  declinedRef.current = declined;

  // Update clock every second for live countdown & auto-expiry
  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNowTimestamp(current);

      // Auto-expire / remove jobs older than 60 seconds (1 min) dynamically
      setJobs((prev) => {
        const filtered = prev.filter((j) => {
          const created = new Date(j.createdAt || current).getTime();
          const elapsedSec = (current - created) / 1000;
          return elapsedSec < JOB_EXPIRY_SEC && !isDeclined(j._id, declinedRef.current);
        });
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  function dedupe(list) {
    const seen = new Set();
    const current = Date.now();
    return list.filter((j) => {
      if (seen.has(j._id)) return false;
      seen.add(j._id);
      // Only keep jobs newer than 60 seconds
      const created = new Date(j.createdAt || current).getTime();
      return (current - created) / 1000 < JOB_EXPIRY_SEC && !isDeclined(j._id, declinedRef.current);
    });
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
      if (isDeclined(job.bookingId || job._id, declinedRef.current)) return;

      // 1. Play 15-second Loud Siren Alarm Sound if not muted
      if (!alarmMuted) {
        setIsSirenPlaying(true);
        playAlarmSound(true, 15);
        setTimeout(() => setIsSirenPlaying(false), 15000);
      }

      // 2. Vibrate mobile device pattern for 15s
      if (navigator.vibrate) {
        navigator.vibrate([400, 200, 400, 200, 800, 200, 400, 200, 400]);
      }

      // 3. Browser Push Notification
      pushNotify(
        `🚨 ${job.targetCategory || job.service} Broadcast Job (1 Min to Claim)!`,
        `${job.locationText || "Nearby"} · ₹${job.price}/hr — Tap to accept first`
      );

      // 4. Flash visual banner for 15s
      setLatestJobAlert(job);
      setNewAlert(true);
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = setTimeout(() => setNewAlert(false), 15000);

      // 5. Add to live feed with current timestamp
      setJobs((prev) => dedupe([{ ...job, _id: job.bookingId || job._id, createdAt: job.createdAt || new Date().toISOString(), isNew: true }, ...prev]));
    }

    function onClaimed(payload) {
      // Instantly remove claimed job so screen becomes clean/blank dynamically
      setJobs((prev) => prev.filter((j) => j._id !== payload?.bookingId));
      if (latestJobAlert?._id === payload?.bookingId) {
        setNewAlert(false);
        stopAlarmSound();
        setIsSirenPlaying(false);
      }
    }

    function onCancelled(payload) {
      // Instantly remove cancelled job so screen becomes clean/blank dynamically
      setJobs((prev) => prev.filter((j) => j._id !== payload?.bookingId));
      if (payload?.targetCategory || payload?.service) {
        setConflict(`${payload.targetCategory || payload.service} request was cancelled or auto-escalated.`);
        clearTimeout(alertTimerRef.current);
        alertTimerRef.current = setTimeout(() => setConflict(null), 4000);
      }
      if (latestJobAlert?._id === payload?.bookingId) {
        setNewAlert(false);
        stopAlarmSound();
        setIsSirenPlaying(false);
      }
    }

    socket.on("booking:broadcast_new", onNew);
    socket.on("booking:claimed", onClaimed);
    socket.on("booking:cancelled", onCancelled);

    const poll = setInterval(load, 8000);
    return () => {
      socket.off("booking:broadcast_new", onNew);
      socket.off("booking:claimed", onClaimed);
      socket.off("booking:cancelled", onCancelled);
      clearInterval(poll);
      clearTimeout(alertTimerRef.current);
      stopAlarmSound();
    };
  }, [alarmMuted, latestJobAlert]);

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
    setIsSirenPlaying(true);
    playAlarmSound(true, 15);
    setTimeout(() => setIsSirenPlaying(false), 15000);
  }

  function handleSilenceSiren() {
    stopAlarmSound();
    setIsSirenPlaying(false);
  }

  async function handleEnablePush() {
    if ("Notification" in window) {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      if (res === "granted") {
        new Notification("SahakarGig Alerts Active", {
          body: "You will receive instant 15-second alarms when new jobs are posted nearby.",
        });
      }
    }
  }

  async function accept(job) {
    stopAlarmSound();
    setIsSirenPlaying(false);
    setBusy(job._id);
    setConflict(null);
    try {
      await api.patch(`/bookings/${job._id}/broadcast-accept`);
      setJobs((prev) => prev.filter((j) => j._id !== job._id));
      navigate(`/provider/job/${job._id}`);
    } catch (err) {
      if (err?.response?.status === 409) {
        setConflict("Job was just claimed by another provider!");
        setJobs((prev) => prev.filter((j) => j._id !== job._id));
      }
    } finally {
      setBusy(null);
    }
  }

  function declineJob(job) {
    const id = job._id;
    stopAlarmSound();
    setIsSirenPlaying(false);
    setDeclined((prev) => {
      const next = { ...prev, [id]: Date.now() };
      try { localStorage.setItem(DECLINE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setJobs((prev) => prev.filter((j) => j._id !== id));
    if (latestJobAlert?._id === id) setNewAlert(false);
  }

  return (
    <div className="w-full px-4 sm:px-6 pt-8 pb-10 space-y-6 max-w-7xl mx-auto">

      {/* 15-Second Active Siren Pulsing Banner */}
      {isSirenPlaying && (
        <div className="rounded-2xl border-2 border-error bg-error/15 p-4 shadow-xl flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error text-white flex items-center justify-center shrink-0 shadow-md">
              <Siren size={22} className="animate-spin" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-error flex items-center gap-1.5">
                🚨 LOUD 15-SEC SIREN ACTIVE!
              </p>
              <p className="text-[12px] text-on-surface-variant">
                New incoming broadcast job. First provider to accept wins!
              </p>
            </div>
          </div>
          <button
            onClick={handleSilenceSiren}
            className="px-4 py-2 rounded-xl bg-error text-white text-[12.5px] font-bold hover:bg-error/90 flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Square size={13} fill="currentColor" /> Silence Siren
          </button>
        </div>
      )}

      {/* Flashing Urgent New Job Alert Bar */}
      {newAlert && latestJobAlert && (
        <div className="rounded-2xl border border-[#00288e] bg-[#e8edff] p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00288e] text-white flex items-center justify-center shrink-0">
              <BellRing size={20} className="animate-bounce" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#00288e]">
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
              onClick={() => declineJob(latestJobAlert)}
              className="h-9 px-3 rounded-xl border border-outline-variant bg-surface-container text-on-surface-variant text-[12.5px] font-bold hover:bg-error-container/40 hover:text-error hover:border-error/40 transition-all cursor-pointer"
            >
              Reject
            </button>
            <button
              onClick={() => { setNewAlert(false); stopAlarmSound(); setIsSirenPlaying(false); }}
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
            Auto-escalates in 60s if unclaimed. First worker to accept wins the job.
          </p>
        </div>

        {/* Audio & Notification Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Test 15s Siren Button */}
          <button
            type="button"
            onClick={isSirenPlaying ? handleSilenceSiren : handleTestAlarm}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] font-bold transition-all cursor-pointer ${
              isSirenPlaying
                ? "border-error bg-error text-white shadow-md animate-pulse"
                : "border-primary/30 bg-[#e8edff] text-[#00288e] hover:bg-[#d7e3ff]"
            }`}
            title="Test 15-second loud emergency siren"
          >
            {isSirenPlaying ? <Square size={13} fill="currentColor" /> : <Play size={14} className="fill-[#00288e]" />}
            {isSirenPlaying ? "Stop Siren (15s)" : "Test Loud Siren (15s)"}
          </button>

          {/* Mute Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (!alarmMuted) stopAlarmSound();
              setAlarmMuted((m) => !m);
            }}
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
              <Radio size={15} /> {jobs.length} live job{jobs.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {conflict && (
        <div className="flex items-center gap-3 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-[13px] text-on-error-container animate-fade-in">
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
        /* Blank Clean Dynamic State */
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface px-6 py-16 text-center shadow-2xs transition-all duration-300">
          <div className="relative">
            <Radar size={48} className="text-[#00288e]" strokeWidth={1.5} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00288e] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00288e]" />
            </span>
          </div>
          <h3 className="text-[16px] font-bold text-on-surface">Listening for broadcast jobs…</h3>
          <p className="text-[13.5px] text-on-surface-variant max-w-md">
            All requests are clear. When a household broadcasts a request nearby, it will blare a 15-second siren and auto-escalate within 1 minute.
          </p>
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handleTestAlarm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-[12px] font-bold text-on-surface hover:border-primary cursor-pointer"
            >
              <Volume2 size={13} className="text-[#00288e]" /> Test 15s Siren
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 transition-all duration-300">
          {jobs.map((j) => {
            const created = new Date(j.createdAt || nowTimestamp).getTime();
            const elapsed = Math.floor((nowTimestamp - created) / 1000);
            const remainingSec = Math.max(0, JOB_EXPIRY_SEC - elapsed);
            const progressPct = Math.min(100, Math.max(0, (remainingSec / JOB_EXPIRY_SEC) * 100));

            return (
              <div
                key={j._id}
                className={`flex flex-col justify-between gap-4 rounded-2xl border bg-surface p-5 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] ${
                  remainingSec <= 15
                    ? "border-error shadow-[0_0_0_2px_rgba(186,26,26,0.2)] bg-error-container/5"
                    : j.isNew
                    ? "border-[#00288e] shadow-[0_0_0_3px_rgba(0,40,142,0.15)]"
                    : j.isEmergency
                    ? "border-error/50 bg-error-container/10"
                    : "border-outline-variant/60 hover:border-outline"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar with Badge + 1-Minute Countdown Timer */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {j.isNew ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00288e] text-white text-[10.5px] font-bold animate-pulse">
                          <BellRing size={11} /> NEW
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
                    </div>

                    {/* Auto-escalation 60s countdown badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight ${
                        remainingSec <= 15
                          ? "bg-error text-white animate-pulse"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      <Clock size={11} /> {remainingSec}s left
                    </span>
                  </div>

                  {/* 60-Second Auto-Escalation Progress Bar */}
                  <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        remainingSec <= 15 ? "bg-error" : "bg-[#00288e]"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
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

                <div className="flex items-center gap-2">
                  <button
                    disabled={busy === j._id}
                    onClick={() => accept(j)}
                    className="h-11 flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00288e] text-white text-[13.5px] font-bold hover:bg-[#173bab] hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-60 cursor-pointer"
                  >
                    <Check size={16} strokeWidth={2.5} />
                    {busy === j._id ? "Accepting Job…" : "Accept & Claim Job"}
                  </button>
                  <button
                    onClick={() => declineJob(j)}
                    title="Reject this job"
                    className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-error-container/40 hover:text-error hover:border-error/40 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                  >
                    <X size={17} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
