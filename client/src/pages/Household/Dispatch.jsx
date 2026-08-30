import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import socket from "../../lib/socket";
import VerifiedBadge from "../../components/VerifiedBadge";
import { AIIcon, AIBadge } from "../../components/AIIcon";
import {
  Radar, MapPin, Phone, Star, ShieldCheck, BadgeCheck, Lock,
  IndianRupee, ArrowRight, Zap, Handshake, CheckCircle2, Users, IdCard,
  ChevronDown, ChevronRight, Check, Building2, Search, Plus, X,
  Tag, Layers
} from "lucide-react";
import {
  IconTool, IconBolt, IconHammer, IconPaint, IconSpray, IconChefHat,
  IconHeartbeat, IconCar, IconPlant2, IconSchool, IconFridge, IconBug,
  IconWall, IconScissors, IconApps
} from "@tabler/icons-react";

export const SERVICE_CATEGORIES = [
  {
    id: "Plumber",
    name: "Plumber",
    Icon: IconTool,
    badgeBg: "bg-blue-500/10 text-blue-600 border-blue-200",
    desc: "Taps, pipe leakage, water tanks, motor repair, drainage",
    subServices: ["Tap Leakage Fix", "Pipe Blockage Clearing", "Water Tank Cleaning", "Flush & Basin Repair", "Water Motor Fitting"],
  },
  {
    id: "Electrician",
    name: "Electrician",
    Icon: IconBolt,
    badgeBg: "bg-amber-500/10 text-amber-600 border-amber-200",
    desc: "Wiring, switchboard, MCB, ceiling fans, inverter, lights",
    subServices: ["Fan Repair / Install", "Switchboard / MCB", "Short Circuit Repair", "Inverter Wiring", "Light / Chandelier Fitting"],
  },
  {
    id: "Carpenter",
    name: "Carpenter",
    Icon: IconHammer,
    badgeBg: "bg-orange-500/10 text-orange-600 border-orange-200",
    desc: "Furniture repair, door locks, hinges, modular fittings",
    subServices: ["Door Lock / Handle Fix", "Furniture Assembly", "Hinges / Channel Repair", "Wooden Partition", "Cabinet & Drawer Repair"],
  },
  {
    id: "Painter",
    name: "Painter",
    Icon: IconPaint,
    badgeBg: "bg-rose-500/10 text-rose-600 border-rose-200",
    desc: "Full wall painting, waterproofing, putty, touchup & polish",
    subServices: ["Room Wall Painting", "Waterproofing & Seepage", "Door / Wood Polish", "Putty & Crack Fill", "Exterior Wall Coating"],
  },
  {
    id: "Cleaner",
    name: "Cleaner",
    Icon: IconSpray,
    badgeBg: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
    desc: "Deep house cleaning, sofa shampoo, kitchen & bathroom sanitize",
    subServices: ["Full Home Deep Clean", "Bathroom Sanitization", "Kitchen Chimney Clean", "Sofa & Carpet Shampoo", "Floor & Balcony Scrub"],
  },
  {
    id: "Cook",
    name: "Cook / Chef",
    Icon: IconChefHat,
    badgeBg: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    desc: "Daily meal cooking, party catering, North/South Indian dishes",
    subServices: ["Daily Home Meals", "Party / Event Cooking", "Diet & Healthy Food", "Breakfast / Tiffin Prep", "Regional Specialities"],
  },
  {
    id: "Caregiver",
    name: "Caregiver",
    Icon: IconHeartbeat,
    badgeBg: "bg-red-500/10 text-red-600 border-red-200",
    desc: "Elderly care, patient bedside assistance, baby sitting",
    subServices: ["Elderly Daily Care", "Post-Hospital Bedside Care", "Baby Sitting & Child Care", "Physio Assistance", "Medication Monitoring"],
  },
  {
    id: "Driver",
    name: "Driver",
    Icon: IconCar,
    badgeBg: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    desc: "Personal chauffeur, local city drives, outstation road trips",
    subServices: ["Hourly City Driving", "Outstation Road Trip", "Airport Pickup / Drop", "Office Daily Commute", "Commercial Vehicle Drive"],
  },
  {
    id: "Gardener",
    name: "Gardener",
    Icon: IconPlant2,
    badgeBg: "bg-green-500/10 text-green-600 border-green-200",
    desc: "Lawn mowing, plant pruning, potting, landscaping, fertilizing",
    subServices: ["Lawn Trimming / Mowing", "Pot Repotting & Soil", "Plant Pruning & Trimming", "Insecticide & Fertilizing", "Balcony Garden Setup"],
  },
  {
    id: "Tutor",
    name: "Tutor",
    Icon: IconSchool,
    badgeBg: "bg-purple-500/10 text-purple-600 border-purple-200",
    desc: "School subjects, maths, science, home tuition & languages",
    subServices: ["Maths & Science (CBSE/ICSE)", "English & Hindi Tuition", "Primary School Tutoring", "Exam Prep & Revisions", "Language Lessons"],
  },
  {
    id: "Appliance Repair",
    name: "Appliance Repair",
    Icon: IconFridge,
    badgeBg: "bg-teal-500/10 text-teal-600 border-teal-200",
    desc: "AC service, washing machine, refrigerator, microwave repair",
    subServices: ["AC Service & Gas Refill", "Washing Machine Fix", "Refrigerator Cooling Fix", "Microwave / Oven Repair", "RO Water Purifier Service"],
  },
  {
    id: "Pest Control",
    name: "Pest Control",
    Icon: IconBug,
    badgeBg: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    desc: "Termite treatment, cockroach, rodent, mosquito protection",
    subServices: ["Cockroach Gel Treatment", "Termite Anti-Borer Drill", "Bed Bug Elimination", "Mosquito Fogging", "Rodent Trapping"],
  },
  {
    id: "Mason",
    name: "Mason / Civil Work",
    Icon: IconWall,
    badgeBg: "bg-stone-500/10 text-stone-600 border-stone-200",
    desc: "Brickwork, tile fixing, plastering, minor civil construction",
    subServices: ["Floor Tile Replacement", "Wall Plastering / Repair", "Granite / Marble Fitting", "Minor Brick Construction", "Grouting & Sealing"],
  },
  {
    id: "Tailor",
    name: "Tailor / Laundry",
    Icon: IconScissors,
    badgeBg: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200",
    desc: "Stitching, clothes alteration, curtains, custom fitting",
    subServices: ["Dress / Shirt Alteration", "Curtain Stitching", "Zip & Button Replacement", "Custom Suit / Kurta Fit", "Ironing & Dry Clean Pickup"],
  },
];

const CATEGORIES = SERVICE_CATEGORIES.map((c) => c.id);

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

// Searchable Category Dropdown with Recognizable Logos & Icons
function CategoryDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchInputRef = useRef(null);
  const selected = value || "";

  const selectedCategoryObj = SERVICE_CATEGORIES.find(
    (c) => c.id.toLowerCase() === selected.toLowerCase() || c.name.toLowerCase() === selected.toLowerCase()
  );

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const [placement, setPlacement] = useState("down");
  const [listMaxH, setListMaxH] = useState(288);

  function handleToggle() {
    setOpen((prev) => {
      if (!prev) {
        const el = ref.current;
        if (el) {
          const r = el.getBoundingClientRect();
          const spaceBelow = window.innerHeight - r.bottom;
          const spaceAbove = r.top;
          const dir = spaceBelow >= 280 ? "down" : spaceAbove > spaceBelow ? "up" : "down";
          setPlacement(dir);
          const avail = dir === "up" ? spaceAbove : spaceBelow;
          setListMaxH(Math.max(168, Math.round(avail - 124)));
        }
      }
      return !prev;
    });
  }

  const filtered = SERVICE_CATEGORIES.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.desc.toLowerCase().includes(q) ||
      c.subServices.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`group h-14 sm:h-13 w-full inline-flex items-center justify-between gap-3 pl-3.5 pr-2.5 rounded-2xl border text-[14px] font-semibold transition-all duration-300 shadow-[0_1px_2px_rgba(4,9,29,0.05)] ${
          open
            ? "border-primary/70 bg-primary-container/40 text-on-primary-container ring-4 ring-primary/10"
            : selected
            ? "border-primary/50 bg-surface-container-lowest text-on-surface hover:border-primary/70 hover:shadow-[0_6px_20px_-6px_rgba(0,40,142,0.25)]"
            : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/50 hover:bg-surface-container-lowest hover:shadow-[0_6px_20px_-8px_rgba(0,40,142,0.30)]"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selectedCategoryObj ? (
            <>
              <selectedCategoryObj.Icon
                size={24}
                stroke={1.5}
                className="text-primary shrink-0 group-hover:scale-110 transition-transform duration-300"
              />
              <div className="min-w-0">
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-on-surface-variant/80 font-bold leading-none">
                  Selected service
                </p>
                <p className="font-bold text-on-surface truncate text-[15px] sm:text-[14.5px] mt-1">
                  {selectedCategoryObj.name}
                </p>
              </div>
            </>
          ) : (
            <>
              <IconApps
                size={24}
                stroke={1.5}
                className="text-primary shrink-0 group-hover:scale-110 transition-transform duration-300"
              />
              <div className="min-w-0">
                <p className="text-[15px] sm:text-[14.5px] font-bold text-on-surface truncate leading-tight">
                  Select a service category
                </p>
                <p className="hidden sm:block text-[11.5px] text-on-surface-variant truncate mt-0.5 font-medium">
                  Plumber &middot; Electrician &middot; Cook &middot; 11 more
                </p>
              </div>
            </>
          )}
        </div>
        <div
          className={`w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center transition-all duration-300 ${
            open
              ? "bg-primary text-on-primary rotate-180 shadow-[0_2px_8px_-2px_rgba(0,40,142,0.5)]"
              : "bg-surface-container-low text-on-surface-variant group-hover:bg-primary-container group-hover:text-primary"
          }`}
        >
          <ChevronDown size={17} strokeWidth={2.5} />
        </div>
      </button>

      {open && (
        <div
          className={`sg-dropdown-list absolute left-0 right-0 z-50 rounded-2xl border border-outline-variant/80 bg-surface shadow-[0_28px_70px_-16px_rgba(2,6,23,0.35)] overflow-hidden ${
            placement === "up" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
          } animate-dropdown-in`}
        >
          {/* Built-in Search Bar */}
          <div className="p-2.5 border-b border-outline-variant/60 bg-surface-container-low/70">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search service (e.g. plumber, wire, lock, paint)..."
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-surface-container-lowest border border-outline-variant text-[13px] text-on-surface placeholder:text-on-surface-variant/80 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-medium transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-container-high transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Categories List with Recognizable Logos */}
          <div className="p-1.5 overflow-y-auto overscroll-contain space-y-1" style={{ maxHeight: listMaxH }}>
            {filtered.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <Search size={22} strokeWidth={1.5} className="mx-auto text-on-surface-variant/40" />
                <p className="text-[13px] font-semibold text-on-surface">No services found</p>
                <p className="text-[11.5px] text-on-surface-variant">&ldquo;{search}&rdquo; didn&apos;t match anything</p>
              </div>
            ) : (
              filtered.map((c) => {
                const isSel = selectedCategoryObj?.id === c.id;
                const IconComp = c.Icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`group/row w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isSel
                        ? "bg-primary-container/70 text-on-primary-container shadow-2xs"
                        : "hover:bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <IconComp
                      size={21}
                      stroke={1.4}
                      className="text-primary shrink-0 transition-transform duration-150 group-hover/row:scale-110"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-bold truncate leading-tight">
                        {c.name}
                      </div>
                      <div className="text-[11.5px] text-on-surface-variant/80 truncate leading-snug mt-0.5 font-normal">
                        {c.desc}
                      </div>
                    </div>
                    {isSel ? (
                      <span className="w-6 h-6 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,40,142,0.5)]">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    ) : (
                      <ChevronRight
                        size={15}
                        strokeWidth={2}
                        className="shrink-0 text-on-surface-variant/50 opacity-0 -translate-x-1 transition-all duration-150 group-hover/row:opacity-100 group-hover/row:translate-x-0"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3.5 py-2 border-t border-outline-variant/60 bg-surface-container-low/70 flex items-center justify-between text-[11px] font-semibold text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              {filtered.length} service{filtered.length === 1 ? "" : "s"}
            </span>
            <span className="font-medium text-on-surface-variant/70">Tap to select</span>
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
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [customTaskInput, setCustomTaskInput] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
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

    // Combine category with specific requested tasks / services
    const combinedService = selectedTasks.length > 0
      ? `${category} (${selectedTasks.join(", ")})`
      : category;

    try {
      const { data } = await api.post("/bookings/broadcast", {
        category,
        service: combinedService,
        locationText,
        price: offerPrice,
        lat: coords.lat,
        lng: coords.lng,
        isEmergency,
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8">
        <div className="hidden sm:flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold border border-primary/20">
            <Building2 size={13} />
            <span>Ministry of Cooperation</span>
            <span className="w-1 h-1 rounded-full bg-on-primary-container/40" />
            <span>Geospatial Radar Engine</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[26px] sm:text-[34px] font-bold tracking-tight text-on-surface leading-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
              Geospatial Gig Dispatch
            </h1>
            <p className="text-[13.5px] sm:text-[15px] text-on-surface-variant mt-1.5">
              First verified worker to accept gets the job.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-[12px] font-bold border border-secondary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
              </span>
              Live Network
            </span>
          </div>
        </div>

        {/* How it works 3-Step Banner — desktop only to keep phone view minimal */}
        <div className="hidden sm:grid grid-cols-3 gap-3.5">
          {[
            { Icon: Radar, title: "1. Broadcast", sub: "₹0 upfront — instant alert" },
            { Icon: Zap, title: "2. First-Accept", sub: "Nearest ready worker wins" },
            { Icon: Lock, title: "3. Escrow Pay", sub: "Pay only after assignment" },
          ].map(({ Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3.5 rounded-2xl border border-outline-variant/60 bg-surface p-4">
              <div className="w-10 h-10 rounded-xl bg-primary-container/50 text-primary flex items-center justify-center shrink-0">
                <Icon size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-on-surface leading-tight">{title}</p>
                <p className="text-[11.5px] text-on-surface-variant truncate">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Dispatch Form (col-span-7) */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">

            <form onSubmit={broadcast} className="rounded-2xl border border-outline-variant/70 bg-surface p-4 sm:p-7 space-y-5 shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[14px] sm:text-[13px] font-semibold text-on-surface-variant">
                    Service Category &amp; Skills Needed
                  </span>
                  {category && (
                    <span className="text-[12px] font-bold text-primary flex items-center gap-1">
                      <Layers size={13} /> {category}
                    </span>
                  )}
                </div>
                <CategoryDropdown
                  value={category}
                  onChange={(newCat) => {
                    setCategory(newCat);
                    setSelectedTasks([]);
                  }}
                />
              </div>

              {/* Multi-Service Task Selection & Add Service Button */}
              {category && (
                <div className="rounded-xl border border-primary/20 bg-surface-container-low p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] sm:text-[12.5px] font-bold text-on-surface flex items-center gap-1.5">
                      <Tag size={15} className="text-primary" /> Request Specific Tasks / Add Services:
                    </span>
                    <span className="hidden sm:inline text-[11px] text-on-surface-variant">Tap to include in request</span>
                  </div>

                  {/* Pre-defined Popular Task Chips for the Selected Category */}
                  {(() => {
                    const catObj = SERVICE_CATEGORIES.find(
                      (c) => c.id.toLowerCase() === category.toLowerCase() || c.name.toLowerCase() === category.toLowerCase()
                    );
                    if (!catObj?.subServices) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {catObj.subServices.map((task) => {
                          const isSelected = selectedTasks.includes(task);
                          return (
                            <button
                              key={task}
                              type="button"
                              onClick={() => {
                                setSelectedTasks((prev) =>
                                  isSelected ? prev.filter((t) => t !== task) : [...prev, task]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[12.5px] sm:text-[12px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                isSelected
                                  ? "bg-primary text-on-primary shadow-2xs"
                                  : "bg-surface border border-outline-variant/70 text-on-surface hover:border-primary/40 hover:bg-surface-container-high"
                              }`}
                            >
                              {isSelected ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} />}
                              {task}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Add Custom / Multiple Service Input Button */}
                  <div className="pt-1">
                    {showAddCustom ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={customTaskInput}
                          onChange={(e) => setCustomTaskInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (customTaskInput.trim()) {
                                if (!selectedTasks.includes(customTaskInput.trim())) {
                                  setSelectedTasks((prev) => [...prev, customTaskInput.trim()]);
                                }
                                setCustomTaskInput("");
                                setShowAddCustom(false);
                              }
                            }
                          }}
                          placeholder="Type custom task (e.g. Washroom leakage + motor wiring) & Enter..."
                          className="flex-1 h-11 px-3 rounded-xl bg-surface border border-outline-variant text-[13.5px] text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customTaskInput.trim()) {
                              if (!selectedTasks.includes(customTaskInput.trim())) {
                                setSelectedTasks((prev) => [...prev, customTaskInput.trim()]);
                              }
                              setCustomTaskInput("");
                            }
                            setShowAddCustom(false);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-primary text-on-primary text-[12.5px] font-bold cursor-pointer hover:opacity-90"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddCustom(false)}
                          className="p-1.5 text-on-surface-variant hover:text-on-surface cursor-pointer rounded"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddCustom(true)}
                        className="inline-flex items-center gap-1.5 text-[12.5px] sm:text-[12px] font-bold text-primary hover:underline cursor-pointer py-1"
                      >
                        <Plus size={14} strokeWidth={2.5} /> + Add Custom Service / Task
                      </button>
                    )}
                  </div>

                  {/* Active Selected Tasks Chips Display */}
                  {selectedTasks.length > 0 && (
                    <div className="pt-2 border-t border-outline-variant/40 space-y-1.5">
                      <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Included in this Dispatch Broadcast:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTasks.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-container text-on-primary-container text-[12px] font-bold shadow-2xs"
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() => setSelectedTasks((prev) => prev.filter((item) => item !== t))}
                              className="hover:opacity-70 cursor-pointer"
                              title="Remove"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[14px] sm:text-[13px] font-semibold text-on-surface-variant">Locality / Address</span>
                <div className="relative">
                  <MapPin size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder={locLoading ? "Detecting your location…" : "e.g. Indiranagar, Delhi"}
                    className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-28 text-[14.5px] sm:text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-[12px] font-bold hover:opacity-80 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <MapPin size={12.5} />
                    {locLoading ? "Detecting…" : "Use GPS"}
                  </button>
                </div>
                <p className="hidden sm:block mt-1.5 text-[11.5px] text-on-surface-variant font-medium">
                  Broadcasting within ~25 km radius · ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}){locAccuracy != null && ` · ±${locAccuracy}m GPS`}
                </p>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[14px] sm:text-[13px] font-semibold text-on-surface-variant">Offered Rate (₹/hr)</span>
                <div className="relative">
                  <IndianRupee size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="number" min={50} value={priceStr}
                  onChange={(e) => setPriceStr(e.target.value)}
                  className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-[16px] sm:text-[15px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary font-semibold"
                />
                </div>
                <p className="hidden sm:block mt-1.5 text-[11.5px] text-on-surface-variant font-medium">
                  Your real offer — every in-range worker sees <strong className="text-on-surface">₹{offerPrice}/hr</strong>. The first to accept locks this exact rate in escrow.
                </p>
              </label>

              {error && (
                <div className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-[13px] font-semibold text-on-error-container">{error}</div>
              )}

              {/* MOBILE: two compact pills */}
              <div className="grid grid-cols-2 gap-2.5 sm:hidden">
                <button
                  type="button"
                  onClick={() => setIsEmergency((v) => !v)}
                  className={`h-12 inline-flex items-center justify-center gap-1.5 px-3 rounded-full text-[13px] font-bold transition-all duration-200 cursor-pointer select-none whitespace-nowrap min-w-0 ${
                    isEmergency
                      ? "bg-[var(--color-error)] text-white"
                      : "border border-error/30 bg-error-container/50 text-on-error-container hover:bg-error-container"
                  } active:scale-95`}
                >
                  <Zap size={15} className={isEmergency ? "text-white fill-white" : "text-error"} strokeWidth={2.5} />
                  <span className="truncate">{isEmergency ? "Emergency ON" : "Emergency"}</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`h-12 inline-flex items-center justify-center gap-1.5 px-3 rounded-full text-[13px] font-bold text-white transition-all duration-200 cursor-pointer select-none whitespace-nowrap min-w-0 ${
                    submitting
                      ? "opacity-70 cursor-not-allowed bg-primary"
                      : "bg-primary hover:bg-primary-container hover:text-on-primary-container active:scale-95"
                  }`}
                >
                  <Radar size={15} strokeWidth={2.5} />
                  <span className="truncate">{submitting ? "Broadcasting…" : "Broadcast"}</span>
                </button>
              </div>
              <p className="text-[11.5px] text-on-surface-variant font-medium leading-snug sm:hidden">
                Broadcast shares your <strong className="text-on-surface">₹{offerPrice}/hr</strong> offer live with every worker in range. Emergency pings them with top priority.
              </p>

              {/* DESKTOP: full-width emergency toggle + broadcast button */}
              <label className="hidden sm:flex items-center gap-3 rounded-xl bg-error-container/40 border border-error/20 px-3.5 py-3 cursor-pointer">
                <input type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--color-error)]" />
                <Zap size={16} className="text-error shrink-0" />
                <span className="text-[13px] font-bold text-on-error-container leading-snug">Emergency Dispatch — priority alert to every ready worker</span>
              </label>
              <button type="submit" disabled={submitting}
                className="hidden sm:inline-flex h-14 w-full items-center justify-center gap-1.5 px-4 whitespace-nowrap rounded-xl bg-primary text-on-primary font-heading font-bold text-[14.5px] hover:bg-primary-container hover:text-on-primary-container active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer shadow-md">
                <Radar size={18} />
                {submitting ? "Broadcasting Request…" : `Broadcast Job Request · ₹${offerPrice}/hr`}
              </button>
            </form>
          </div>

          {/* Right Column: Live Network Preview & Security Shield (col-span-5) */}
          <div className="lg:col-span-5 space-y-5 sm:space-y-6 lg:sticky lg:top-8">
            {/* Live Geospatial Network Radar Card */}
            <div className="rounded-2xl border border-primary/20 bg-surface-container-low p-4 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Radar size={16} /> Live Geospatial
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-container text-on-primary-container">
                  Active
                </span>
              </div>

              <div className="p-4 sm:p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 flex items-center gap-3.5 shadow-2xs">
                <div className="shrink-0 text-[20px] leading-none font-extrabold text-primary tabular-nums sm:hidden">
                  {dynamicWorkerCount}+
                </div>
                <div className="hidden sm:flex w-12 h-12 shrink-0 rounded-xl bg-primary-container text-on-primary-container items-center justify-center font-bold text-[18px]">
                  {dynamicWorkerCount}+
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14px] sm:text-[14px] font-bold text-on-surface">Cooperative {category || "Worker"}s Ready</h4>
                  <p className="text-[12px] sm:text-[12px] text-on-surface-variant truncate">Verified in {locationText || "your local area"}</p>
                </div>
              </div>

              <div className="hidden sm:block space-y-2.5 pt-1">
                {[
                  { title: "e-Shram Govt. Verified", desc: "100% UAN & PMSBY insurance check" },
                  { title: "Razorpay Escrow Safety", desc: "Zero advance payment until job assigned" },
                  { title: "Institutional Oversight", desc: "Supervised by Primary Agricultural Credit Societies" },
                ].map((item, idx) => (
                   <div key={idx} className="flex items-start gap-2.5 text-[12.5px] text-on-surface-variant">
                    <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-on-surface font-semibold">{item.title}:</strong> <span>{item.desc}</span>
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-10 flex flex-col items-center text-center">
        <div className="mb-2">
          <AIBadge text="AI Live Scan & Broadcast Engine" />
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-on-surface mb-1.5" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
          Searching nearby certified{" "}{(booking?.targetCategory || "workers")}…
        </h1>
        <p className="text-[13px] sm:text-[13px] text-on-surface-variant mb-8 truncate max-w-[90vw]">{booking?.locationText}</p>

        {/* ── PREMIUM LIVE RADAR ── */}
        <div
          className="sg-radar-wrap relative h-72 w-72 sm:h-80 sm:w-80 md:h-96 md:w-96 rounded-full"
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
          <div className="hidden sm:block">
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
          </div>
          <p className="text-[12.5px] sm:text-[12px] text-on-surface-variant">
            Offer <strong className="text-on-surface">₹{booking?.price || offerPrice}/hr</strong> · escrow locks only after a worker accepts
          </p>
          <p className="text-[12.5px] sm:text-[12px] text-on-surface-variant font-semibold">Waiting for the first worker to accept…</p>
          <p className="hidden sm:block text-[11px] text-on-surface-variant/80">
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
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-10 space-y-6">
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
          <div className="w-11 h-11 rounded-xl bg-primary-container/50 text-primary flex items-center justify-center">
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
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-5 text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:text-primary transition-all">
        <BadgeCheck size={16} /> Track live status & chat
      </button>
    </div>
  );
}
