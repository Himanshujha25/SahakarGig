// ── High-Power Emergency Siren & Voice Announcer Engine for Gig Workers ──

let audioCtx = null;
let activeOscillators = [];
let sirenTimer = null;
let isSirenActive = false;

export function getAudioContext() {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Ensure audio context is active and unlocked (handles mobile autoplay policies)
export async function unlockAudio() {
  const ctx = getAudioContext();
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

// Auto-unlock audio on user interaction anywhere on the page
if (typeof window !== "undefined") {
  const unlockEvents = ["touchstart", "touchend", "pointerdown", "click", "keydown"];
  const handleUserInteraction = () => {
    unlockAudio();
  };
  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, handleUserInteraction, { passive: true, once: false });
  });
}

// ── 1. Stop Siren Sound ──────────────────────────────────────────────
export function stopSiren() {
  isSirenActive = false;
  if (sirenTimer) {
    clearTimeout(sirenTimer);
    sirenTimer = null;
  }

  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {}
  });
  activeOscillators = [];

  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {}

  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(0);
    }
  } catch (err) {
    // Ignore user gesture intervention warnings
  }
}

export const stopAlarmSound = stopSiren;

// ── 2. Play Synthesized High-Pitch Emergency Siren ──────────────────
export async function playSiren(durationSec = 20) {
  stopSiren();
  isSirenActive = true;

  const ctx = getAudioContext();
  if (!ctx) return;
  await unlockAudio();

  try {
    const now = ctx.currentTime;
    const endTime = now + durationSec;

    // Dual Oscillators for a realistic loud European/American two-tone ambulance siren
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "square";

    const fMin = 750;
    const fMax = 1400;
    const cycle = 0.35; // Fast sweep

    for (let t = now; t < endTime; t += cycle) {
      osc1.frequency.setValueAtTime(fMin, t);
      osc1.frequency.linearRampToValueAtTime(fMax, t + cycle * 0.5);
      osc1.frequency.linearRampToValueAtTime(fMin, t + cycle);

      osc2.frequency.setValueAtTime(fMin * 1.02, t);
      osc2.frequency.linearRampToValueAtTime(fMax * 1.02, t + cycle * 0.5);
      osc2.frequency.linearRampToValueAtTime(fMin * 1.02, t + cycle);
    }

    // High volume with gentle ramp to prevent clicking
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.6, now + 0.05);
    gainNode.gain.setValueAtTime(0.6, endTime - 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(endTime);
    osc2.stop(endTime);

    activeOscillators = [osc1, osc2];

    sirenTimer = setTimeout(() => {
      stopSiren();
    }, durationSec * 1000);
  } catch (err) {
    console.error("Failed to play Web Audio siren:", err);
  }

  // Trigger Haptic Vibration Pattern on mobile devices if permitted
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([500, 200, 500, 200, 800, 200, 800]);
    }
  } catch (err) {
    // Ignore autoplay/user gesture intervention
  }
}

// ── 3. Voice Speech Announcement ────────────────────────────────────
export function speakAlert(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    // Prefer Hindi/Indian English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.includes("en-IN") || v.lang.includes("hi-IN") || v.name.toLowerCase().includes("india")
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}

// ── 4. Trigger Full Emergency Dispatch Alarm ────────────────────────
export async function triggerJobAlert(job) {
  // 1. Play Loud Siren
  playSiren(15);

  // 2. Speak voice notification after a brief 1.5s siren introduction
  setTimeout(() => {
    if (isSirenActive) {
      const category = job?.targetCategory || job?.service || "Emergency Gig";
      const price = job?.price ? `₹${job.price}` : "urgent rate";
      const locality = job?.locationText || "nearby";
      speakAlert(`New Emergency ${category} request in ${locality}! Payout ${price}. Tap to accept now!`);
    }
  }, 1200);

  // 3. Show System PWA Push Notification (works when screen locked/background)
  showBackgroundNotification(job);
}

// ── 5. Background Notification Dispatch ─────────────────────────────
export async function showBackgroundNotification(job) {
  try {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      const title = `🚨 Emergency Job: ${job.targetCategory || "Gig Request"}`;
      const body = `📍 ${job.locationText || "Nearby"} • ₹${job.price || 250} • Tap to accept instantly!`;

      // If Service Worker is registered, use showNotification for background support
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          vibrate: [500, 200, 500, 200, 800, 200, 800],
          tag: "emergency-job-alert",
          requireInteraction: true,
          data: { url: "/provider/dispatch" },
        });
      } else {
        new Notification(title, {
          body,
          icon: "/pwa-192x192.png",
          tag: "emergency-job-alert",
        });
      }
    }
  } catch (err) {
    console.warn("Notification error:", err);
  }
}
