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
            ? "border-primary bg-[#e8edff] text-[#00288e]"
            : selected
            ? "border-primary/40 bg-surface-container-lowest text-on-surface hover:border-primary/60"
            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-low"
        }`}
      >
        <span className={selected ? "" : "font-normal"}>
          {selected ? CATEGORIES.find((c) => c === selected) || selected : "Select a category…"}
        </span>
        <ChevronDown size={18} strokeWidth={2.5} className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-[#00288e]" : ""}`} />
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
                      ? "bg-[#e8edff] text-[#00288e]"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  {c}
                  {isSel && <Check size={16} strokeWidth={2.5} className="text-[#00288e]" />}
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

  const [step, setStep] = useState(id ? "loading" : "form");
  const [booking, setBooking] = useState(null);
  const [providerDetails, setProviderDetails] = useState(null);
  const [nearby, setNearby] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("");
  const [locationText, setLocationText] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [price, setPrice] = useState(250);
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

  // Auto-fill location on mount — like Rapido
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        const text = await reverseGeocode(lat, lng);
        if (text) setLocationText(text);
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Live "worker accepted" push → unlock disclosure card
  useEffect(() => {
    socket.connect();
    function onAssigned(payload) {
      const pid = payload?.booking?._id?.toString?.();
      if (pid && bookingIdRef.current && pid === bookingIdRef.current.toString()) {
        setBooking(payload.booking);
        setProviderDetails(payload.providerDetails || null);
        setStep("assigned");
      }
    }
    socket.on("booking:assigned", onAssigned);
    return () => { socket.off("booking:assigned", onAssigned); };
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
        category, locationText, price,
        lat: coords.lat, lng: coords.lng, isEmergency,
      });
      bookingIdRef.current = data.booking._id;
      setBooking(data.booking);
      setNearby(data.nearbyProviders || 0);
      setStep("radar");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not broadcast the job. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8edff] text-[#00288e] text-xs font-bold border border-[#00288e]/20">
              <Building2 size={13} />
              <span>Ministry of Cooperation</span>
              <span className="w-1 h-1 rounded-full bg-[#00288e]/40" />
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
                  <div className="w-10 h-10 rounded-xl bg-[#e8edff] text-[#00288e] flex items-center justify-center shrink-0">
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
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const { latitude: lat, longitude: lng } = pos.coords;
                          setCoords({ lat, lng });
                          const text = await reverseGeocode(lat, lng);
                          if (text) setLocationText(text);
                          setLocLoading(false);
                        },
                        () => setLocLoading(false),
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                      );
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#e8edff] text-[#00288e] text-[11.5px] font-bold hover:bg-[#d7e3ff] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <MapPin size={12} />
                    {locLoading ? "Detecting…" : "Use GPS"}
                  </button>
                </div>
                <p className="mt-1.5 text-[11.5px] text-on-surface-variant font-medium">
                  Broadcasting within ~25 km radius · ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                </p>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-on-surface-variant">Offered Rate (₹/hr)</span>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="number" min={50} value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>
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
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00288e] text-white font-heading font-bold text-[14.5px] hover:bg-[#173bab] active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer shadow-md">
                <Radar size={18} />
                {submitting ? "Broadcasting Request…" : "Broadcast Job Request (₹0 Upfront)"}
              </button>
            </form>
          </div>

          {/* Right Column: Live Network Preview & Security Shield (col-span-5) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            {/* Live Geospatial Network Radar Card */}
            <div className="rounded-2xl border border-[#00288e]/20 bg-gradient-to-br from-[#e8edff] via-white to-[#f0f4ff] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#00288e] flex items-center gap-2">
                  <Radar size={16} className="text-[#00288e]" /> Live Geospatial Coverage
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00288e] text-white">
                  Active Coverage
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#c4c5d5]/50 flex items-center gap-4 shadow-2xs">
                <div className="w-12 h-12 rounded-xl bg-[#00288e] text-white flex items-center justify-center shrink-0 font-bold text-[18px]">
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
                  <div key={idx} className="flex items-start gap-2.5 text-[12.5px] text-[#444653]">
                    <ShieldCheck size={16} className="text-[#00288e] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-on-surface font-semibold">{item.title}:</strong> {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Category Selection Grid */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 space-y-3 shadow-2xs">
              <h4 className="text-[13px] font-extrabold text-on-surface uppercase tracking-wider">
                Popular Categories
              </h4>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-[12px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      category === cat
                        ? "bg-[#00288e] text-white border-[#00288e]"
                        : "bg-surface-container-lowest text-[#00288e] border-outline-variant hover:border-[#00288e]/40 hover:bg-[#e8edff]"
                    }`}
                  >
                    {cat}
                  </button>
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
    return (
      <div className="w-full px-6 pt-10 pb-10 flex flex-col items-center text-center">
        <div className="mb-2">
          <AIBadge text="AI Live Scan & Broadcast Engine" />
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-on-surface mb-2" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
          Searching nearby certified{" "}{(booking?.targetCategory || "workers")}…
        </h1>
        <p className="text-[13px] text-on-surface-variant mb-8">{booking?.locationText}</p>

        {/* Radar animation */}
        <div className="relative w-64 h-64 md:w-72 md:h-72">
          {[0.25, 0.5, 0.75, 1].map((s) => (
            <div key={s} className="absolute rounded-full border border-[#00288e]/20"
              style={{ top: `${(1 - s) * 50}%`, left: `${(1 - s) * 50}%`, width: `${s * 100}%`, height: `${s * 100}%` }} />
          ))}
          {/* sweep */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="sg-radar-sweep absolute inset-0 rounded-full"
              style={{ background: "conic-gradient(from 0deg, rgba(0,40,142,0.45), rgba(0,40,142,0) 70deg)" }} />
          </div>
          {/* blips */}
          {[{ top: "22%", left: "34%" }, { top: "66%", left: "58%" }, { top: "44%", left: "70%" }].map((blip, i) => (
            <div key={i} className="absolute" style={blip}>
              <div className="sg-radar-ping w-4 h-4 rounded-full bg-[#006d30]" />
              <div className="absolute inset-0 w-4 h-4 rounded-full bg-[#006d30]" />
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white text-[#00288e] flex items-center justify-center shadow-[0_4px_20px_rgba(0,40,142,0.3)] border border-primary/20">
              <AIIcon size={28} glow />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e8edff] text-[#00288e] px-4 py-2 text-[13px] font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00288e] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00288e]" />
            </span>
            Broadcasting to {nearby} nearby verified workers
          </div>
          <p className="text-[12px] text-on-surface-variant">No payment charged yet — Amount due ₹0</p>
          <p className="text-[12px] text-on-surface-variant">Waiting for the first worker to accept…</p>
          <button onClick={() => { setStep("form"); setBooking(null); }} className="mt-2 text-[13px] font-semibold text-primary hover:underline">
            ← New dispatch
          </button>
        </div>
      </div>
    );
  }

  /* ── DISCLOSURE (assigned) ────────────────────────────── */
  const pd = providerDetails;
  return (
    <div className="w-full px-6 pt-8 pb-10 max-w-3xl space-y-6">
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
          <div className="w-16 h-16 rounded-2xl bg-[#e8edff] text-[#00288e] flex items-center justify-center text-[26px] font-bold shrink-0">
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
            <p className="flex items-center gap-1 text-[16px] font-bold text-[#6b4200]">
              <Star size={16} className="fill-[#6b4200] text-[#6b4200]" /> {(pd?.rating || 0).toFixed(1)}
            </p>
            <p className="text-[11px] text-on-surface-variant">{pd?.jobsCompleted || 0} jobs completed</p>
          </div>
        </div>

        {/* Disclosure grid */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5">
            <Phone size={17} className="text-[#00288e]" />
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant">Contact</p>
              {pd?.phone ? (
                <a href={`tel:${pd.phone}`} className="text-[14px] font-bold text-[#00288e] hover:underline">{pd.phone}</a>
              ) : (
                <p className="text-[13px] font-semibold text-on-surface">Available via chat</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5">
            <IdCard size={17} className="text-[#006d30]" />
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant">e-Shram & UAN</p>
              <p className="text-[13px] font-bold text-on-surface truncate">{pd?.eShramId || "Verified Worker"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5">
            <ShieldCheck size={17} className="text-[#006d30]" />
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant">Insurance & Social Security</p>
              <p className="text-[13px] font-bold text-on-surface truncate">{pd?.insuranceProvider || "PMSBY Active"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5">
            <Users size={17} className="text-[#00288e]" />
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
                <p className="text-[12px] font-bold text-[#6b4200]">{"★".repeat(r.rating)}</p>
                <p className="text-[13px] text-on-surface">{r.comment}</p>
              </div>
            ))}
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
