import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SERVER_URL } from '../lib/config';
import {
  IconSearch, IconMapPin, IconCircleCheck, IconShieldCheck, IconBolt,
  IconSchool, IconSparkles, IconHeartbeat, IconLayoutGrid,
  IconArrowRight, IconUsers, IconCalendarCheck, IconStar, IconHeartHandshake, IconChevronRight,
  IconMicrophone, IconMenu2, IconX, IconBrandX, IconBrandInstagram, IconBrandLinkedin, IconBrandWhatsapp
} from '@tabler/icons-react';

import AIVoiceSearchModal from '../components/AIVoiceSearchModal';
import HeroVideoBackground from '../components/HeroVideoBackground';

const HERO_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ-dpYJMEXWGjKVWEtlFNYAPrFrGMUncXsN08msvogjefS62LwnCQ1bUeItkSrlQSZYpq5JrB8qKHNifnjbW0rHcNkbQY9x_gnoxQqWcWi-cqXBPtYQcopyEOxc1pQc4HyPUfW753FHhzpHa1Q7iqyfvjr5CMRSKmil9ODYutUqHafvNbhWSptBy9GXzM09Au9PHyKYYpeMrAayssGeRytpEpRtDvUHzfHKsko5gpP7qzGC8T3jA';

const SMALL_CATS = [
  { Icon: IconSchool,       label: 'Education & Tutoring', sub: 'Home tutors, Coaching' },
  { Icon: IconSparkles,      label: 'Cleaning Services',    sub: 'Deep clean, Laundry' },
  { Icon: IconHeartbeat,     label: 'Healthcare & Nursing', sub: 'Elder care, Attendants' },
  { Icon: IconLayoutGrid,    label: 'All Categories',       sub: '100+ Services' },
];

const STATS = [
  { key: 'providers',    label: 'Verified Workers',     Icon: IconUsers },
  { key: 'bookings',     label: 'Services Delivered',   Icon: IconCalendarCheck },
  { key: 'cooperatives', label: 'Registered Societies', Icon: IconHeartHandshake },
  { key: 'avgRating',    label: 'Community Rating',     Icon: IconStar },
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

const SOCIALS = [
  { Icon: IconBrandX, label: 'X (Twitter)' },
  { Icon: IconBrandInstagram, label: 'Instagram' },
  { Icon: IconBrandLinkedin, label: 'LinkedIn' },
  { Icon: IconBrandWhatsapp, label: 'WhatsApp' },
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
  const searchBarRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  
  // Suggestion Dropdown States
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState(DEFAULT_INDIAN_HUBS);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setShowServiceDropdown(false);
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      .catch(() => setStats({ providers: 150, bookings: 500, cooperatives: 12, avgRating: 4.9 }));
  }, []);

  function fmtValue(key, val) {
    if (key === 'avgRating') {
      const num = Number(val);
      return num > 0 ? `${num.toFixed(1)}★` : '4.9★';
    }
    const num = Number(val);
    if (!num || num <= 0) {
      if (key === 'providers') return '150+';
      if (key === 'bookings') return '500+';
      if (key === 'cooperatives') return '12+';
      return '100+';
    }
    if (num >= 100000) return `${(num / 100000).toFixed(1)} Lakh+`;
    return `${num.toLocaleString('en-IN')}+`;
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

          {/* Auth Buttons — desktop */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
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

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-outline-variant/70 bg-surface-container-low text-on-surface hover:text-primary hover:border-primary/40 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
          >
            {menuOpen ? <IconX size={20} stroke={1.75} /> : <IconMenu2 size={20} stroke={1.75} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div
          className={`md:hidden absolute top-full left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/70 shadow-2xl overflow-hidden transition-all duration-300 ${menuOpen ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-2 pointer-events-none"}`}
        >
          <nav className="flex flex-col px-5 py-4 gap-1">
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
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 rounded-xl text-[14.5px] font-semibold text-on-surface-variant hover:text-primary hover:bg-primary-container/60 transition-all duration-200"
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 rounded-xl text-[14.5px] font-semibold text-on-surface-variant hover:text-primary hover:bg-primary-container/60 transition-all duration-200"
                >
                  {label}
                </a>
              )
            ))}
            <div className="mt-2 pt-3 border-t border-outline-variant/60 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-[14px] font-bold text-on-surface-variant hover:text-primary hover:bg-primary-container/60 transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-[14px] font-bold bg-primary text-on-primary shadow-[0_2px_10px_rgba(30,107,101,0.25)] active:scale-[0.98] transition-all duration-200"
              >
                Get Started <IconArrowRight size={15} stroke={2} />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-grow">

        {/* ── HERO SECTION ── */}
        <section className="relative z-30 pt-16 pb-20 px-6 flex flex-col items-center text-center">
          {/* Dynamic 60fps Interactive Aurora Gradient & Node Mesh Background */}
          <HeroVideoBackground />

          {/* ── HERO FOREGROUND CONTENT (z-30) ── */}
          <div className="relative z-30 flex flex-col items-center max-w-4xl mx-auto">

          {/* Official Government Institutional Badge */}
          <div className="inline-flex flex-wrap justify-center text-center items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-surface/80 backdrop-blur-md border border-slate-200 dark:border-outline-variant text-slate-900 dark:text-on-surface text-[12px] font-bold tracking-tight shadow-sm hover:border-primary/40 transition-all duration-300 mb-6 cursor-default">
          
            <span className="font-extrabold text-primary">Ministry of Cooperation</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className="text-slate-600 dark:text-on-surface-variant">Government of India Initiative</span>
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
          <div ref={searchBarRef} className="relative w-full max-w-[800px] z-50 mb-6">
            <form
              onSubmit={handleSearch}
              className="w-full bg-white/90 dark:bg-[#131728]/90 backdrop-blur-2xl rounded-2xl sm:rounded-full p-2 sm:p-2 border border-slate-200/90 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-primary/40 dark:hover:border-primary/40 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2"
            >
              {/* Service Input & Autocomplete Dropdown */}
              <div className="relative w-full flex-1">
                <div className="flex items-center gap-2.5 px-3.5 py-1.5">
                  <IconSearch size={18} stroke={2} className="text-primary shrink-0" />
                  <input
                    type="text"
                    value={serviceQuery}
                    onFocus={() => { setShowServiceDropdown(true); setShowLocationDropdown(false); }}
                    onChange={(e) => { setServiceQuery(e.target.value); setShowServiceDropdown(true); }}
                    className="w-full bg-transparent border-none outline-none text-[14px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="What service do you need? (e.g. Electrician, Cook)"
                  />
                  {serviceQuery && (
                    <button
                      type="button"
                      onClick={() => setServiceQuery("")}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Service Suggestions Dropdown */}
                {showServiceDropdown && (
                  <div className="absolute top-full left-0 mt-3 w-full sm:w-[340px] bg-white/95 dark:bg-[#121626]/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden z-[100] text-left animate-in fade-in zoom-in-95 duration-150 max-h-[340px] overflow-y-auto">
                    <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span>Popular Cooperative Services</span>
                      <button
                        type="button"
                        onClick={() => setShowServiceDropdown(false)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold p-0.5 rounded transition"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      {filteredServices.map((srv) => (
                        <button
                          key={srv.label}
                          type="button"
                          onClick={() => {
                            setServiceQuery(srv.label);
                            setShowServiceDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-primary/10 dark:hover:bg-white/[0.08] active:bg-primary/15 flex items-center gap-3 transition-colors cursor-pointer group"
                        >
                          <span className="text-lg p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] group-hover:bg-white dark:group-hover:bg-white/10 shrink-0 transition-colors">{srv.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{srv.label}</p>
                            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">{srv.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Subtle Divider */}
              <div className="hidden sm:block w-[1px] h-7 bg-slate-200 dark:bg-white/10 shrink-0" />

              {/* Location Input & Indian Nominatim Geocoder Dropdown */}
              <div className="relative w-full flex-1">
                <div className="flex items-center gap-2.5 px-3.5 py-1.5">
                  <IconMapPin size={18} stroke={2} className="text-primary shrink-0" />
                  <input
                    type="text"
                    value={locationQuery}
                    onFocus={() => { setShowLocationDropdown(true); setShowServiceDropdown(false); }}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setShowLocationDropdown(true);
                      searchIndianLocations(e.target.value);
                    }}
                    className="w-full bg-transparent border-none outline-none text-[14px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="City, Locality or Pincode in India"
                  />
                  {locationQuery && (
                    <button
                      type="button"
                      onClick={() => setLocationQuery("")}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Location Suggestions Dropdown */}
                {showLocationDropdown && (
                  <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-3 w-full sm:w-[440px] bg-white/95 dark:bg-[#121626]/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden z-[100] text-left animate-in fade-in zoom-in-95 duration-150 max-h-[380px] overflow-y-auto">
                    {/* GPS Auto-Detect Button */}
                    <div className="p-2.5 bg-primary/5 dark:bg-primary/10 border-b border-slate-100 dark:border-white/5">
                      <button
                        type="button"
                        onClick={detectCurrentLocation}
                        disabled={isLocating}
                        className="w-full px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-[12.5px] font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer shadow-xs disabled:opacity-60"
                      >
                        <IconMapPin size={15} className={isLocating ? "animate-spin" : ""} />
                        <span>{isLocating ? "Detecting GPS in India..." : "Use My Current GPS Location"}</span>
                      </button>
                    </div>

                    <div className="px-4 py-2 bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <span>{isLoadingLocations ? "Searching Indian Geocoder..." : "Verified Localities & Cities in India"}</span>
                      <button
                        type="button"
                        onClick={() => setShowLocationDropdown(false)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold p-0.5 rounded transition"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-1.5 space-y-0.5">
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
                            className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-primary/10 dark:hover:bg-white/[0.08] active:bg-primary/15 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                <IconMapPin size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                                  {title}
                                </p>
                                {subtitle && (
                                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                            {stateBadge && (
                              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5 shrink-0 group-hover:text-primary group-hover:border-primary/30 transition-colors">
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

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setIsVoiceOpen(true)}
                  title="AI Voice Search"
                  className="h-10 px-3.5 rounded-xl sm:rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0"
                >
                  <IconMicrophone size={16} className="text-primary" />
                  <span className="hidden sm:inline">Voice</span>
                </button>

                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl sm:rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition active:scale-95 cursor-pointer shrink-0"
                >
                  <IconSearch size={15} stroke={2} />
                  <span>Search</span>
                </button>
              </div>
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
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[12px] font-bold text-primary uppercase tracking-[0.12em] mb-1.5">What We Offer</p>
              <h2 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-on-surface" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                Browse by Category
              </h2>
            </div>
            <Link to="/signup" className="hidden md:flex items-center gap-1.5 text-[14px] font-bold text-primary hover:opacity-80 transition-colors group whitespace-nowrap shrink-0">
              View all services <IconChevronRight size={15} stroke={2} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {/* Large image card */}
            <div className="sm:col-span-2 sm:row-span-2 group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-outline-variant/50 bg-surface cursor-pointer min-h-[260px] sm:min-h-[320px] md:min-h-[380px] shadow-sm hover:shadow-[0_16px_48px_rgba(0,0,0,0.25)] transition-all duration-400">
              <img
                src={HERO_IMG}
                alt="Home Maintenance"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d1c2e]/85 via-[#0d1c2e]/25 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5 sm:p-8">
                <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10.5px] sm:text-[11.5px] font-semibold mb-2 sm:mb-2.5 border border-white/20">
                  <IconSparkles size={12} stroke={1.75} /> Most Popular
                </div>
                <h3 className="text-[20px] sm:text-[26px] font-bold text-white mb-0.5 sm:mb-1" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                  Home Maintenance
                </h3>
                <p className="text-[12.5px] sm:text-[14px] text-white/80">Electricians, Plumbers, Carpenters &amp; Technicians</p>
              </div>
            </div>

            {/* 4 Small category cards */}
            {SMALL_CATS.map(({ Icon, label, sub }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-outline-variant/50 bg-surface-container-low cursor-pointer flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 min-h-[150px] sm:min-h-[180px] shadow-sm hover:shadow-[0_12px_36px_rgba(0,0,0,0.2)] hover:-translate-y-1.5 hover:border-primary/40 transition-all duration-300"
              >
                <div className="relative pointer-events-none mb-1">
                  <div className="absolute inset-0 -z-10 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-primary/15 blur-2xl group-hover:bg-primary/30 transition-all duration-300" />
                  <Icon size={38} stroke={1.25} className="w-8 h-8 sm:w-11 sm:h-11 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <p className="text-[13px] sm:text-[14px] font-bold text-on-surface text-center leading-tight group-hover:text-primary transition-colors">
                  {label}
                </p>
                <p className="text-[11px] sm:text-[11.5px] text-on-surface-variant/70 text-center leading-snug">
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

            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8">
              {STATS.map(({ key, label, Icon }, index) => (
                <div
                  key={label}
                  className={`flex flex-col items-center text-center group ${index >= 2 ? 'mt-2 sm:mt-0' : ''} ${index % 2 === 0 ? '' : 'sm:pl-6'}`}
                >
                  <div className="relative pointer-events-none mb-2.5 sm:mb-3.5">
                    <div className="absolute inset-0 -z-10 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-primary/15 blur-2xl group-hover:bg-primary/30 transition-all duration-300" />
                    <Icon size={34} stroke={1.25} className="w-7 h-7 sm:w-9 sm:h-9 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  {stats ? (
                    <p className="text-[28px] sm:text-[38px] font-extrabold text-on-surface leading-none tracking-tight group-hover:text-primary transition-colors">
                      {fmtValue(key, stats[key])}
                    </p>
                  ) : (
                    <div className="h-9 sm:h-10 w-20 sm:w-24 rounded-lg bg-surface-container-high animate-pulse" />
                  )}
                  <p className="text-[12px] sm:text-[13px] text-on-surface-variant mt-1.5 sm:mt-2 font-medium tracking-wide">{label}</p>
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
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-outline-variant/50 bg-surface-container-low p-6 sm:p-8 hover:shadow-[0_16px_48px_rgba(0,0,0,0.25)] hover:-translate-y-2 hover:border-primary/40 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-44 h-44 bg-primary/5 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:bg-primary/15 transition-colors duration-400 pointer-events-none" />
                <div className="relative z-10">
                  <div className="relative pointer-events-none mb-5 flex items-center gap-3.5">
                    <div className="relative pointer-events-none">
                      <div className="absolute inset-0 -z-10 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/15 blur-3xl group-hover:bg-primary/30 transition-all duration-300" />
                      <Icon size={40} stroke={1.25} className="w-8 h-8 sm:w-10 sm:h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h3 className="text-[16px] sm:text-[19px] font-bold text-on-surface leading-snug shrink">{title}</h3>
                  </div>
                  <p className="text-[13.5px] sm:text-[14.5px] text-on-surface-variant leading-relaxed">{desc}</p>
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
              <div className="flex items-center gap-2 pt-1">
                {SOCIALS.map(({ Icon, label }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className="w-8 h-8 rounded-lg border border-outline-variant/70 bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <Icon size={15} stroke={1.5} />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns — 2-col mobile, 3-col desktop */}
            <div className="md:col-span-8 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-x-6 sm:gap-x-10 lg:gap-x-16 gap-y-8 sm:gap-y-0">
              <div>
                <h4 className="text-[12px] font-bold text-on-surface uppercase tracking-[0.1em] mb-4">Platform</h4>
                <ul className="space-y-3">
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
                <ul className="space-y-3">
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

              <div className="col-span-2 sm:col-span-1 mt-0">
                <h4 className="text-[12px] font-bold text-on-surface uppercase tracking-[0.1em] mb-4">Legal &amp; Trust</h4>
                <ul className="space-y-3">
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
          <div className="h-px w-full bg-gradient-to-r from-transparent via-outline-variant to-transparent mb-6" />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3.5">
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