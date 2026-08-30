import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import {
  Radar, MapPin, Zap, IndianRupee, Check, Users, AlertTriangle, Radio, BellRing,
  Volume2, VolumeX, Bell, Play, ShieldAlert, X, Clock, Siren, Square,
  ShieldCheck, FileCheck2, Building, UserCheck, ExternalLink, RefreshCw
} from "lucide-react";

import { playSiren, stopSiren, triggerJobAlert } from "../../lib/alarmSound";

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
  const [providerInfo, setProviderInfo] = useState(null);
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
      const [jobsRes, provRes] = await Promise.allSettled([
        api.get("/bookings/broadcast/available"),
        api.get("/providers/me"),
      ]);
      if (jobsRes.status === "fulfilled") {
        setJobs(dedupe(Array.isArray(jobsRes.value.data) ? jobsRes.value.data : []));
      }
      if (provRes.status === "fulfilled") {
        setProviderInfo(provRes.value.data);
      }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => {
    if (!socket.connected) socket.connect();
    load();

    function onNew(job) {
      if (isDeclined(job.bookingId || job._id, declinedRef.current)) return;

      // 1. Play 15-second Loud Siren Alarm Sound + Voice Alert if not muted
      if (!alarmMuted) {
        setIsSirenPlaying(true);
        playSiren(15);
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
        stopSiren();
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
        stopSiren();
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

      {/* ── COOPERATIVE VERIFICATION AUDIT HERO CARD ── */}
      {providerInfo && (!providerInfo.verified || providerInfo.verificationStatus !== "verified") && (
        <div className="rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-surface to-amber-500/5 p-6 sm:p-8 shadow-lg space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-on-surface" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                    Account Verification Under Review
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/30 animate-pulse">
                    Pending Approval
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Assigned Cooperative Society: <strong className="text-on-surface">{providerInfo.cooperativeId?.name || "Accredited Labour Cooperative"}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={load}
              className="px-3.5 py-2 rounded-xl bg-surface border border-outline-variant hover:border-primary/40 text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Check Status
            </button>
          </div>

          {/* 3-Step Verification Progression Stepper */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface border border-emerald-500/30 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">1. Documents Uploaded</p>
                <p className="text-[11px] text-on-surface-variant">Govt ID, Skills & Police Clearances submitted</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">2. Cooperative Audit</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">Officers inspecting certificates & KYC</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/60 flex items-start gap-3 opacity-60">
              <div className="w-8 h-8 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">3. Dispatch Activation</p>
                <p className="text-[11px] text-on-surface-variant">Instant order sirens & guaranteed payouts</p>
              </div>
            </div>
          </div>

          {/* Submitted Documents Status Overview */}
          {providerInfo.documentDetails && providerInfo.documentDetails.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Submitted Verification Documents ({providerInfo.documentDetails.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {providerInfo.documentDetails.map((doc, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface border border-outline-variant flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2 size={16} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{doc.docType}</p>
                        <p className="text-[10.5px] text-on-surface-variant truncate">{doc.docNumber || "Verified Document"}</p>
                      </div>
                    </div>
                    {doc.docUrl && (
                      <a
                        href={doc.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg text-primary hover:bg-primary-container/30 transition"
                        title="View Document"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-surface border border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-on-surface-variant">
            <p>
              💡 <strong>Note:</strong> You can log in and browse all training resources and welfare fund features. Live job broadcast sirens will automatically unlock on this feed once your cooperative board approves your profile.
            </p>
            <Link
              to="/provider/profile"
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition shadow-xs whitespace-nowrap"
            >
              Update Credentials
            </Link>
          </div>
        </div>
      )}

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
          <p className="hidden sm:block text-[14px] text-on-surface-variant mt-0.5">
            Auto-escalates in 60s if unclaimed. First worker to accept wins the job.
          </p>
        </div>

        {/* Audio & Notification Controls */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Test 15s Siren Button */}
          <button
            type="button"
            onClick={isSirenPlaying ? handleSilenceSiren : handleTestAlarm}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 sm:py-2 rounded-xl border text-[12.5px] font-bold transition-all cursor-pointer ${
              isSirenPlaying
                ? "border-error bg-error text-white shadow-md animate-pulse"
                : "border-primary/30 bg-[#e8edff] text-[#00288e] hover:bg-[#d7e3ff]"
            }`}
            title="Test 15-second loud emergency siren"
          >
            {isSirenPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} className="fill-[#00288e]" />}
            <span className="hidden sm:inline">{isSirenPlaying ? "Stop Siren (15s)" : "Test Loud Siren (15s)"}</span>
          </button>

          {/* Mute Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (!alarmMuted) stopAlarmSound();
              setAlarmMuted((m) => !m);
            }}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 sm:py-2 rounded-xl border text-[12.5px] font-bold transition-all cursor-pointer ${
              alarmMuted
                ? "border-error/40 bg-error-container/50 text-on-error-container"
                : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/40"
            }`}
            title={alarmMuted ? "Alarm Sound Muted" : "Alarm Sound Enabled"}
          >
            {alarmMuted ? <VolumeX size={18} className="text-error" /> : <Volume2 size={18} className="text-[#00288e]" />}
            <span className="hidden sm:inline">{alarmMuted ? "Muted" : "Sound ON"}</span>
          </button>

          {/* Push Notification Button */}
          {notifPermission !== "granted" && (
            <button
              type="button"
              onClick={handleEnablePush}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 sm:py-2 rounded-xl bg-primary text-on-primary text-[12.5px] font-bold hover:shadow-md transition-all cursor-pointer"
            >
              <Bell size={17} /> <span className="hidden sm:inline">Enable Push Alerts</span>
            </button>
          )}

          {jobs.length > 0 && (
            <div className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 sm:py-2 rounded-xl bg-[#e8edff] text-[#00288e] text-[12.5px] font-bold">
              <Radio size={17} /> <span className="hidden sm:inline">{jobs.length} live job{jobs.length > 1 ? "s" : ""}</span>
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
            className={`flex flex-col justify-between gap-4 rounded-2xl border bg-surface p-5 sm:p-5 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] ${
              remainingSec <= 15
                ? "border-error shadow-[0_0_0_2px_rgba(186,26,26,0.2)] bg-error-container/5"
                : j.isNew
                ? "border-[#00288e] shadow-[0_0_0_3px_rgba(0,40,142,0.15)]"
                : j.isEmergency
                ? "border-error/50 bg-error-container/10"
                : "border-outline-variant/60 hover:border-outline"
            }`}
          >
            <div className="space-y-3.5">
              {/* Top Bar with Badge + 1-Minute Countdown Timer */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {j.isNew ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00288e] text-white text-[11px] font-bold animate-pulse">
                      <BellRing size={12} /> NEW
                    </span>
                  ) : j.isEmergency ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error text-white text-[11px] font-bold">
                      <Zap size={12} /> EMERGENCY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e8edff] text-[#00288e] text-[11px] font-bold">
                      <Radio size={12} /> BROADCAST
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
                  <Clock size={12} /> {remainingSec}s left
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
                <div className="min-w-0 flex-1">
                  <h3 className="text-[17px] font-bold text-on-surface leading-snug truncate">{j.targetCategory || j.service}</h3>
                  <p className="text-[12.5px] text-on-surface-variant mt-1 flex items-center gap-1 truncate">
                    <Users size={14} className="shrink-0" /> <span className="truncate">{j.householdId?.name || "Verified Household"}</span>
                  </p>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <p className="flex items-center justify-end gap-0.5 text-[18px] font-extrabold text-[#00288e]">
                    <IndianRupee size={16} /> {j.price ?? 250}
                  </p>
                  <p className="text-[10.5px] text-on-surface-variant font-semibold">per hour</p>
                </div>
              </div>

              <div className="space-y-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3 text-[13px]">
                <p className="flex items-center gap-2 text-on-surface font-semibold truncate">
                  <MapPin size={15} className="text-[#00288e] shrink-0" /> <span className="truncate">{j.locationText || j.targetCategory}</span>
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
