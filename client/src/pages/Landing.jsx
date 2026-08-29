import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SERVER_URL } from '../lib/config';
import {
  IconSearch, IconMapPin, IconCircleCheck, IconShieldCheck, IconBolt,
  IconSchool, IconSparkles, IconHeartbeat, IconLayoutGrid,
  IconArrowRight, IconUsers, IconCalendarCheck, IconStar, IconHeartHandshake, IconChevronRight,
  IconMicrophone
} from '@tabler/icons-react';

import AIVoiceSearchModal from '../components/AIVoiceSearchModal';
import HeroVideoBackground from '../components/HeroVideoBackground';

const HERO_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ-dpYJMEXWGjKVWEtlFNYAPrFrGMUncXsN08msvogjefS62LwnCQ1bUeItkSrlQSZYpq5JrB8qKHNifnjbW0rHcNkbQY9x_gnoxQqWcWi-cqXBPtYQcopyEOxc1pQc4HyPUfW753FHhzpHa1Q7iqyfvjr5CMRSKmil9ODYutUqHafvNbhWSptBy9GXzM09Au9PHyKYYpeMrAayssGeRytpEpRtDvUHzfHKsko5gpP7qzGC8T3jA';

const SMALL_CATS = [
  { Icon: IconSchool,       label: 'Education & Tutoring', sub: 'Home tutors, Coaching' },
  { Icon: IconSparkles,      label: 'Cleaning Services',    sub: 'Deep clean, Laundry' },
  { Icon: IconHeartbeat,     label: 'Caregiving',           sub: 'Elder care, Nursing' },
  { Icon: IconLayoutGrid,    label: 'View All Services',    sub: 'Explore 50+ categories' },
];

const STATS = [
  { key: 'providers',   label: 'Verified Providers',  Icon: IconUsers },
  { key: 'bookings',    label: 'Bookings Completed',   Icon: IconCalendarCheck },
  { key: 'cooperatives',label: 'Cooperatives',          Icon: IconHeartHandshake },
  { key: 'avgRating',   label: 'Average Rating',        Icon: IconStar },
];

const FEATURES = [
  {
    Icon: IconSparkles,
    title: 'AI Broadcast & First-Lock Engine',
    desc: 'AI-powered geospatial engine broadcasts requests to nearby verified providers and locks first-acceptance atomically in milliseconds.',
  },
  {
    Icon: IconCircleCheck,
    title: 'Cooperative Verified',
    desc: 'Every provider is background-checked and endorsed by a registered cooperative society before they can take bookings.',
  },
  {
    Icon: IconShieldCheck,
    title: 'Secure & Fair Payments',
    desc: 'Razorpay-powered escrow holds funds safely. Providers earn more; households pay less — zero hidden fees.',
  },
];

const HOW = [
  { n: '01', title: 'Search a Service',  desc: 'Browse by category or search for exactly what you need in your locality.' },
  { n: '02', title: 'Book Instantly',    desc: 'Pick a verified provider, choose a time slot, and confirm your booking.' },
  { n: '03', title: 'Track Live',        desc: 'Follow your provider in real-time via Socket.io-powered live status updates.' },
  { n: '04', title: 'Pay & Review',      desc: 'Pay securely after the job is done and leave a review for the community.' },
];

const ALL_SERVICES = [
  { label: 'Electrician', desc: 'Wiring, Fuse, Short Circuit, Inverter, Switches', icon: '⚡' },
  { label: 'Plumber', desc: 'Pipe Leakage, Tap Repair, Drain Jetting, Tank Cleaning', icon: '🔧' },
  { label: 'Home Cook', desc: 'Daily Meals, North/South Indian, Party Chef', icon: '🍲' },
  { label: 'Tutor', desc: 'School Math, Science, Board Exams, Language Coaching', icon: '📚' },
  { label: 'House Cleaning', desc: 'Deep Cleaning, Bathroom Sanitation, Kitchen Wash', icon: '🧹' },
  { label: 'Caregiver', desc: 'Elderly Care, Patient Nursing, Post-Surgery Support', icon: '🩺' },
  { label: 'Driver', desc: 'Daily Commute, Outstation Trips, Commercial Driver', icon: '🚗' },
  { label: 'Gardener', desc: 'Lawn Mowing, Plant Trimming, Organic Fertilizer', icon: '🪴' },
  { label: 'Carpenter', desc: 'Furniture Repair, Door Latches, Wood Polish', icon: '🪚' },
  { label: 'Painter', desc: 'Wall Painting, Waterproofing, Texture Designs', icon: '🎨' },
];

const DEFAULT_INDIAN_HUBS = [
  { title: "New Delhi", subtitle: "National Capital Territory of Delhi, India", state: "Delhi", full: "New Delhi, Delhi, India" },
  { title: "Noida Sector 62", subtitle: "Gautam Buddha Nagar, Uttar Pradesh, India", state: "Uttar Pradesh", full: "Noida Sector 62, Uttar Pradesh, India" },
  { title: "Bengaluru", subtitle: "Bengaluru Urban, Karnataka, India", state: "Karnataka", full: "Bengaluru, Karnataka, India" },
  { title: "Mumbai", subtitle: "Mumbai Suburban, Maharashtra, India", state: "Maharashtra", full: "Mumbai, Maharashtra, India" },
  { title: "Hyderabad", subtitle: "Telangana, India", state: "Telangana", full: "Hyderabad, Telangana, India" },
  { title: "Pune", subtitle: "Pune District, Maharashtra, India", state: "Maharashtra", full: "Pune, Maharashtra, India" },
  { title: "Kolkata", subtitle: "West Bengal, India", state: "West Bengal", full: "Kolkata, West Bengal, India" },
  { title: "Chennai", subtitle: "Chennai District, Tamil Nadu, India", state: "Tamil Nadu", full: "Chennai, Tamil Nadu, India" },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  
  // Suggestion Dropdown States
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState(DEFAULT_INDIAN_HUBS);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Filtered Services based on user typing
  const filteredServices = serviceQuery.trim()
    ? ALL_SERVICES.filter(s => 
        s.label.toLowerCase().includes(serviceQuery.toLowerCase()) || 
        s.desc.toLowerCase().includes(serviceQuery.toLowerCase())
      )
    : ALL_SERVICES;

  // 100% Live Real-Time Indian Geocoding Engine (Photon Komoot + OpenStreetMap Nominatim Live API)
  async function searchIndianLocations(text) {
    if (!text || text.trim().length < 2) {
      setLocationSuggestions(DEFAULT_INDIAN_HUBS);
      return;
    }
    setIsLoadingLocations(true);

    try {
      // 1. Live Photon Komoot OpenStreetMap Geocoder for India
      const photonPromise = fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=8&bbox=68.1,6.5,97.4,35.5&lang=en`
      ).then(r => r.json()).catch(() => null);

      // 2. Live OpenStreetMap Nominatim Geocoder with Indian addressdetails
      const nominatimPromise = fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&accept-language=en&addressdetails=1&q=${encodeURIComponent(text)}&limit=8`
      ).then(r => r.json()).catch(() => null);

      const [photonData, nominatimData] = await Promise.all([photonPromise, nominatimPromise]);

      const results = [];
      const seen = new Set();

      // Parse Photon live results
      if (photonData && Array.isArray(photonData.features)) {
        for (const feat of photonData.features) {
          const p = feat.properties || {};
          const name = p.name || p.street || p.district || p.city;
          const city = p.city || p.county || p.district || '';
          const state = p.state || '';
          const postcode = p.postcode || '';

          if (name && (state || p.country === 'India')) {
            const title = name;
            const subtitle = [city !== name ? city : '', state, 'India'].filter(Boolean).join(', ');
            const full = [title, city !== name ? city : '', state].filter(Boolean).join(', ');
            
            if (!seen.has(full.toLowerCase()) && /^[\w\s,.-]+$/i.test(title)) {
              seen.add(full.toLowerCase());
              results.push({ title, subtitle, state, pincode: postcode, full });
            }
          }
        }
      }

      // Parse Nominatim live results
      if (nominatimData && Array.isArray(nominatimData)) {
        for (const item of nominatimData) {
          const addr = item.address || {};
          const name = item.name || addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village;
          const city = addr.city || addr.town || addr.district || addr.county || '';
          const state = addr.state || '';
          const postcode = addr.postcode || '';

          if (name && state) {
            const title = name;
            const subtitle = [city !== name ? city : '', state, 'India'].filter(Boolean).join(', ');
            const full = [title, city !== name ? city : '', state].filter(Boolean).join(', ');

            if (!seen.has(full.toLowerCase()) && /^[\w\s,.-]+$/i.test(title)) {
              seen.add(full.toLowerCase());
              results.push({ title, subtitle, state, pincode: postcode, full });
            }
          }
        }
      }

      if (results.length > 0) {
        setLocationSuggestions(results.slice(0, 8));
      }
    } catch {
      // Keep previous
    } finally {
      setIsLoadingLocations(false);
    }
  }

  // Detect Current Location via Geolocation API
  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=en`);
          const data = await res.json();
          if (data?.display_name) {
            const loc = data.display_name.split(',').slice(0, 3).join(', ').trim();
            setLocationQuery(loc);
          } else {
            setLocationQuery("Noida, Uttar Pradesh");
          }
        } catch {
          setLocationQuery("Noida, Uttar Pradesh");
        } finally {
          setIsLocating(false);
          setShowLocationDropdown(false);
        }
      },
      () => {
        setIsLocating(false);
        setLocationQuery("Noida, Uttar Pradesh");
        setShowLocationDropdown(false);
      }
    );
  }

  function handleSearch(e, forcedService, forcedLoc) {
    if (e) e.preventDefault();
    const query = (forcedService !== undefined ? forcedService : serviceQuery).trim();
    const location = (forcedLoc !== undefined ? forcedLoc : locationQuery).trim();

    // 1. Save search intent in localStorage with 2-minute (120,000 ms) expiration
    const intent = {
      query: query || "Electrician",
      location: location || "Noida, Uttar Pradesh",
      timestamp: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes TTL
    };
    try {
      localStorage.setItem("sg_pending_search_intent", JSON.stringify(intent));
    } catch {}

    setShowServiceDropdown(false);
    setShowLocationDropdown(false);

    // 2. If authenticated as Household, proceed straight to directory discovery
    if (user && user.role === "Household") {
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (location) params.set("location", location);
      navigate(`/household/find${params.toString() ? `?${params.toString()}` : ''}`);
      return;
    }

    // 3. If guest / unauthenticated, redirect to Signup / Login to get started and activate flow
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (location) params.set("location", location);
    navigate(`/signup?role=Household&source=search&${params.toString()}`);
  }

  useEffect(() => {
    fetch(`${SERVER_URL}/api/stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => setStats({ providers: 0, bookings: 0, cooperatives: 0, avgRating: 0 }));
  }, []);

  function fmtValue(key, val) {
    if (val == null) return '—';
    if (key === 'avgRating') return val > 0 ? `${val}★` : '—';
    if (key === 'bookings') return val >= 100000 ? `${(val / 100000).toFixed(1)} Lakh+` : val > 0 ? `${val.toLocaleString('en-IN')}+` : '0';
    return val > 0 ? `${val.toLocaleString('en-IN')}+` : '0';
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface antialiased selection:bg-primary selection:text-on-primary">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-surface/85 border-b border-outline-variant shadow-[0_2px_16px_rgba(0,40,142,0.04)]">
        <div className="w-full px-6 sm:px-10 lg:px-12 h-[68px] flex items-center justify-between gap-4">

          {/* Logo — left corner aligned */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center shadow-[0_4px_12px_rgba(30,107,101,0.3)] group-hover:shadow-[0_6px_18px_rgba(30,107,101,0.45)] group-hover:scale-105 transition-all duration-300">
              <IconHeartHandshake size={18} stroke={1.5} className="text-on-primary-fixed" />
            </div>
            <span className="text-[19px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Sahakar<span className="text-primary">Gig</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {[
              ['#services', 'Services'],
              ['#how', 'How it Works'],
              ['#about', 'Why Us'],
              ['/architecture', 'System Architecture'],
            ].map(([href, label]) => (
              href.startsWith('/') ? (
                <Link
                  key={label}
                  to={href}
                  className="px-4 py-2 rounded-lg text-[13.5px] font-semibold text-on-surface-variant hover:text-primary hover:bg-primary-container/70 transition-all duration-200"
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  className="px-4 py-2 rounded-lg text-[13.5px] font-semibold text-on-surface-variant hover:text-primary hover:bg-primary-container/70 transition-all duration-200"
                >
                  {label}
                </a>
              )
            ))}
          </nav>

          {/* Auth Buttons — right corner aligned with signature app styling */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/login"
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-[13.5px] font-semibold text-on-surface-variant hover:text-primary hover:bg-primary-container/70 transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold bg-primary text-on-primary shadow-[0_2px_10px_rgba(30,107,101,0.25)] hover:opacity-90 hover:shadow-[0_6px_18px_rgba(30,107,101,0.4)] active:scale-[0.98] transition-all duration-200"
            >
              Get Started <IconArrowRight size={14} stroke={2} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">

        {/* ── HERO SECTION ── */}
        <section className="relative z-0 pt-16 pb-20 px-6 flex flex-col items-center text-center">
          {/* Dynamic 60fps Interactive Aurora Gradient & Node Mesh Background */}
          <HeroVideoBackground />

          {/* ── HERO FOREGROUND CONTENT (z-10) ── */}
          <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">

          {/* Official Government Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-900 text-[12px] font-bold tracking-tight shadow-sm hover:border-[#00288e]/40 transition-all duration-300 mb-6 cursor-default">
            <span className="w-2 h-2 rounded-full bg-[#00288e] animate-ping" />
            <span className="font-extrabold text-[#00288e]">Ministry of Cooperation</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-slate-600">Government of India Initiative</span>
          </div>

          {/* Headline */}
          <h1
            className="text-[36px] sm:text-[52px] md:text-[66px] font-extrabold tracking-[-0.03em] leading-[1.1] sm:leading-[1.05] text-on-surface max-w-3xl mb-5"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}
          >
            Find Trusted{' '}
            <span className="text-primary relative inline-block">
              Cooperative
            </span>{' '}
            Services
          </h1>

          {/* Subtitle */}
          <p className="text-[17px] sm:text-[19px] leading-[1.65] text-on-surface-variant max-w-xl mb-10 font-normal">
            Connect directly with verified local professionals backed by your community cooperative.
            Reliable, safe, and empowering for everyone.
          </p>

          {/* ── POLISHED SAAS SEARCH BAR WITH LIVE AUTOCOMPLETE & GPS ── */}
          <div className="relative w-full max-w-[780px] z-30 mb-6">
            <form
              onSubmit={handleSearch}
              className="w-full bg-surface/95 backdrop-blur-md rounded-2xl sm:rounded-full p-2 sm:p-2.5 border border-outline-variant/80 shadow-[0_12px_44px_rgba(0,0,0,0.09)] hover:shadow-[0_18px_56px_rgba(0,0,0,0.13)] hover:border-primary/50 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 transition-all duration-300 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2"
            >
              {/* Service Input & Autocomplete Dropdown */}
              <div className="relative w-full flex-1">
                <div className="flex items-center gap-2.5 px-3.5 py-2">
                  <IconSearch size={18} stroke={1.75} className="text-primary shrink-0" />
                  <input
                    type="text"
                    value={serviceQuery}
                    onFocus={() => { setShowServiceDropdown(true); setShowLocationDropdown(false); }}
                    onChange={(e) => { setServiceQuery(e.target.value); setShowServiceDropdown(true); }}
                    className="w-full bg-transparent border-none outline-none text-[14px] font-medium text-on-surface placeholder:text-on-surface-variant/60"
                    placeholder="What service do you need? (e.g. Electrician, Cook)"
                  />
                  {serviceQuery && (
                    <button
                      type="button"
                      onClick={() => setServiceQuery("")}
                      className="text-on-surface-variant/50 hover:text-on-surface text-xs font-bold px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Service Suggestions Dropdown */}
                {showServiceDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-full sm:w-[320px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 text-left animate-fadeIn max-h-[320px] overflow-y-auto">
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Popular Cooperative Services</span>
                      <button
                        type="button"
                        onClick={() => setShowServiceDropdown(false)}
                        className="hover:text-slate-800"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-1.5 divide-y divide-slate-50">
                      {filteredServices.map((srv) => (
                        <button
                          key={srv.label}
                          type="button"
                          onClick={() => {
                            setServiceQuery(srv.label);
                            setShowServiceDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-[#e8edff] flex items-center gap-3 transition-colors cursor-pointer group"
                        >
                          <span className="text-xl p-1.5 rounded-lg bg-slate-100 group-hover:bg-white shrink-0">{srv.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-bold text-slate-900 group-hover:text-[#00288e]">{srv.label}</p>
                            <p className="text-[11.5px] text-slate-500 truncate">{srv.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Subtle Divider */}
              <div className="hidden sm:block w-[1px] h-7 bg-outline-variant/60 shrink-0" />

              {/* Location Input & Indian Nominatim Geocoder Dropdown */}
              <div className="relative w-full flex-1">
                <div className="flex items-center gap-2.5 px-3.5 py-2">
                  <IconMapPin size={18} stroke={1.75} className="text-primary shrink-0" />
                  <input
                    type="text"
                    value={locationQuery}
                    onFocus={() => { setShowLocationDropdown(true); setShowServiceDropdown(false); }}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setShowLocationDropdown(true);
                      searchIndianLocations(e.target.value);
                    }}
                    className="w-full bg-transparent border-none outline-none text-[14px] font-medium text-on-surface placeholder:text-on-surface-variant/60"
                    placeholder="City, Locality or Pincode in India"
                  />
                  {locationQuery && (
                    <button
                      type="button"
                      onClick={() => setLocationQuery("")}
                      className="text-on-surface-variant/50 hover:text-on-surface text-xs font-bold px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Location Suggestions Dropdown */}
                {showLocationDropdown && (
                  <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-[420px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 text-left animate-fadeIn max-h-[380px] overflow-y-auto">
                    {/* GPS Auto-Detect Button */}
                    <div className="p-2.5 border-b border-slate-100 bg-[#e8edff]/70">
                      <button
                        type="button"
                        onClick={detectCurrentLocation}
                        disabled={isLocating}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#00288e] text-white text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#173bab] active:scale-98 transition-all cursor-pointer shadow-xs disabled:opacity-60"
                      >
                        <IconMapPin size={16} className={isLocating ? "animate-spin" : ""} />
                        <span>{isLocating ? "Detecting GPS in India..." : "📍 Use My Current GPS Location"}</span>
                      </button>
                    </div>

                    <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>{isLoadingLocations ? "Searching Indian Geocoder..." : "Verified Localities & Cities in India"}</span>
                      <button
                        type="button"
                        onClick={() => setShowLocationDropdown(false)}
                        className="hover:text-slate-800"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-1.5 divide-y divide-slate-50">
                      {locationSuggestions.map((loc, idx) => {
                        const title = typeof loc === 'string' ? loc : loc.title;
                        const subtitle = typeof loc === 'string' ? '' : loc.subtitle;
                        const stateBadge = typeof loc === 'string' ? '' : loc.state;
                        const full = typeof loc === 'string' ? loc : (loc.full || loc.title);

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setLocationQuery(full);
                              setShowLocationDropdown(false);
                            }}
                            className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-[#e8edff] flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <IconMapPin size={16} className="text-[#00288e] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-bold text-slate-900 group-hover:text-[#00288e]">
                                  {title}
                                </p>
                                {subtitle && (
                                  <p className="text-[11.5px] text-slate-500 truncate">
                                    {subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                            {stateBadge && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0 group-hover:bg-white group-hover:text-[#00288e]">
                                {stateBadge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Search Button — Official Professional Styling */}
              <button
                type="button"
                onClick={() => setIsVoiceOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl sm:rounded-full bg-primary text-on-primary font-bold text-[13.5px] shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <IconMicrophone size={16} stroke={1.75} />
                <span>Voice Search</span>
              </button>

              {/* Search Button */}
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-primary/40 bg-primary/10 text-primary font-semibold text-[14px] px-6 py-2.5 rounded-xl sm:rounded-full hover:bg-primary hover:text-on-primary hover:border-primary hover:shadow-[0_4px_14px_rgba(0,40,142,0.25)] active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <IconSearch size={16} stroke={1.75} />
                <span>Search</span>
              </button>
            </form>
          </div>

          <AIVoiceSearchModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />

          {/* Trust Pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { Icon: IconCircleCheck, label: 'Verified by Cooperative' },
              { Icon: IconShieldCheck, label: 'Secure Escrow Payments' },
              { Icon: IconBolt,        label: 'Instant Emergency Booking' },
            ].map(({ Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-surface-container-high border border-outline-variant text-on-surface text-[13px] font-semibold shadow-xs hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 hover:scale-105 transition-all duration-300 cursor-default"
              >
                <Icon size={18} stroke={1.75} className="text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>
        </section>

        {/* ── CATEGORY BENTO SECTION ── */}
        <section id="services" className="max-w-[1280px] mx-auto px-6 sm:px-8 py-14">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[12px] font-bold text-primary uppercase tracking-[0.12em] mb-1.5">What We Offer</p>
              <h2 className="text-[32px] sm:text-[36px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                Browse by Category
              </h2>
            </div>
            <Link to="/signup" className="hidden md:flex items-center gap-1.5 text-[14px] font-bold text-primary hover:opacity-80 transition-colors group">
              View all services <IconChevronRight size={15} stroke={2} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {/* Large image card */}
            <div className="col-span-2 row-span-2 group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-outline-variant/50 bg-surface cursor-pointer min-h-[320px] md:min-h-[380px] shadow-sm hover:shadow-[0_16px_48px_rgba(0,0,0,0.25)] transition-all duration-400">
              <img
                src={HERO_IMG}
                alt="Home Maintenance"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1c2e]/85 via-[#0d1c2e]/25 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 sm:p-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11.5px] font-semibold mb-2.5 border border-white/20">
                  <IconSparkles size={12} stroke={1.75} /> Most Popular
                </div>
                <h3 className="text-[22px] sm:text-[26px] font-bold text-white mb-1" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                  Home Maintenance
                </h3>
                <p className="text-[14px] text-white/80">Electricians, Plumbers, Carpenters &amp; Technicians</p>
              </div>
            </div>

            {/* 4 Small category cards */}
            {SMALL_CATS.map(({ Icon, label, sub }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-outline-variant/50 bg-surface-container-low cursor-pointer flex flex-col items-center justify-center gap-3 p-5 sm:p-6 aspect-square shadow-sm hover:shadow-[0_12px_36px_rgba(0,0,0,0.2)] hover:-translate-y-1.5 hover:border-primary/40 transition-all duration-300"
              >
                <div className="relative pointer-events-none">
                  <div className="absolute inset-0 -z-10 w-14 h-14 rounded-full bg-primary/15 blur-2xl group-hover:bg-primary/30 transition-all duration-300" />
                  <Icon size={42} stroke={1.25} className="text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <p className="text-[14px] font-bold text-on-surface text-center leading-tight group-hover:text-primary transition-colors">
                  {label}
                </p>
                <p className="text-[11.5px] text-on-surface-variant/70 text-center leading-tight">
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── MODERN SAAS STATS SECTION ── */}
        <section className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
          <div className="relative overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-low p-8 sm:p-12 shadow-[0_12px_36px_rgba(0,0,0,0.12)]">
            {/* Ambient Lighting Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/70">
              {STATS.map(({ key, label, Icon }, index) => (
                <div key={label} className={`flex flex-col items-center text-center group ${index > 0 ? 'sm:pl-6 pt-4 sm:pt-0' : ''}`}>
                  <div className="relative pointer-events-none mb-3.5">
                    <div className="absolute inset-0 -z-10 w-14 h-14 rounded-full bg-primary/15 blur-2xl group-hover:bg-primary/30 transition-all duration-300" />
                    <Icon size={34} stroke={1.25} className="text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  {stats ? (
                    <p className="text-[32px] sm:text-[38px] font-extrabold text-on-surface leading-none tracking-tight group-hover:text-primary transition-colors">
                      {fmtValue(key, stats[key])}
                    </p>
                  ) : (
                    <div className="h-10 w-24 rounded-lg bg-surface-container-high animate-pulse" />
                  )}
                  <p className="text-[13px] text-on-surface-variant mt-2 font-medium tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="relative overflow-hidden bg-surface-container-low py-20 border-y border-outline-variant/70">
          {/* Premium ambient glow — subtle, black-synced */}
          <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(184,196,255,0.07),transparent)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -z-10 w-[560px] h-[280px] bg-primary/10 blur-[110px] pointer-events-none rounded-full" />
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
            <div className="text-center mb-14">
              <p className="text-[12px] font-bold text-primary uppercase tracking-[0.12em] mb-2">Simple Process</p>
              <h2 className="text-[34px] sm:text-[38px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                How SahakarGig Works
              </h2>
              <p className="text-[16px] text-on-surface-variant mt-3 max-w-lg mx-auto">From search to service completion in four effortless steps.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {HOW.map(({ n, title, desc }, i) => (
                <div
                  key={n}
                  className="group relative bg-surface rounded-2xl sm:rounded-3xl border border-outline-variant/50 p-7 hover:shadow-[0_12px_36px_rgba(0,0,0,0.2)] hover:-translate-y-1.5 hover:border-primary/50 transition-all duration-300"
                >
                  <div className="relative pointer-events-none mb-5 w-fit">
                    <div className="absolute inset-0 -z-10 w-12 h-12 rounded-full bg-primary/15 blur-2xl group-hover:bg-primary/30 transition-all duration-300" />
                    <span className="text-[16px] font-black tracking-[-0.02em] text-primary inline-block group-hover:scale-110 transition-transform duration-300">{n}</span>
                  </div>
                  <h3 className="text-[17px] font-bold text-on-surface mb-2">{title}</h3>
                  <p className="text-[14px] text-on-surface-variant leading-relaxed">{desc}</p>
                  {i < 3 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-surface border border-outline-variant/60 items-center justify-center shadow-xs">
                      <IconChevronRight size={13} stroke={2} className="text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES / WHY US ── */}
        <section id="about" className="max-w-[1280px] mx-auto px-6 sm:px-8 py-20">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold text-primary uppercase tracking-[0.12em] mb-2">Why Choose Us</p>
            <h2 className="text-[34px] sm:text-[38px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              Built on Trust &amp; Community
            </h2>
            <p className="text-[16px] text-on-surface-variant mt-3 max-w-xl mx-auto">
              A cooperative-owned platform where every stakeholder wins.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-outline-variant/50 bg-surface-container-low p-8 hover:shadow-[0_16px_48px_rgba(0,0,0,0.25)] hover:-translate-y-2 hover:border-primary/40 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-44 h-44 bg-primary/5 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:bg-primary/15 transition-colors duration-400 pointer-events-none" />
                <div className="relative z-10">
                  <div className="relative pointer-events-none mb-6 w-fit">
                    <div className="absolute inset-0 -z-10 w-20 h-20 rounded-full bg-primary/15 blur-3xl group-hover:bg-primary/30 transition-all duration-300" />
                    <Icon size={44} stroke={1.25} className="text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="text-[19px] font-bold text-on-surface mb-3">{title}</h3>
                  <p className="text-[14.5px] text-on-surface-variant leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── POLISHED SAAS FOOTER (Full Width Corner-to-Corner) ── */}
      <footer className="w-full bg-surface border-t border-outline-variant mt-auto">
        <div className="w-full px-6 sm:px-10 lg:px-12 pt-12 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 mb-10 items-start">
            {/* Brand Column — aligned with left corner */}
            <div className="md:col-span-4 lg:col-span-4 space-y-3.5">
              <Link to="/" className="flex items-center gap-2.5 group w-fit">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center group-hover:scale-105 group-hover:shadow-[0_4px_12px_rgba(30,107,101,0.35)] transition-all duration-300">
                  <IconHeartHandshake size={18} stroke={1.5} className="text-on-primary-fixed" />
                </div>
                <span className="text-[20px] font-bold text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                  Sahakar<span className="text-primary">Gig</span>
                </span>
              </Link>
              <p className="text-[13.5px] text-on-surface-variant leading-relaxed max-w-sm">
                India's premier cooperative-owned gig marketplace connecting verified local service providers with households.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 border border-primary/25 text-[11.5px] font-semibold text-primary">
                <IconShieldCheck size={13} stroke={1.75} />
                <span>Ministry of Cooperation Aligned</span>
              </div>
            </div>

            {/* Links Columns — spread out reaching right corner */}
            <div className="md:col-span-8 lg:col-span-8 grid grid-cols-3 gap-6 sm:gap-10 lg:gap-16">
              <div>
                <h4 className="text-[12px] font-bold text-on-surface uppercase tracking-[0.1em] mb-4">Platform</h4>
                <ul className="space-y-2.5">
                  {[
                    ['#services', 'Find Services'],
                    ['/login', 'Book a Provider'],
                    ['/signup', 'Become a Provider'],
                    ['/signup', 'Emergency Booking']
                  ].map(([href, label]) => (
                    <li key={label}>
                      <Link to={href} className="text-[13.5px] text-on-surface-variant hover:text-primary transition-colors duration-200">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-on-surface uppercase tracking-[0.1em] mb-4">Organization</h4>
                <ul className="space-y-2.5">
                  {[
                    ['#about', 'About Us'],
                    ['#how', 'How it Works'],
                    ['/architecture', 'Architecture'],
                    ['/federation-signup', 'Federations']
                  ].map(([href, label]) => (
                    <li key={label}>
                      <Link to={href} className="text-[13.5px] text-on-surface-variant hover:text-primary transition-colors duration-200">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-on-surface uppercase tracking-[0.1em] mb-4">Legal &amp; Trust</h4>
                <ul className="space-y-2.5">
                  {['Privacy Policy', 'Terms of Service', 'Dispute Escrow', 'Support Center'].map((label) => (
                    <li key={label}>
                      <a href="#" className="text-[13.5px] text-on-surface-variant hover:text-primary transition-colors duration-200">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Row — corner-to-corner aligned */}
          <div className="border-t border-outline-variant pt-6 flex flex-col sm:flex-row justify-between items-center gap-3.5">
            <p className="text-[12.5px] text-on-surface-variant/70">
              © {new Date().getFullYear()} SahakarGig. Built for India's Cooperative Ecosystem.
            </p>
            <div className="flex items-center gap-4 text-[12.5px] text-on-surface-variant">
              <span className="hover:text-primary cursor-pointer transition-colors">National Cooperative Database (NCD)</span>
              <span>•</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Ministry of Cooperation</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}