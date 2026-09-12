import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import LangToggle from '../components/LangToggle';
import socket from '../lib/socket';
import {
  LayoutDashboard, Building2, ShieldCheck, AlertTriangle,
  Megaphone, IndianRupee, BarChart2, Settings, LogOut,
  Handshake, X
} from 'lucide-react';

const NAV = [
  { to: '/federation', Icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/federation/cooperatives', Icon: Building2, label: 'Cooperatives', end: false },
  { to: '/federation/verifications', Icon: ShieldCheck, label: 'Verifications', end: false },
  { to: '/federation/disputes', Icon: AlertTriangle, label: 'Disputes', end: false },
  { to: '/federation/announcements', Icon: Megaphone, label: 'Announcements', end: false },
  { to: '/federation/earnings', Icon: IndianRupee, label: 'Earnings & Payouts', end: false },
  { to: '/federation/analytics', Icon: BarChart2, label: 'Market Analytics', end: false },
];

const activeStyle = "bg-primary text-on-primary shadow-[0_4px_14px_rgba(0,40,142,0.3)]";
const inactiveStyle = "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";

const desktopActive = "bg-[#e8edff] text-[#00288e]";
const desktopInactive = "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";

export default function FederationLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const closeTimer = useRef(null);

  const [liveAvatar, setLiveAvatar] = useState(() => {
    return (
      user?.avatarUrl ||
      user?.avatar ||
      user?.profileImage ||
      localStorage.getItem("sg_fed_avatar") ||
      localStorage.getItem("sg_federation_avatar") ||
      localStorage.getItem("sg_admin_avatar") ||
      localStorage.getItem("sg_avatar") ||
      ""
    );
  });

  useEffect(() => {
    function syncAvatar() {
      const av =
        user?.avatarUrl ||
        user?.avatar ||
        user?.profileImage ||
        localStorage.getItem("sg_fed_avatar") ||
        localStorage.getItem("sg_federation_avatar") ||
        localStorage.getItem("sg_admin_avatar") ||
        localStorage.getItem("sg_avatar") ||
        "";
      if (av) setLiveAvatar(av);
    }
    syncAvatar();
    window.addEventListener("storage", syncAvatar);
    return () => window.removeEventListener("storage", syncAvatar);
  }, [user]);

  function openDrawer() { setDrawerOpen(true); setDrawerClosing(false); }
  function closeDrawer() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDrawerClosing(true);
    closeTimer.current = setTimeout(() => {
      setDrawerOpen(false);
      setDrawerClosing(false);
    }, 240);
  }
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    return () => { socket.disconnect(); };
  }, []);

  // Close drawer on route change + lock body scroll while open
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  function signOut() { logout(); navigate('/login'); }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "FA";

  const Sidebar = () => (
    <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-[260px] bg-surface-container-low border-r border-outline-variant/60 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-outline-variant/40">
        <img src="/icon-512.png" alt="SahakarGig Logo" className="w-9 h-9 rounded-xl object-contain shrink-0 shadow-[0_2px_8px_rgba(0,40,142,0.25)]" />
        <div>
          <p className="text-[15px] font-bold text-primary tracking-tight leading-none" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            SahakarGig
          </p>
          <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Federation Apex Portal</p>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="px-4 py-3 border-b border-outline-variant/30">
        <LangToggle fullWidth align="left" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-bold tracking-widest text-on-surface-variant/50 uppercase">Governance &amp; Ops</p>
        {NAV.map(({ to, Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-200 ${
                isActive ? desktopActive : desktopInactive
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3 border-t border-outline-variant/40 pt-2 space-y-0.5">
        <NavLink
          to="/federation/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-200 ${
              isActive ? desktopActive : desktopInactive
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
              <span className="flex-1">Settings</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />}
            </>
          )}
        </NavLink>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold text-error hover:bg-error-container/30 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={16} strokeWidth={2} className="shrink-0" />
          <span>Sign Out</span>
        </button>

        {/* User Card */}
        <div className="mt-2 flex items-center gap-3 p-2.5 rounded-xl bg-surface-container border border-outline-variant/40">
          <div className="relative w-8 h-8 rounded-full shrink-0 overflow-hidden bg-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-primary/20">
            {liveAvatar ? (
              <img
                src={liveAvatar}
                alt={user?.name || "Federation Admin"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <span className={liveAvatar ? "absolute inset-0 flex items-center justify-center -z-10" : ""}>
              {initials}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-on-surface truncate leading-tight">{user?.name || "Federation Lead"}</p>
            <p className="text-[10px] text-on-surface-variant truncate">{user?.designation || user?.email || "Apex Authority"}</p>
          </div>
          <NotificationBell />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* ── Mobile Top Bar (Exact same layout & alignment across all portals) ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-3.5 bg-surface/95 backdrop-blur border-b border-outline-variant/60">
        {/* Left: Hamburger Button */}
        <button
          onClick={openDrawer}
          aria-label="Open menu"
          className="w-10 h-10 -ml-1.5 flex items-center justify-center rounded-xl text-on-surface hover:bg-surface-container transition-colors cursor-pointer active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 5.5h16" /><path d="M2 10h16" /><path d="M2 14.5h16" />
          </svg>
        </button>

        {/* Center: Brand */}
        <Link to="/federation" className="flex items-center gap-2">
          <img src="/icon-512.png" alt="SahakarGig Logo" className="w-7 h-7 rounded-lg object-contain shrink-0 shadow-[0_2px_8px_rgba(0,40,142,0.25)]" />
          <span className="text-[15px] font-bold text-on-surface tracking-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            SahakarGig Federation
          </span>
        </Link>

        {/* Right: Header Actions */}
        <div className="flex items-center gap-1.5">
          <LangToggle />
          <NotificationBell />
        </div>
      </header>

      {/* ── Mobile Slide-in Drawer ── */}
      {(drawerOpen || drawerClosing) && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/45 backdrop-blur-sm ${drawerOpen ? "animate-chat-backdrop" : "animate-chat-backdrop-out"}`}
            onClick={closeDrawer}
          />
          {/* Panel */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-[78%] max-w-[320px] bg-surface flex flex-col shadow-[8px_0_40px_rgba(0,0,0,0.25)] ${drawerOpen ? "animate-drawer-slide" : "animate-drawer-close"}`}
          >
            {/* Drawer Header */}
            <div className="bg-primary text-on-primary px-4 pt-5 pb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {liveAvatar ? (
                    <img
                      src={liveAvatar}
                      alt={user?.name || "Federation Lead"}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-on-primary/30 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-on-primary/20 flex items-center justify-center text-[13px] font-bold ring-1 ring-on-primary/30 shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold truncate leading-tight">{user?.name || "Federation Lead"}</p>
                    <p className="text-[11px] text-on-primary/80 truncate">{user?.designation || user?.email || "Apex Governance"}</p>
                  </div>
                </div>
                <button onClick={closeDrawer} className="w-9 h-9 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center cursor-pointer shrink-0" aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Nav Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 no-scrollbar">
              {NAV.map(({ to, Icon, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200 ${isActive ? activeStyle : inactiveStyle}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                      <span>{label}</span>
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-on-primary" />}
                    </>
                  )}
                </NavLink>
              ))}
              <NavLink
                to="/federation/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200 ${isActive ? activeStyle : inactiveStyle}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Settings size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                    <span>Settings</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-on-primary" />}
                  </>
                )}
              </NavLink>
            </nav>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-outline-variant/60 bg-surface-container-low">
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-error hover:bg-error-container/30 transition-colors cursor-pointer"
              >
                <LogOut size={16} strokeWidth={2} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Viewport Container ── */}
      <main className="flex-1 lg:ml-[260px] min-h-screen bg-background pt-14 lg:pt-0 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
