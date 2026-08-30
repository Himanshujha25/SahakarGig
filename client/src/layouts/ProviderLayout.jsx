import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import CoopMarqueeTicker from '../components/CoopMarqueeTicker';
import api from '../lib/api';
import socket from '../lib/socket';
import {
  Briefcase, IndianRupee, ShieldCheck, User, LogOut, Handshake,
  Radio, Settings, Megaphone, GraduationCap, X, MapPin, Wrench
} from 'lucide-react';

const NAV = [
  { label: 'Job Queue',          Icon: Briefcase,     to: '/provider',               end: true  },
  { label: 'Dispatch Feed',      Icon: Radio,         to: '/provider/dispatch',      end: false },
  { label: 'Announcements',      Icon: Megaphone,     to: '/provider/announcements',  end: false },
  { label: 'Earnings & Payouts', Icon: IndianRupee,   to: '/provider/earnings',      end: false },
  { label: 'Welfare Fund',       Icon: ShieldCheck,   to: '/provider/welfare',       end: false },
  { label: 'Skill Academy',      Icon: GraduationCap, to: '/provider/training',      end: false },
  { label: 'Settings',           Icon: Settings,      to: '/provider/profile',       end: false },
];

const activeStyle   = 'bg-primary text-on-primary shadow-[0_4px_14px_rgba(0,40,142,0.3)]';
const inactiveStyle = 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface';

export default function ProviderLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const closeTimer = useRef(null);

  const [liveAvatar, setLiveAvatar] = useState(() => {
    return user?.avatarUrl || user?.avatar || localStorage.getItem('sg_provider_avatar') || localStorage.getItem('sg_avatar') || null;
  });

  useEffect(() => {
    const local = user?.avatarUrl || user?.avatar || localStorage.getItem('sg_provider_avatar') || localStorage.getItem('sg_avatar') || null;
    if (local) setLiveAvatar(local);

    const onStorage = () => {
      const updated = localStorage.getItem('sg_provider_avatar') || localStorage.getItem('sg_avatar') || null;
      if (updated) setLiveAvatar(updated);
    };
    window.addEventListener('storage', onStorage);

    api.get('/providers/me').then(({ data }) => {
      if (data?.avatar) {
        const url = data.avatar.startsWith('http') ? data.avatar : `http://localhost:5000${data.avatar}`;
        setLiveAvatar(url);
        localStorage.setItem('sg_provider_avatar', url);
      }
    }).catch(() => {});

    return () => window.removeEventListener('storage', onStorage);
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

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'PV';

  useEffect(() => {
    if (!socket.connected) socket.connect();
  }, []);

  // Close drawer on route change + lock body scroll while open
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  function signOut() { logout(); navigate('/login'); }

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col h-screen w-[260px] fixed left-0 top-0 z-40 bg-surface-container-low border-r border-outline-variant/60">
        
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,40,142,0.25)]">
              <Handshake size={17} className="text-on-primary-fixed" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-primary tracking-tight leading-none truncate"
                style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                SahakarGig
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5 truncate font-medium">Provider Portal</p>
            </div>
          </div>
        </div>

        {/* Section label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.12em]">Navigation</p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto no-scrollbar">
          {NAV.slice(0, 6).map(({ label, Icon, to, end }) => (
            <NavLink key={label} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${isActive ? activeStyle : inactiveStyle}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span>{label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-on-primary" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section: Settings & Sign Out */}
        <div className="px-3 pb-4 pt-3 border-t border-outline-variant/40 space-y-0.5">
          <NavLink
            to="/provider/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
                isActive ? activeStyle : inactiveStyle
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span>Settings</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-on-primary" />}
              </>
            )}
          </NavLink>

          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold text-error hover:bg-error-container/30 transition-all duration-200 cursor-pointer">
            <LogOut size={17} strokeWidth={2} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* User Card */}
        <div className="mx-3 mb-4 p-3 rounded-xl bg-surface-container border border-outline-variant/40 flex items-center gap-3">
          {liveAvatar ? (
            <img
              src={liveAvatar}
              alt={user?.name || "Provider"}
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[13px] font-bold shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-on-surface truncate leading-none">{user?.name || 'Worker'}</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">{user?.email}</p>
          </div>
          <NotificationBell />
        </div>
      </aside>

      {/* ── Mobile Top Bar (Exact same design as Household) ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-3.5 bg-surface/95 backdrop-blur border-b border-outline-variant/60">
        {/* Hamburger Button */}
        <button
          onClick={openDrawer}
          aria-label="Open menu"
          className="w-10 h-10 -ml-1.5 flex items-center justify-center rounded-xl text-on-surface hover:bg-surface-container transition-colors cursor-pointer active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 5.5h16" /><path d="M2 10h16" /><path d="M2 14.5h16" />
          </svg>
        </button>

        {/* Brand */}
        <Link to="/provider" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center shadow-[0_2px_8px_rgba(0,40,142,0.25)]">
            <Handshake size={14} className="text-on-primary-fixed" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-on-surface tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            SahakarGig
          </span>
        </Link>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <button onClick={signOut} className="w-10 h-10 flex items-center justify-center rounded-xl text-error hover:bg-error-container/30 transition-colors cursor-pointer" aria-label="Sign out">
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── Mobile Slide-in Drawer (Exact same design & behavior as Household) ── */}
      {(drawerOpen || drawerClosing) && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/45 backdrop-blur-sm ${drawerOpen ? 'animate-chat-backdrop' : 'animate-chat-backdrop-out'}`}
            onClick={closeDrawer}
          />
          {/* Panel */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-[78%] max-w-[320px] bg-surface flex flex-col shadow-[8px_0_40px_rgba(0,0,0,0.25)] ${drawerOpen ? 'animate-drawer-slide' : 'animate-drawer-close'}`}
          >
            {/* Drawer Header */}
            <div className="bg-primary text-on-primary px-4 pt-5 pb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {liveAvatar ? (
                    <img src={liveAvatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-on-primary/30" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-on-primary/20 flex items-center justify-center text-[13px] font-bold ring-1 ring-on-primary/30">{initials}</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold truncate leading-tight">{user?.name || 'Worker'}</p>
                    <p className="text-[11px] text-on-primary/80 truncate">{user?.email}</p>
                  </div>
                </div>
                <button onClick={closeDrawer} className="w-9 h-9 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center cursor-pointer shrink-0" aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Nav Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 no-scrollbar">
              {NAV.map(({ label, Icon, to, end }) => (
                <NavLink key={label} to={to} end={end}
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
            </nav>

            {/* Drawer Footer */}
            <div className="px-3 pb-5 pt-3 border-t border-outline-variant/40 space-y-1">
              <button onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold text-error hover:bg-error-container/30 transition-all duration-200 cursor-pointer">
                <LogOut size={18} strokeWidth={2} />
                <span>Sign Out</span>
              </button>
              <div className="flex items-center gap-2 px-3 pt-1 text-[11px] text-on-surface-variant/70">
                <MapPin size={12} className="text-primary" />
                <span>Cooperative Worker Node</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Content ── */}
      <main className="flex-1 min-w-0 lg:ml-[260px] pt-14 lg:pt-0 pb-8 lg:pb-0 min-h-screen flex flex-col">
        <CoopMarqueeTicker />
        <div className="w-full max-w-7xl mx-auto flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
