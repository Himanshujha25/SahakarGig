import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import VerifiedBadge from "../../components/VerifiedBadge";
import { AIIcon, AIBadge } from "../../components/AIIcon";
import {
  Radar, MapPin, Phone, Star, ShieldCheck, BadgeCheck, Lock,
  IndianRupee, ArrowRight, Zap, Handshake, CheckCircle2, Users, IdCard,
  ChevronDown, Check, Building2, Sparkles
} from "lucide-react";

const CATEGORIES = [
  "Plumber", "Electrician", "Tutor", "Cook", "Cleaner",
  "Caregiver", "Driver", "Gardener", "Carpenter", "Painter",
];

const RADIUS_KM = 25;

// Real geodesic helpers (same math the server uses)
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la = toRad(a.lat);
  const lb = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearingDeg(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (d) => (d * 180) / Math.PI;
  const dLng = toRad(b.lng - a.lng);
  const la = toRad(a.lat);
  const lb = toRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lb);
  const x = Math.cos(la) * Math.sin(lb) - Math.sin(la) * Math.cos(lb) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Custom category dropdown — matches the dashboard TimeframePicker style
function CategoryDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = value || "";

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-12 w-full inline-flex items-center justify-between gap-2 px-4 rounded-xl border text-[14px] font-semibold transition-all duration-200 ${
          open
            ? "border-primary bg-primary-container text-on-primary-container"
            : selected
            ? "border-primary/40 bg-surface-container-lowest text-on-surface hover:border-primary/60"
            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-low"
        }`}
      >
        <span className={selected ? "" : "font-normal"}>
          {selected ? CATEGORIES.find((c) => c === selected) || selected : "Select a category…"}
        </span>
        <ChevronDown size={18} strokeWidth={2.5} className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-on-primary-container" : ""}`} />
      </button>

      {open && (
        <div className="sg-dropdown-list absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto rounded-2xl border border-outline-variant/60 bg-surface shadow-[0_8px_32px_rgba(0,40,142,0.12)]">
          <div className="p-1.5 space-y-0.5">
            {CATEGORIES.map((c) => {
              const isSel = c === selected;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-150 ${
                    isSel
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  {c}
                  {isSel && <Check size={16} strokeWidth={2.5} className="text-on-primary-container" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Build the full disclosure from a settled booking (used on page reload).
async function buildDisclosure(booking) {
  if (!booking?.providerId?._id) return { booking, providerDetails: null };
  const [provRes, welfRes] = await Promise.all([
    api.get(`/providers/${booking.providerId._id}`).catch(() => null),
    api.get(`/welfare/${booking.providerId._id}`).catch(() => null),
  ]);
  const p = provRes?.data;
  const pd = {
    _id: booking.providerId._id,
    name: booking.providerId.userId?.name || p?.userId?.name || "Provider",
    phone: booking.providerId.userId?.phone || p?.userId?.phone || "",
    cooperativeName: booking.cooperativeId?.name || p?.cooperativeId?.name || "",
    skills: p?.skills || [],
    verified: !!p?.verified,
    eShramId: welfRes?.data?.eShramId || null,
    insuranceOptIn: !!welfRes?.data?.insuranceOptIn,
    insuranceProvider: welfRes?.data?.insuranceProvider || "PMSBY (Pradhan Mantri Suraksha Bima Yojana)",
    rating: p?.trustScore ?? 0,
    jobsCompleted: (p?.reviews?.length || 0),
    reviews: (p?.reviews || []).slice(0, 3).map((r) => ({ rating: r.rating, comment: r.comment })),
  };
  return { booking, providerDetails: pd };
}

export default function Dispatch() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingIdRef = useRef(null);
  const cancelTimerRef = useRef(null);

  const [step, setStep] = useState(id ? "loading" : "form");
  const [booking, setBooking] = useState(null);
  const [providerDetails, setProviderDetails] = useState(null);
  const [pins, setPins] = useState([]);
  const [liveWorkers, setLiveWorkers] = useState(0);
  const [locAccuracy, setLocAccuracy] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");
  const [livePos, setLivePos] = useState(null);

  const [category, setCategory] = useState("");
  const [locationText, setLocationText] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [priceStr, setPriceStr] = useState("250");
  const offerPrice = Number(priceStr) > 0 ? Number(priceStr) : 250;
  const [isEmergency, setIsEmergency] = useState(false);
  const [coords, setCoords] = useState({ lat: 28.6139, lng: 77.2090 });

  const [dynamicWorkerCount, setDynamicWorkerCount] = useState(8);

  // Fetch real active verified worker count from MongoDB API
  useEffect(() => {
    api.get(`/providers${category ? `?category=${encodeURIComponent(category)}` : ""}`)
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.providers || []);
        const total = r.data?.total || list.length;
        if (total > 0) setDynamicWorkerCount(total);
      })
      .catch(() => {});
  }, [category]);

  // Read URL query search params for pre-filling category and emergency
  useEffect(() => {
    const qCat = searchParams.get("category");
    const qEmg = searchParams.get("emergency");
    if (qCat) {
      const match = CATEGORIES.find((c) => c.toLowerCase() === qCat.toLowerCase());
      if (match) setCategory(match);
      else setCategory(qCat);
    }
    if (qEmg === "true") {
      setIsEmergency(true);
    }
  }, [searchParams]);

  // High-accuracy GPS: watchPosition samples continuously and resolves the
  // best (lowest-accuracy) settled fix — stops early at ≤30 m, else after 6s.
  function requestAccurateLoc(onProgress) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS unavailable"));
        return;
      }
      let watchId = null;
      let best = null;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        if (best) resolve(best);
        else reject(new Error("GPS timeout"));
      };
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const fix = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
          };
          if (!best || fix.accuracy < best.accuracy) {
            best = fix;
            onProgress?.(fix);
          }
          if (fix.accuracy <= 30) finish();
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
      );
      setTimeout(finish, 6000);
    });
  }

  // Reverse-geocode coords → full street-level address (like Rapido / Google Maps)
  async function reverseGeocode(lat, lng) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const d = await r.json();
      const a = d.address || {};
      // Build full address: road/building → area → city → state
      const parts = [
        a.house_number ? `${a.house_number}, ${a.road || a.pedestrian || a.footway || ''}` : (a.road || a.pedestrian || a.footway || a.path || ''),
        a.neighbourhood || a.suburb || a.quarter || a.village || '',
        a.city || a.town || a.county || a.state_district || '',
        a.state || '',
      ].map(s => s.trim()).filter(Boolean);
      return parts.join(', ') || d.display_name?.split(',').slice(0, 4).join(',').trim() || '';
    } catch {
      return '';
    }
  }

  // Auto-fill location on mount — watchPosition keeps sampling and resolves the
  // most-accurate settled fix (≤30 m), so the default is pin-level, not city-level.
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    requestAccurateLoc((fix) => setLocAccuracy(fix.accuracy))
      .then(async ({ lat, lng, accuracy }) => {
        setCoords({ lat, lng });
        setLocAccuracy(accuracy);
        const text = await reverseGeocode(lat, lng);
        if (text) setLocationText(text);
      })
      .catch(() => {})
      .finally(() => setLocLoading(false));
  }, []);

  // Live "worker accepted" push → unlock disclosure card
  useEffect(() => {
    if (!socket.connected) socket.connect();
    function onAssigned(payload) {
      const pid = payload?.booking?._id?.toString?.();
      if (pid && bookingIdRef.current && pid === bookingIdRef.current.toString()) {
        setBooking(payload.booking);
        setProviderDetails(payload.providerDetails || null);
        setStep("assigned");
      }
    }
    function onLocation({ bookingId, lat, lng, at }) {
      const rid = bookingIdRef.current?.toString?.();
      if (rid && bookingId?.toString() === rid) setLivePos({ lat, lng, at: at || Date.now() });
    }
    socket.on("booking:assigned", onAssigned);
    socket.on("provider:location_update", onLocation);
    return () => {
      socket.off("booking:assigned", onAssigned);
      socket.off("provider:location_update", onLocation);
    };
  }, []);

  // Reload path: arriving with a broadcast booking id already assigned
  useEffect(() => {
    if (!id) return;
    api.get(`/bookings/${id}`).then(async (r) => {
      bookingIdRef.current = r.data._id;
      if (r.data.dispatchMode === "broadcast" && r.data.broadcastStatus === "assigned") {
        const built = await buildDisclosure(r.data);
        setBooking(built.booking);
        setProviderDetails(built.providerDetails);
        setStep("assigned");
      } else {
        setBooking(r.data);
        bookingIdRef.current = r.data._id;
        if (r.data.dispatchMode === "broadcast" && r.data.providerId == null) setStep("radar");
      }
    }).catch(() => setStep("form")).finally(() => setStep((s) => (s === "loading" ? "form" : s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function broadcast(e) {
    e.preventDefault();
    if (!category) { setError("Please choose a service category."); return; }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/bookings/broadcast", {
        category, locationText, price: offerPrice,
        lat: coords.lat, lng: coords.lng, isEmergency,
      });
      bookingIdRef.current = data.booking._id;
      setBooking(data.booking);
      setStep("radar");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not broadcast the job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Real radar pins + live available count. Server filters by radius, merges
  // the worker's fresh live GPS (or saved geo) and returns distanceKm — so the
  // blips are accurate AND update every poll as workers stream their location.
  async function loadPins() {
    const origin = booking?.coordinates?.lat != null ? booking.coordinates : coords;
    try {
      const { data } = await api.get("/providers", {
        params: {
          category: booking?.targetCategory || category,
          lat: origin.lat, lng: origin.lng,
          radius: RADIUS_KM, limit: 100,
          isVerified: true,
        },
      });
      const list = Array.isArray(data) ? data : (data.providers || []);
      // Server returns only verified + in-range workers for this category.
      setLiveWorkers(list.length);

      const pinList = list
        .filter((p) => p.hasLocation && p.geoLocation?.lat != null)
        .map((p) => ({
          distanceKm: p.distanceKm ?? haversineKm(origin, p.geoLocation),
          bearing: bearingDeg(origin, p.geoLocation),
        }))
        .filter((p) => p.distanceKm <= RADIUS_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      setPins(pinList);
    } catch {
      /* keep last known pins + count on network hiccup */
    }
  }

  // Live refresh + heartbeat while the radar is on screen. The heartbeat renews
// the broadcast (household is still watching) — leaving this page stops the
// pings so the job auto-expires from workers' feeds within ~5 min.
  useEffect(() => {
    if (step !== "radar" || !booking?._id) return;
    loadPins();
    const beat = () => api.post(`/bookings/${booking._id}/keepalive`).catch(() => {});
    beat();
    const pinsTimer = setInterval(loadPins, 6000);
    const beatTimer = setInterval(beat, 15000);
    return () => {
      clearInterval(pinsTimer);
      clearInterval(beatTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, booking?.targetCategory]);

  // Household withdraws a live broadcast → workers' feeds clear instantly (socket).
  async function cancelDispatch() {
    if (booking?._id) {
      try {
        await api.patch(`/bookings/${booking._id}/cancel`);
      } catch (err) {
        if (err?.response?.status === 409) {
          // A worker already accepted right as we cancelled — show the disclosure instead.
          api.get(`/bookings/${booking._id}`).then((r) => {
            bookingIdRef.current = r.data._id;
            if (r.data.broadcastStatus === "assigned") {
              buildDisclosure(r.data).then((built) => {
                setBooking(built.booking);
                setProviderDetails(built.providerDetails);
                setStep("assigned");
              });
            } else setStep("form");
          }).catch(() => setStep("form"));
          return;
        }
      }
    }
    setBooking(null);
    setPins([]);
    setStep("form");
  }

  /* ── Shipping / loading state (reload) ── */
  if (step === "loading") {
    return (
      <div className="w-full px-6 pt-8 pb-10">
        <div className="animate-pulse rounded-2xl border border-outline-variant/60 bg-surface p-8 max-w-2xl">
          <div className="mb-4 h-5 w-1/3 rounded bg-surface-container" />
          <div className="mb-3 h-4 w-2/3 rounded bg-surface-container" />
          <div className="h-64 rounded-xl bg-surface-container" />
        </div>
      </div>
    );
  }

  /* ── FORM ─────────────────────────────────────────────── */
  if (step === "form") {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold border border-primary/20">
              <Building2 size={13} />
              <span>Ministry of Cooperation</span>
              <span className="w-1 h-1 rounded-full bg-on-primary-container/40" />
              <span>Geospatial Radar Engine</span>
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-on-surface" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            Geospatial Gig Dispatch
          </h1>
          <p className="text-[14px] sm:text-[15px] text-on-surface-variant mt-1">
            Broadcast your request directly to nearby verified cooperative professionals. First ready worker to accept gets assigned.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Dispatch Form (col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* How it works */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { Icon: Radar, title: "1. Broadcast", sub: "₹0 upfront — instant alert" },
                { Icon: Zap, title: "2. First-Accept", sub: "Nearest ready worker wins" },
                { Icon: Lock, title: "3. Escrow Pay", sub: "Pay only after assignment" },
              ].map(({ Icon, title, sub }) => (
                <div key={title} className="flex items-center gap-3 rounded-2xl border border-outline-variant/60 bg-surface p-4 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl icon-box-blue flex items-center justify-center shrink-0">
                    <Icon size={18} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-on-surface">{title}</p>
                    <p className="text-[11px] text-on-surface-variant">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={broadcast} className="rounded-2xl border border-outline-variant/70 bg-surface p-6 sm:p-7 space-y-5 shadow-xs">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-on-surface-variant">Service Category</span>
                <CategoryDropdown value={category} onChange={setCategory} />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-on-surface-variant">Locality / Address</span>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder={locLoading ? "Detecting your location…" : "e.g. Indiranagar, Delhi"}
                    className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-28 text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    disabled={locLoading}
                    onClick={async () => {
                      if (!navigator.geolocation) return;
                      setLocLoading(true);
                      try {
                        const { lat, lng, accuracy } = await requestAccurateLoc((fix) => setLocAccuracy(fix.accuracy));
                        setCoords({ lat, lng });
                        setLocAccuracy(accuracy);
                        const text = await reverseGeocode(lat, lng);
                        if (text) setLocationText(text);
                      } catch {
                        // leave coords/text unchanged on GPS failure
                      } finally {
                        setLocLoading(false);
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-[11.5px] font-bold hover:opacity-80 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <MapPin size={12} />
                    {locLoading ? "Detecting…" : "Use GPS"}
                  </button>
                </div>
                <p className="mt-1.5 text-[11.5px] text-on-surface-variant font-medium">
                  Broadcasting within ~25 km radius · ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}){locAccuracy != null && ` · ±${locAccuracy}m GPS`}
                </p>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-on-surface-variant">Offered Rate (₹/hr)</span>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="number" min={50} value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>
                <p className="mt-1.5 text-[11.5px] text-on-surface-variant font-medium">
                  Your real offer — every in-range worker sees <strong className="text-on-surface">₹{offerPrice}/hr</strong>. The first to accept locks this exact rate in escrow.
                </p>
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-error-container/40 border border-error/20 px-4 py-3 cursor-pointer">
                <input type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} className="h-5 w-5 accent-[var(--color-error)]" />
                <Zap size={16} className="text-error" />
                <span className="text-[13px] font-bold text-on-error-container">Emergency Dispatch — Push priority alert to every ready worker</span>
              </label>

              {error && (
                <div className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-[13px] font-semibold text-on-error-container">{error}</div>
              )}

              <button type="submit" disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-on-primary-container font-heading font-bold text-[14.5px] hover:bg-primary hover:text-on-primary active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer shadow-md">
                <Radar size={18} />
                {submitting ? "Broadcasting Request…" : `Broadcast Job Request · ₹${offerPrice}/hr`}
              </button>
            </form>
          </div>

          {/* Right Column: Live Network Preview & Security Shield (col-span-5) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            {/* Live Geospatial Network Radar Card */}
            <div className="rounded-2xl border border-primary/20 bg-surface-container-low p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Radar size={16} /> Live Geospatial Coverage
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-container text-on-primary-container">
                  Active Coverage
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 flex items-center gap-4 shadow-2xs">
                <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 font-bold text-[18px]">
                  {dynamicWorkerCount}+
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-on-surface">Cooperative {category || "Worker"}s Ready</h4>
                  <p className="text-[12px] text-on-surface-variant">Verified in {locationText || "your local area"}</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {[
                  { title: "e-Shram Govt. Verified", desc: "100% UAN & PMSBY insurance check" },
                  { title: "Razorpay Escrow Safety", desc: "Zero advance payment until job assigned" },
                  { title: "Institutional Oversight", desc: "Supervised by Primary Agricultural Credit Societies" },
                ].map((item, idx) => (
                   <div key={idx} className="flex items-start gap-2.5 text-[12.5px] text-on-surface-variant">
                    <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-on-surface font-semibold">{item.title}:</strong> {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── RADAR (scanning) ─────────────────────────────────── */
  if (step === "radar") {
    const origin = booking?.coordinates?.lat != null ? booking.coordinates : coords;
    const RING_LABELS = [25, 18.75, 12.5, 6.25];
    const COMPASS = [
      { label: "N", at: "top-1 left-1/2 -translate-x-1/2" },
      { label: "E", at: "top-1/2 right-1 -translate-y-1/2" },
      { label: "S", at: "bottom-1 left-1/2 -translate-x-1/2" },
      { label: "W", at: "top-1/2 left-1 -translate-y-1/2" },
    ];
    return (
      <div className="w-full px-6 pt-10 pb-10 flex flex-col items-center text-center">
        <div className="mb-2">
          <AIBadge text="AI Live Scan & Broadcast Engine" />
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-on-surface mb-2" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
          Searching nearby certified{" "}{(booking?.targetCategory || "workers")}…
        </h1>
        <p className="text-[13px] text-on-surface-variant mb-8">{booking?.locationText}</p>

        {/* ── PREMIUM LIVE RADAR ── */}
        <div
          className="sg-radar-wrap relative h-80 w-80 md:h-96 md:w-96 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(16, 60, 78, 0.55), rgba(6, 18, 33, 0.92) 72%)",
            boxShadow:
              "inset 0 0 70px rgba(34,211,238,0.14), inset 0 0 18px rgba(34,211,238,0.08), 0 18px 50px rgba(1, 22, 34, 0.45)",
          }}
        >
          {/* outer glow frame */}
          <div className="pointer-events-none absolute -inset-2 rounded-full border border-cyan-300/15" />
          {/* tick gear */}
          {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t) => (
            <div key={t} className="absolute inset-0" style={{ transform: `rotate(${t * 360}deg)` }}>
              <span className="absolute left-1/2 top-[3px] -translate-x-1/2 h-1.5 w-px bg-cyan-200/40 rounded" />
            </div>
          ))}
          {/* compass */}
          {COMPASS.map((c) => (
            <span key={c.label} className={`absolute z-10 ${c.at} text-[10px] font-extrabold tracking-widest text-cyan-100/60`}>
              {c.label}
            </span>
          ))}

          {/* distance rings + range labels */}
          {[0.25, 0.5, 0.75, 1].map((s, idx) => (
            <div
              key={s}
              className="absolute rounded-full border border-cyan-200/15"
              style={{ top: `${(1 - s) * 50}%`, left: `${(1 - s) * 50}%`, width: `${s * 100}%`, height: `${s * 100}%` }}
            >
              <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[8.5px] font-bold tracking-wider text-cyan-100/35">
                {RING_LABELS[idx]}
              </span>
            </div>
          ))}
          {/* crosshairs */}
          <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px bg-cyan-200/10" />
          <div className="pointer-events-none absolute top-1/2 left-0 right-0 h-px bg-cyan-200/10" />

          {/* sweep trail — BELOW the blips so a point is never covered */}
          <div className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
            <div
              className="sg-radar-sweep absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(34,211,238,0.55), rgba(34,211,238,0.18) 45deg, rgba(34,211,238,0) 95deg)",
              }}
            />
          </div>

          {/* blips — real workers, true distance + bearing, always on top */}
          {pins.map((pin, i) => {
            const frac = Math.max(0.04, Math.min(pin.distanceKm / RADIUS_KM, 1));
            const ang = (pin.bearing * Math.PI) / 180;
            const left = 50 + 45 * frac * Math.sin(ang);
            const top = 50 - 45 * frac * Math.cos(ang);
            const label = pin.distanceKm < 1
              ? `${Math.round(pin.distanceKm * 1000)} m`
              : `${pin.distanceKm.toFixed(1)} km`;
            return (
              <div key={`${i}-${label}`} className="absolute z-30" style={{ top: `${top}%`, left: `${left}%`, transform: "translate(-50%, -50%)" }}>
                <div className="relative h-6 w-6 flex items-center justify-center">
                  <span className="sg-radar-ping absolute inline-flex h-full w-full rounded-full bg-lime-400/50" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-gradient-to-br from-lime-300 to-emerald-500 ring-2 ring-slate-900/50 shadow-[0_0_14px_rgba(163,230,53,0.75)]" />
                </div>
                <div className="mt-1 -translate-x-1/2 w-fit px-1.5 py-0.5 rounded-md bg-slate-950/60 backdrop-blur text-lime-100 text-[10px] font-bold whitespace-nowrap ring-1 ring-white/15 shadow-lg">
                  {label}
                </div>
              </div>
            );
          })}

          {/* YOU marker */}
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="absolute h-20 w-20 rounded-full bg-cyan-400/15 animate-ping" />
            <div className="relative h-14 w-14 rounded-full bg-slate-950/70 backdrop-blur flex items-center justify-center ring-1 ring-cyan-300/50 shadow-[0_0_24px_rgba(34,211,238,0.4)]">
              <AIIcon size={22} glow />
            </div>
            <span className="absolute top-[calc(50%+38px)] text-[9px] font-extrabold uppercase tracking-[0.25em] text-cyan-100/70">
              You
            </span>
          </div>
        </div>

        {/* radar HUD */}
        <div className="mt-4 inline-flex items-stretch divide-x divide-white/10 rounded-2xl bg-slate-900/85 text-cyan-100/80 ring-1 ring-cyan-300/20 shadow-lg overflow-hidden">
          <span className="flex flex-col items-center px-4 py-2">
            <em className="not-italic text-[8.5px] uppercase tracking-widest opacity-50">Job GPS</em>
            <strong className="text-[11px] font-bold text-cyan-50">{origin.lat.toFixed(4)}°, {origin.lng.toFixed(4)}°</strong>
          </span>
          <span className="flex flex-col items-center px-4 py-2">
            <em className="not-italic text-[8.5px] uppercase tracking-widest opacity-50">GPS Acc</em>
            <strong className="text-[11px] font-bold text-cyan-50">±{locAccuracy != null ? `${locAccuracy} m` : "–"}</strong>
          </span>
          <span className="flex flex-col items-center px-4 py-2">
            <em className="not-italic text-[8.5px] uppercase tracking-widest opacity-50">Range</em>
            <strong className="text-[11px] font-bold text-cyan-50">{RADIUS_KM} km</strong>
          </span>
        </div>

        <p className="mt-3 flex items-center gap-4 text-[11px] text-on-surface-variant font-medium">
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.7)]" /> Live verified worker (live GPS)</span>
          <span className="flex items-center gap-1.5"><span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-cyan-400 ring-1 ring-white/30" /> Your location</span>
        </p>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/85 text-cyan-50 px-5 py-2 text-[13px] font-extrabold ring-1 ring-cyan-300/25 shadow-lg">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
            </span>
            <span className="text-cyan-300">{liveWorkers}</span>
            <span className="normal-case font-semibold text-cyan-100/80">gig worker{liveWorkers === 1 ? "" : "s"} broadcasting to</span>
          </div>
          {pins.length > 0 && pins.length < liveWorkers && (
            <p className="text-[12px] text-on-surface-variant">
              {liveWorkers - pins.length} more worker{liveWorkers - pins.length === 1 ? "" : "s"} nearby (GPS off — they appear live the moment they stream location)
            </p>
          )}
          {pins.length === 0 && liveWorkers > 0 && (
            <p className="text-[12px] text-on-surface-variant">
              {liveWorkers} worker{liveWorkers === 1 ? " is" : "s are"} in range — watching their live GPS, keep waiting…
            </p>
          )}
          {pins.length === 0 && liveWorkers === 0 && (
            <p className="text-[12px] text-on-surface-variant">
              No workers with matching skills nearby yet — radar updates live…
            </p>
          )}
          <p className="text-[12px] text-on-surface-variant">
            Offer <strong className="text-on-surface">₹{booking?.price || offerPrice}/hr</strong> · no payment charged yet — escrow locks only after a worker accepts
          </p>
          <p className="text-[12px] text-on-surface-variant">Waiting for the first worker to accept…</p>
          <p className="text-[11px] text-on-surface-variant/80">
            This offer auto-cancels ~5 min after you leave this page. Cancel now to stop it instantly.
          </p>
          <div className="mt-2 flex flex-col items-center gap-1.5">
            <button
              onClick={() => {
                if (confirmCancel) {
                  cancelDispatch();
                } else {
                  setConfirmCancel(true);
                  clearTimeout(cancelTimerRef.current);
                  cancelTimerRef.current = setTimeout(() => setConfirmCancel(false), 5000);
                }
              }}
              className={`text-[13px] font-bold hover:underline transition-colors ${confirmCancel ? "text-error" : "text-primary"}`}
            >
              {confirmCancel ? "⚠ Tap again to confirm cancel" : "← Cancel dispatch & stop search"}
            </button>
            {confirmCancel && (
              <p className="text-[12px] text-on-surface-variant">Workers are notified instantly — this cannot be undone.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── DISCLOSURE (assigned) ────────────────────────────── */
  const pd = providerDetails;
  return (
    <div className="w-full max-w-3xl mx-auto px-6 pt-8 pb-10 space-y-6">
      <div>
        <p className="text-[14px] font-semibold text-secondary mb-1">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} /> Worker Accepted — Provider Unlocked</span>
        </p>
        <h1 className="text-[24px] font-bold tracking-tight text-on-surface" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
          Your provider is on the way
        </h1>
      </div>

      {/* Provider identity card */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl icon-box-blue flex items-center justify-center text-[26px] font-bold shrink-0">
            {(pd?.name || "?").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[18px] font-bold text-on-surface truncate">{pd?.name}</p>
              {pd?.verified && <VerifiedBadge />}
            </div>
            <p className="text-[13px] text-on-surface-variant mt-0.5 flex items-center gap-1.5">
              <Handshake size={14} /> {pd?.cooperativeName || "Labour Cooperative Member"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="flex items-center gap-1 text-[16px] font-bold text-tertiary-container dark:text-tertiary">
              <Star size={16} className="fill-current" /> {(pd?.rating || 0).toFixed(1)}
            </p>
            <p className="text-[11px] text-on-surface-variant">{pd?.jobsCompleted || 0} jobs completed</p>
          </div>
        </div>

        {/* Disclosure grid */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5">
            <Phone size={17} className="text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant">Contact</p>
              {pd?.phone ? (
                <a href={`tel:${pd.phone}`} className="text-[14px] font-bold text-primary hover:underline">{pd.phone}</a>
              ) : (
                <p className="text-[13px] font-semibold text-on-surface">Available via chat</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5">
            <IdCard size={17} className="text-secondary" />
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant">e-Shram & UAN</p>
              <p className="text-[13px] font-bold text-on-surface truncate">{pd?.eShramId || "Verified Worker"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5">
            <ShieldCheck size={17} className="text-secondary" />
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant">Insurance & Social Security</p>
              <p className="text-[13px] font-bold text-on-surface truncate">{pd?.insuranceProvider || "PMSBY Active"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5">
            <Users size={17} className="text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant">Skills</p>
              <p className="text-[13px] font-bold text-on-surface truncate">{(pd?.skills || []).slice(0, 4).join(" · ")}</p>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {(pd?.reviews || []).length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-on-surface">Recent feedback</p>
            {pd.reviews.map((r, i) => (
              <div key={i} className="rounded-xl bg-surface-container-low border border-outline-variant/30 p-3">
                <p className="text-[12px] font-bold text-tertiary-container dark:text-tertiary">{"★".repeat(r.rating)}</p>
                <p className="text-[13px] text-on-surface">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live provider location */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-bold text-on-surface flex items-center gap-2">
            <MapPin size={16} className="text-primary" /> Live provider location
          </p>
          {livePos ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-error/10 px-2.5 py-1 text-[11px] font-bold text-error">
              <span className="h-2 w-2 animate-pulse rounded-full bg-error" /> LIVE
            </span>
          ) : (
            <span className="text-[11px] text-on-surface-variant">waiting for GPS…</span>
          )}
        </div>
        {livePos ? (
          <div className="flex flex-col gap-2">
            <iframe
              title="Provider live location"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${livePos.lng - 0.005}%2C${livePos.lat - 0.005}%2C${livePos.lng + 0.005}%2C${livePos.lat + 0.005}&layer=mapnik&marker=${livePos.lat}%2C${livePos.lng}`}
              className="h-48 w-full rounded-xl border border-outline-variant"
              loading="lazy"
            />
            <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
              <span>{livePos.lat.toFixed(5)}, {livePos.lng.toFixed(5)}</span>
              <a href={`https://www.google.com/maps?q=${livePos.lat},${livePos.lng}`} target="_blank" rel="noreferrer" className="font-heading font-semibold text-primary hover:underline">
                Open in Maps
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl bg-surface-container-low border border-dashed border-outline-variant py-8 text-[12px] text-on-surface-variant">
            Location updates appear here as the provider moves.
          </div>
        )}
      </div>

      {/* Secured escrow payment */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#e8edff] text-[#00288e] flex items-center justify-center">
            <Lock size={18} />
          </div>
          <div>
            <p className="text-[14px] font-bold text-on-surface">Amount due — Escrow Payment</p>
            <p className="text-[12px] text-on-surface-variant">Funds locked securely until job completion</p>
          </div>
        </div>
        <button onClick={() => navigate(`/household/pay/${booking?._id}`)}
          className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 font-heading font-semibold text-on-primary hover:shadow-[0_4px_12px_rgba(0,40,142,0.2)] transition-all">
          <IndianRupee size={17} /> Pay ₹{booking?.price ?? 250} via Razorpay <ArrowRight size={17} />
        </button>
      </div>

      <button onClick={() => navigate(`/household/booking/${booking?._id}`)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-5 text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:text-[#00288e] transition-all">
        <BadgeCheck size={16} /> Track live status & chat
      </button>
    </div>
  );
}
