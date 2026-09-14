import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "../../lib/toast";
import CustomSelect from "../../components/CustomSelect";
import VerifiedBadge from "../../components/VerifiedBadge";
import FavoriteButton from "../../components/FavoriteButton";
import { Search, SlidersHorizontal, Star, MapPin, Mic, MicOff, Heart, LocateFixed, Navigation, History, X, Map, List } from "lucide-react";
import {
  IconApps, IconTool, IconBolt, IconSchool, IconChefHat, IconSpray,
  IconHeartbeat, IconCar, IconPlant2
} from "@tabler/icons-react";

const SKILLS = [
  { key: "All", Icon: IconApps },
  { key: "Plumber", Icon: IconTool },
  { key: "Electrician", Icon: IconBolt },
  { key: "Tutor", Icon: IconSchool },
  { key: "Cook", Icon: IconChefHat },
  { key: "Cleaner", Icon: IconSpray },
  { key: "Caregiver", Icon: IconHeartbeat },
  { key: "Driver", Icon: IconCar },
  { key: "Gardener", Icon: IconPlant2 },
];
const RADII = [5, 10, 15, 25, 50];
const SEARCH_HISTORY_KEY = "sg_search_history";
const MAX_HISTORY = 6;

export default function FindServices() {
  const [searchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState(searchParams.get("query") || searchParams.get("search") || "");
  const [skill, setSkill]         = useState(searchParams.get("skill") || "All");
  const [isListening, setIsListening] = useState(false);
  const [favIds, setFavIds]       = useState(() => new Set());
  const [favBusy, setFavBusy]     = useState(false);

  // Geo-fenced matching state
  const [coords, setCoords]       = useState(null);      // { lat, lng, at }
  const [locStatus, setLocStatus] = useState("off");     // off | locating | on | error
  const [locError, setLocError]   = useState("");
  const [radius, setRadius]       = useState(25);

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [minRating, setMinRating]     = useState(0);     // 0 = any
  const [maxRate, setMaxRate]         = useState(0);     // 0 = any (₹/hr)
  const [coopId, setCoopId]           = useState("");
  const [availableToday, setAvailableToday] = useState(false);
  const [cooperatives, setCooperatives] = useState([]);

  // Search history state (persisted to localStorage)
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.slice(0, MAX_HISTORY) : [];
    } catch {
      return [];
    }
  });

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.warning("Voice search is not supported on this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN"; // Hindi / Indian English vernacular support
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      commitSearch(transcript);
    };

    recognition.start();
  };

  const load = useCallback(async () => {
    try {
      // When the household has shared a location, geo-fence the results
      // (server filters by Haversine distance within `radius` km).
      const params = {};
      if (coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        params.radius = radius;
      }
      const { data } = await api.get("/providers", { params });
      // Backend responds with { providers, total, page, pages } or a plain array.
      setProviders(Array.isArray(data) ? data : (data?.providers ?? []));
    } catch {
      setProviders([]);
    } finally { setLoading(false); }
  }, [coords, radius]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  // Opt-in location sharing for geo-fenced provider matching.
  const requestLocation = () => {
    if (locStatus === "locating") return;
    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      setLocError("Geolocation is not supported on this device.");
      return;
    }
    setLocStatus("locating");
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, at: Date.now() });
        setLocStatus("on");
      },
      (err) => {
        setLocStatus("error");
        setCoords(null);
        setLocError(err?.message || "Could not access your location.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const clearLocation = () => {
    setCoords(null);
    setLocStatus("off");
    setLocError("");
  };

  const formatDistance = (km) => {
    if (km == null) return null;
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  };

  // Sync saved-provider ids so heart toggles render correctly.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/favorites/ids");
        if (Array.isArray(data)) setFavIds(new Set(data.map((x) => String(x))));
      } catch {
        /* favourites ids unavailable — buttons will start unhighlighted */
      }
    })();
  }, []);

  // Load cooperatives for the "specific cooperative" advanced filter.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/providers/cooperatives");
        setCooperatives(Array.isArray(data) ? data : []);
      } catch {
        setCooperatives([]);
      }
    })();
  }, []);

  // Local weekday string used for "available today" (handles full & 3-letter forms).
  const todayDay = () => {
    return new Date().toLocaleDateString("en-US", { weekday: "long" }); // e.g. "Monday"
  };
  const isAvailableToday = (p) => {
    const full = todayDay();
    const short = full.slice(0, 3); // e.g. "Mon"
    return (p.availabilitySlots || []).some((slot) => {
      const day = String(slot.day || "").trim().toLowerCase();
      return day === full.toLowerCase() || day === short.toLowerCase();
    });
  };

  const activeFilterCount =
    (onlyVerified ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (maxRate > 0 ? 1 : 0) +
    (coopId ? 1 : 0) +
    (availableToday ? 1 : 0);

  const clearFilters = () => {
    setOnlyVerified(false);
    setMinRating(0);
    setMaxRate(0);
    setCoopId("");
    setAvailableToday(false);
  };

  // ── Search history helpers ──
  const persistHistory = (next) => {
    setSearchHistory(next);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
    } catch { /* storage unavailable */ }
  };

  const commitSearch = (term) => {
    const q = String(term || "").trim();
    if (!q) return;
    setQuery(q);
    persistHistory([
      q,
      ...searchHistory.filter((h) => h.toLowerCase() !== q.toLowerCase()),
    ].slice(0, MAX_HISTORY));
  };

  const removeHistoryItem = (term) => {
    persistHistory(searchHistory.filter((h) => h !== term));
  };

  const clearHistory = () => persistHistory([]);

  const toggleFav = async (id) => {
    if (favBusy) return;
    setFavBusy(true);
    try {
      if (favIds.has(String(id))) {
        await api.delete(`/favorites/${id}`);
        setFavIds((prev) => { const n = new Set(prev); n.delete(String(id)); return n; });
      } else {
        await api.post(`/favorites/${id}`);
        setFavIds((prev) => new Set(prev).add(String(id)));
      }
    } catch {
      /* keep state unchanged on failure */
    } finally {
      setFavBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = providers.filter(p => {
      const matchSkill = skill === "All" || (p.skills || []).some(s => s.toLowerCase().includes(skill.toLowerCase()));
      const matchQuery = !q ||
        (p.userId?.name || "").toLowerCase().includes(q) ||
        (p.skills || []).some(s => s.toLowerCase().includes(q));
      const matchVerified = !onlyVerified || p.verified;
      const matchRating = !minRating || (p.rating || 0) >= minRating;
      const matchRate = !maxRate || (p.hourlyRate || 0) <= maxRate;
      const matchCoop = !coopId || String(p.cooperativeId?._id || p.cooperativeId) === String(coopId);
      const matchAvail = !availableToday || isAvailableToday(p);
      return matchSkill && matchQuery && matchVerified && matchRating && matchRate && matchCoop && matchAvail;
    });
    if (coords) {
      return [...list].sort((a, b) => {
        const da = a.distanceKm == null ? Infinity : Number(a.distanceKm);
        const db = b.distanceKm == null ? Infinity : Number(b.distanceKm);
        return da - db;
      });
    }
    return list;
  }, [providers, query, skill, coords, onlyVerified, minRating, maxRate, coopId, availableToday]);

  const verified = providers.filter(p => p.verified).length;

  // ── Map / list view toggle (real provider coords only) ──
  const [viewMode, setViewMode] = useState("list");

  const mappedProviders = useMemo(() => {
    return filtered.filter((p) => p.geoLocation && Number(p.geoLocation.lat) && Number(p.geoLocation.lng));
  }, [filtered]);

  function loadLeaflet() {
    return new Promise((resolve, reject) => {
      if (window.L) return resolve(window.L);
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = () => document.getElementById("provider-map") && setTimeout(resolve, 0);
      js.onerror = reject;
      document.head.appendChild(js);
    });
  }

  // Draw the live map only when it is actually opened.
  useEffect(() => {
    if (viewMode !== "map") return;
    let map;
    loadLeaflet()
      .then(() => {
        if (!window.L || !document.getElementById("provider-map")) return;
        map = window.L.map("provider-map");
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        const points = mappedProviders.map((p) => ({
          lat: Number(p.geoLocation.lat),
          lng: Number(p.geoLocation.lng),
          name: p.userId?.name || "Provider",
          skill: (p.skills || []).join(", "),
        }));
        if (coords) {
          map.setView([Number(coords.lat), Number(coords.lng)], 12);
        } else if (points.length) {
          map.fitBounds(window.L.latLngBounds(points.map((pt) => [pt.lat, pt.lng])));
        } else {
          map.setView([28.6139, 77.209], 11);
        }

        points.forEach((pt) => {
          window.L.marker([pt.lat, pt.lng])
            .addTo(map)
            .bindPopup(`<b>${pt.name}</b><br/><span style="font-size:11px">${pt.skill || "Community provider"}</span>`);
        });
      })
      .catch(() => {});
    return () => { if (map) { map.remove(); } };
  }, [viewMode, mappedProviders, coords]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-10 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Find Services
          </h1>
          <p className="hidden sm:block text-[14px] text-on-surface-variant mt-0.5">
            Browse verified cooperative service providers near you.
          </p>
        </div>
        {!loading && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/60 text-[13px] font-bold text-on-surface">
              {providers.length} providers
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/60 text-[13px] font-bold text-on-surface">
              {verified} verified
            </span>
            <Link
              to="/household/saved"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-bold w-fit border border-outline-variant bg-surface text-on-surface hover:border-error/40 hover:text-error transition-all"
            >
              <Heart size={13} fill="currentColor" />
              Saved
            </Link>
            <button
              type="button"
              onClick={() => setViewMode(v => (v === "list" ? "map" : "list"))}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-bold transition-all ${
                viewMode === "map"
                  ? "border border-primary/40 bg-primary-container text-on-primary-container"
                  : "border border-outline-variant bg-surface text-on-surface hover:border-primary/40 hover:bg-primary-container/40"
              }`}
            >
              {viewMode === "map" ? <List size={13} /> : <Map size={13} />}
              {viewMode === "map" ? "List" : "Map"}
            </button>
          </div>
        )}
      </div>

      {/* ── Geo-fenced location bar ── */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: status + action */}
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${locStatus === "on" ? "bg-primary-container text-on-primary-container" : "bg-surface-container-low text-on-surface-variant"}`}>
            <MapPin size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            {locStatus === "on" ? (
              <>
                <p className="text-[13px] font-bold text-on-surface">Nearby providers enabled</p>
                <p className="hidden sm:block text-[12px] text-on-surface-variant truncate">
                  Showing providers within {radius} km · sorted nearest first
                </p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold text-on-surface">
                  Find providers near you
                </p>
                <p className="hidden sm:block text-[12px] text-on-surface-variant">
                  {locStatus === "error"
                    ? locError
                    : "Turn on your location to match with trusted providers nearby."}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {locStatus === "on" ? (
            <>
              {/* Radius selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1 text-[13px] font-semibold text-on-surface">
                <Navigation size={14} className="text-primary shrink-0" />
                <span className="text-on-surface-variant shrink-0">Radius:</span>
                <CustomSelect
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  size="sm"
                  options={RADII.map((r) => ({ value: r, label: `${r} km` }))}
                  className="w-24"
                />
              </div>
              <button
                type="button"
                onClick={clearLocation}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 text-[12px] font-semibold text-on-surface-variant hover:border-error/50 hover:text-error transition-all"
              >
                Turn off
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={requestLocation}
              disabled={locStatus === "locating"}
              className="inline-flex h-8 items-center gap-2 rounded-xl bg-primary px-3 text-[12px] font-bold text-on-primary hover:opacity-90 disabled:opacity-60 transition-all"
            >
              <LocateFixed size={13} className={locStatus === "locating" ? "animate-spin" : ""} />
              {locStatus === "locating" ? "Locating…" : "Use my location"}
            </button>
          )}
        </div>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" strokeWidth={2} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); }}
            onKeyDown={e => { if (e.key === "Enter") commitSearch(query); }}
            placeholder={isListening ? "Listening... Speak now..." : "Search by name or skill..."}
            className={`h-11 sm:h-10 w-full rounded-xl border bg-surface pl-9 pr-10 text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
              isListening ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-outline-variant"
            }`}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); commitSearch(""); }}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Clear search query"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={startVoiceSearch}
            title="Voice Search (Hindi / English)"
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
              isListening ? "text-error animate-pulse bg-error-container" : "text-primary hover:bg-primary-container"
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 items-center">
          {SKILLS.map(({ key, Icon }) => (
            <button key={key} onClick={() => setSkill(key)}
              className={`h-8 px-3 rounded-lg text-[12.5px] font-semibold transition-all duration-200 inline-flex items-center justify-center gap-1.5 leading-none cursor-pointer active:scale-95 ${
                skill === key
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
              }`}>
              <Icon size={13} stroke={1.8} className="shrink-0" />
              <span>{key}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(v => !v)}
          className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-bold transition-all ${
            showFilters || activeFilterCount > 0
              ? "border-primary/40 bg-primary-container text-on-primary-container"
              : "border-outline-variant bg-surface text-on-surface hover:border-primary/40 hover:bg-primary-container/40"
          }`}
        >
          <SlidersHorizontal size={15} strokeWidth={2} />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-on-primary">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Search history ── */}
      {searchHistory.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-on-surface-variant">
            <History size={14} />
            Recent
          </span>
          {searchHistory.map((term) => (
            <span
              key={term}
              className="inline-flex items-center gap-1 rounded-full border border-outline-variant/60 bg-surface px-3 py-1.5 text-[12px] font-semibold text-on-surface hover:border-primary/40 hover:bg-primary-container/40"
            >
              <button
                type="button"
                onClick={() => commitSearch(term)}
                className="leading-none cursor-pointer"
              >
                {term}
              </button>
              <button
                type="button"
                onClick={() => removeHistoryItem(term)}
                aria-label={`Remove ${term} from search history`}
                className="text-on-surface-variant hover:text-error cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearHistory}
            className="text-[12px] font-bold text-on-surface-variant hover:text-error cursor-pointer underline underline-offset-2"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Advanced filters panel ── */}
      {showFilters && (
        <div className="rounded-2xl border border-outline-variant/60 bg-surface p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-on-surface">Advanced filters</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[12px] font-bold text-primary hover:underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Verified only */}
            <label className="flex items-center justify-between gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2.5 cursor-pointer">
              <span className="text-[13px] font-semibold text-on-surface">Verified only</span>
              <input
                type="checkbox"
                checked={onlyVerified}
                onChange={(e) => setOnlyVerified(e.target.checked)}
                className="h-4 w-4 accent-primary cursor-pointer"
              />
            </label>

            {/* Min rating */}
            <div className="flex flex-col gap-1 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Min rating</span>
              <CustomSelect
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                size="sm"
                options={[
                  { value: 0, label: "Any" },
                  { value: 4.5, label: "4.5+ ★" },
                  { value: 4, label: "4.0+ ★" },
                  { value: 3.5, label: "3.5+ ★" },
                  { value: 3, label: "3.0+ ★" },
                ]}
              />
            </div>

            {/* Max rate */}
            <div className="flex flex-col gap-1 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Max rate / hr</span>
              <CustomSelect
                value={maxRate}
                onChange={(e) => setMaxRate(Number(e.target.value))}
                size="sm"
                options={[
                  { value: 0, label: "Any" },
                  { value: 200, label: "Under ₹200" },
                  { value: 300, label: "Under ₹300" },
                  { value: 400, label: "Under ₹400" },
                  { value: 500, label: "Under ₹500" },
                ]}
              />
            </div>

            {/* Cooperative */}
            <div className="flex flex-col gap-1 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Cooperative</span>
              <CustomSelect
                value={coopId}
                onChange={(e) => setCoopId(e.target.value)}
                size="sm"
                options={[
                  { value: "", label: "Any" },
                  ...cooperatives.map((c) => ({ value: c._id, label: c.name })),
                ]}
              />
            </div>
          </div>

          {/* Available today */}
          <label className="flex items-center justify-between gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2.5 cursor-pointer">
            <span className="text-[13px] font-semibold text-on-surface">
              Available today ({todayDay()})
            </span>
            <input
              type="checkbox"
              checked={availableToday}
              onChange={(e) => setAvailableToday(e.target.checked)}
              className="h-4 w-4 accent-primary cursor-pointer"
            />
          </label>
        </div>
      )}

      {/* Provider grid / map */}
      {viewMode === "map" && (
        <div className="rounded-2xl border border-outline-variant/60 bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/40">
            <p className="text-[13px] font-bold text-on-surface">
              Map view
            </p>
            <p className="text-[12px] text-on-surface-variant">
              {mappedProviders.length} provider{mappedProviders.length === 1 ? "" : "s"} on map{mappedProviders.length > 0 && mappedProviders.length < filtered.length ? ` · ${filtered.length - mappedProviders.length} without coordinates` : ""}
            </p>
          </div>
          {mappedProviders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <MapPin size={40} strokeWidth={1.5} className="text-outline-variant" />
              <p className="text-[14px] font-semibold text-on-surface">No geolocated providers to pin</p>
              <p className="hidden sm:block text-[12px] text-on-surface-variant">
                Providers appear here once they set their service location coordinates.
              </p>
            </div>
          ) : (
            <div id="provider-map" className="h-[420px] w-full bg-surface-container-low z-0" />
          )}
        </div>
      )}
      {viewMode === "list" && (loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface p-5 h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface px-6 py-20 text-center">
          <Search size={44} className="text-outline-variant" strokeWidth={1.5} />
          <p className="text-[15px] font-semibold text-on-surface">No providers found</p>
          <p className="text-[14px] text-on-surface-variant">
            {locStatus === "on"
              ? "No providers found within the selected radius. Try widening it under the location bar."
              : query || skill !== "All"
                ? "Try a different search or filter."
                : "No providers registered yet."}
          </p>
          {locStatus === "on" && (
            <button
              type="button"
              onClick={() => setRadius((r) => (r >= 50 ? 50 : r + 5))}
              className="mt-1 inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-5 py-2.5 text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:bg-primary-container hover:text-on-primary-container transition-all"
            >
              <MapPin size={15} />
              Widen radius ({radius} km → {Math.min(50, radius + 5)} km)
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <div key={p._id}
              className="flex flex-col gap-4 rounded-2xl border border-outline-variant/60 bg-surface p-5 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] hover:border-outline transition-all duration-200">

              {/* Top row */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-[15px] font-bold text-on-primary-container shrink-0">
                  {(p.userId?.name || "?").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[15px] font-bold text-on-surface truncate">{p.userId?.name ?? "Provider"}</p>
                    {p.verified && <VerifiedBadge />}
                  </div>
                  <p className="text-[12px] text-on-surface-variant truncate">{p.userId?.email}</p>
                </div>
                <FavoriteButton favourite={favIds.has(String(p._id))} onToggle={() => toggleFav(p._id)} />
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {(p.skills || []).slice(0, 4).map(s => (
                  <span key={s} className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[11px] font-semibold">{s}</span>
                ))}
              </div>

              {/* Rate + trust + distance */}
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-2.5 border border-outline-variant/30">
                <div className="flex items-center gap-1.5 text-[13px] text-on-surface-variant">
                  <Star size={13} className="text-tertiary-container dark:text-tertiary" strokeWidth={2} />
                  <span className="font-semibold text-on-surface">{p.trustScore ?? "—"}</span>
                  <span className="hidden sm:inline">trust score</span>
                </div>
                <div className="flex items-center gap-2">
                  {coords && formatDistance(p.distanceKm) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary-container/60 px-2 py-0.5 text-[11px] font-bold text-on-primary-container">
                      <MapPin size={11} />
                      {formatDistance(p.distanceKm)}
                    </span>
                  )}
                  <span className="text-[14px] font-bold text-on-surface">
                    ₹{p.hourlyRate ?? "—"}<span className="text-[11px] font-normal text-on-surface-variant">/hr</span>
                  </span>
                </div>
              </div>

              {/* Book button */}
              <Link to={`/household/book/${p._id}`}
                className="w-full h-11 sm:h-10 flex items-center justify-center rounded-xl border border-outline-variant bg-surface text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:bg-primary-container hover:text-on-primary-container transition-all duration-200">
                Book Now
              </Link>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
