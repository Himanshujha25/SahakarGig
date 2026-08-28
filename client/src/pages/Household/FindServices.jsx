import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import VerifiedBadge from "../../components/VerifiedBadge";
import { Search, SlidersHorizontal, Star, MapPin, Mic, MicOff } from "lucide-react";

const SKILLS = ["All", "Plumber", "Electrician", "Tutor", "Cook", "Cleaner", "Caregiver", "Driver", "Gardener"];

export default function FindServices() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState("");
  const [skill, setSkill]         = useState("All");
  const [isListening, setIsListening] = useState(false);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported on this browser. Try Chrome or Edge.");
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
    };

    recognition.start();
  };

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/providers");
        // Backend responds with { providers, total, page, pages }
        setProviders(Array.isArray(data) ? data : (data?.providers ?? []));
      } catch {
        setProviders([]);
      } finally { setLoading(false); }
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter(p => {
      const matchSkill = skill === "All" || (p.skills || []).some(s => s.toLowerCase().includes(skill.toLowerCase()));
      const matchQuery = !q ||
        (p.userId?.name || "").toLowerCase().includes(q) ||
        (p.skills || []).some(s => s.toLowerCase().includes(q));
      return matchSkill && matchQuery;
    });
  }, [providers, query, skill]);

  const verified = providers.filter(p => p.verified).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-10 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            Find Services
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Browse verified cooperative service providers near you.
          </p>
        </div>
        {!loading && (
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl badge-accepted text-[13px] font-bold">
              {providers.length} providers
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl badge-completed text-[13px] font-bold">
              {verified} verified
            </span>
          </div>
        )}
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" strokeWidth={2} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isListening ? "Listening... Speak now..." : "Search by name or skill..."}
            className={`h-10 w-full rounded-xl border bg-surface pl-9 pr-10 text-[14px] text-on-surface outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary ${
              isListening ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-outline-variant"
            }`}
          />
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
        <div className="flex gap-1 p-1 rounded-xl bg-surface-container-low border border-outline-variant/40 flex-wrap">
          {SKILLS.map(s => (
            <button key={s} onClick={() => setSkill(s)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                skill === s
                  ? "bg-surface text-primary shadow-sm border border-outline-variant/40"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Provider grid */}
      {loading ? (
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
            {query || skill !== "All" ? "Try a different search or filter." : "No providers registered yet."}
          </p>
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
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {(p.skills || []).slice(0, 4).map(s => (
                  <span key={s} className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[11px] font-semibold">{s}</span>
                ))}
              </div>

              {/* Rate + trust */}
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-2.5 border border-outline-variant/30">
                <div className="flex items-center gap-1.5 text-[13px] text-on-surface-variant">
                  <Star size={13} className="text-tertiary-container dark:text-tertiary" strokeWidth={2} />
                  <span className="font-semibold text-on-surface">{p.trustScore ?? "—"}</span>
                  <span>trust score</span>
                </div>
                <span className="text-[14px] font-bold text-on-surface">
                  ₹{p.hourlyRate ?? "—"}<span className="text-[11px] font-normal text-on-surface-variant">/hr</span>
                </span>
              </div>

              {/* Book button */}
              <Link to={`/household/book/${p._id}`}
                className="w-full h-10 flex items-center justify-center rounded-xl border border-outline-variant bg-surface text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:bg-primary-container hover:text-on-primary-container transition-all duration-200">
                Book Now
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
