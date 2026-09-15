import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, User, CalendarDays, Wallet, LogOut, Settings, Wrench } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

const CATEGORIES = ["Electrician", "Plumber", "Cook", "Cleaner", "Tutor", "Caregiver", "Driver", "Gardener", "Carpenter", "Painter"];

/* Household top header — pixel-matched to the approved AI mock:
   48px borderless search + ⌘K with live suggestions, bare bell,
   bordered circle theme toggle, avatar with hover account dropdown. */
export default function HouseholdTopbar({ onVoice }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [provCache, setProvCache] = useState([]);
  const [dropOpen, setDropOpen] = useState(false);
  const searchRef = useRef(null);
  const blurTimer = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  async function ensureProviders() {
    if (provCache.length) return;
    try {
      const { data } = await api.get("/providers");
      const list = Array.isArray(data) ? data : (data?.providers ?? []);
      setProvCache(list.slice(0, 60));
    } catch { /* offline — categories still suggest */ }
  }

  function submit(e, forced) {
    e?.preventDefault();
    const q = (forced ?? query).trim();
    setFocused(false);
    navigate(`/household/find${q ? `?query=${encodeURIComponent(q)}` : ""}`);
  }

  const q = query.trim().toLowerCase();
  const catSugs = q ? CATEGORIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 4) : CATEGORIES.slice(0, 4);
  const provSugs = q
    ? provCache.filter((p) => {
        const name = (p.userId?.name || "").toLowerCase();
        const skills = (p.skills || []).join(" ").toLowerCase();
        return name.includes(q) || skills.includes(q);
      }).slice(0, 4)
    : [];
  const showSugs = focused && (catSugs.length > 0 || provSugs.length > 0);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "NK";

  function signOut() {
    setDropOpen(false);
    logout();
    navigate("/login");
  }

  return (
    <div className="flex items-center gap-4">
      {/* Search with live suggestions */}
      <div className="relative flex-1 min-w-0">
        <form onSubmit={submit} className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5b6484] pointer-events-none" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { setFocused(true); ensureProviders(); }}
            onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 150); }}
            placeholder="Search bookings, providers, services…"
            className="input !h-12 !rounded-xl !pl-11 !pr-14 !text-[13.5px] !border-transparent !bg-surface-container-lowest hover:!border-primary/30 focus:!border-primary/50"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-on-surface-variant bg-surface-container-high rounded-md px-1.5 py-0.5 border border-outline-variant">⌘ K</kbd>
        </form>

        {showSugs && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-outline-variant bg-surface-container-low shadow-2xl overflow-hidden z-50 animate-dropdown-in">
            {catSugs.length > 0 && (
              <div className="p-2">
                <p className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant">Services</p>
                {catSugs.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => submit(null, c)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0"><Wrench size={15} /></span>
                    <span className="text-[13.5px] font-semibold text-on-surface">{c}</span>
                  </button>
                ))}
              </div>
            )}
            {provSugs.length > 0 && (
              <div className="p-2 border-t border-outline-variant/60">
                <p className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant">Providers</p>
                {provSugs.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setFocused(false); navigate(`/household/book/${p._id}`); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-lg bg-primary-container text-primary flex items-center justify-center text-[13px] font-bold shrink-0">
                      {(p.userId?.name || "?").charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-on-surface truncate">{p.userId?.name || "Provider"}</span>
                      <span className="block text-[11.5px] text-on-surface-variant truncate">{(p.skills || []).slice(0, 2).join(" · ")} · ₹{p.hourlyRate || 250}/hr</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bell — bare grey icon with live dot, vertically centered in 48px slot */}
      <div className="shrink-0 hidden sm:flex items-center justify-center h-12 w-8">
        <NotificationBell />
      </div>

      {/* Theme — bordered circle, amber sun */}
      <div className="shrink-0 hidden sm:flex items-center justify-center h-12">
        <ThemeToggle className="!h-10 !w-10" />
      </div>

      {/* Profile + hover account dropdown */}
      <div
        className="relative hidden md:block shrink-0"
        onMouseEnter={() => setDropOpen(true)}
        onMouseLeave={() => setDropOpen(false)}
      >
        <div
          className="flex items-center gap-2.5 h-12 pr-1 rounded-xl hover:bg-surface-container-low transition-all cursor-pointer"
          onClick={() => { setDropOpen(false); navigate("/household/profile"); }}
          title="Open settings"
        >
          <div className="w-10 h-10 rounded-full bg-[#4d5b78] text-white flex items-center justify-center text-[13px] font-bold">
            {initials}
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-on-surface whitespace-nowrap">{user?.name || "Nitin Kumar"}</p>
            <p className="text-[11px] text-on-surface-variant">Member</p>
          </div>
          <ChevronDown size={15} className={`text-on-surface-variant transition-transform duration-200 ${dropOpen ? "rotate-180" : ""}`} />
        </div>

        {dropOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 rounded-2xl border border-outline-variant bg-surface-container-low shadow-2xl p-2 z-50 animate-dropdown-in">
            <div className="flex items-center gap-3 px-2.5 py-3 border-b border-outline-variant/60">
              <div className="w-11 h-11 rounded-full bg-[#4d5b78] text-white flex items-center justify-center text-[14px] font-bold shrink-0">{initials}</div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-on-surface truncate">{user?.name || "Nitin Kumar"}</p>
                <p className="text-[11.5px] text-on-surface-variant truncate">{user?.email || ""}</p>
                {user?.phone && <p className="text-[11.5px] text-on-surface-variant truncate">{user.phone}</p>}
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10.5px] font-bold">Household Member</span>
              </div>
            </div>
            <div className="p-1.5 space-y-0.5">
              <button onClick={() => { setDropOpen(false); navigate("/household/profile"); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold text-on-surface hover:bg-primary/10 transition-colors cursor-pointer">
                <Settings size={15} className="text-on-surface-variant" /> Profile Settings
              </button>
              <button onClick={() => { setDropOpen(false); navigate("/household/bookings"); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold text-on-surface hover:bg-primary/10 transition-colors cursor-pointer">
                <CalendarDays size={15} className="text-on-surface-variant" /> My Bookings
              </button>
              <button onClick={() => { setDropOpen(false); navigate("/household/wallet"); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold text-on-surface hover:bg-primary/10 transition-colors cursor-pointer">
                <Wallet size={15} className="text-on-surface-variant" /> Wallet
              </button>
              <button onClick={signOut} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold text-error hover:bg-error-container/30 transition-colors cursor-pointer">
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
