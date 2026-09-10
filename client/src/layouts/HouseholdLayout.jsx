import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import LangToggle from '../components/LangToggle';
import socket from '../lib/socket';
import { Home, CalendarDays, User, LogOut, Handshake, Search, Radar, Settings, Heart, Wallet, Building2, X, MapPin } from 'lucide-react';

const NAV = [
  { key: 'home',      label: 'Home',          Icon: Home,         to: '/household',          end: true  },
  { key: 'dispatch',  label: 'Dispatch',      Icon: Radar,        to: '/household/dispatch', end: false },
  { key: 'find',      label: 'Find',          Icon: Search,       to: '/household/find',     end: false },
  { key: 'bulkCrew',  label: 'Bulk Crew',     Icon: Building2,    to: '/household/bulk',     end: false },
  { key: 'bookings',  label: 'Bookings',      Icon: CalendarDays, to: '/household/bookings', end: false },
  { key: 'saved',     label: 'Saved',         Icon: Heart,        to: '/household/saved',    end: false },
  { key: 'wallet',    label: 'Wallet',        Icon: Wallet,       to: '/household/wallet',   end: false },
  { key: 'settings',  label: 'Settings',      Icon: Settings,     to: '/household/profile',  end: false },
];

const activeStyle   = 'bg-primary text-on-primary shadow-[0_4px_14px_rgba(30,107,101,0.3)]';
const inactiveStyle = 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface';

export default function HouseholdLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const closeTimer = useRef(null);

  const [liveAvatar, setLiveAvatar] = useState(() => {
    return user?.avatarUrl || user?.avatar || localStorage.getItem('sg_avatar') || null;
  });

  useEffect(() => {
    const local = user?.avatarUrl || user?.avatar || localStorage.getItem('sg_avatar') || null;
    if (local) setLiveAvatar(local);

    const onStorage = () => {
      const updated = localStorage.getItem('sg_avatar') || null;
      if (updated) setLiveAvatar(updated);
    };
    window.addEventListener('storage', onStorage);
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
    : 'HH';

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

  const currentLabel = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'Home';

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Desktop Sidebar (unchanged premium) ── */}
      <aside className="hidden lg:flex flex-col h-screen w-[260px] fixed left-0 top-0 z-40 bg-surface-container-low border-r border-outline-variant/60">
        <div className="px-5 pt-6 pb-5 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(30,107,101,0.3)]">
              <Handshake size={17} className="text-on-primary-fixed" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-primary tracking-tight leading-none truncate"
                style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>SahakarGig</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5 truncate font-medium">Household Portal</p>
            </div>
          </div>
        </div>

        {/* Language Switcher in Sidebar */}
        <div className="px-4 py-3 border-b border-outline-variant/30">
          <LangToggle fullWidth align="left" />
        </div>

        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.12em]">{t('navigation', 'Navigation')}</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto no-scrollbar">
          {NAV.slice(0, 7).map(({ key, label, Icon, to, end }) => (
            <NavLink key={label} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${isActive ? activeStyle : inactiveStyle}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span>{t(key, label)}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-on-primary" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 pt-3 border-t border-outline-variant/40 space-y-0.5">
          <NavLink to="/household/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${isActive ? activeStyle : inactiveStyle}`
            }
          >
            {({ isActive }) => (
              <>
                <Settings size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span>{t('settings', 'Settings')}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-on-primary" />}
              </>
            )}
          </NavLink>
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold text-error hover:bg-error-container/30 transition-all duration-200">
            <LogOut size={17} strokeWidth={2} className="shrink-0" />
            <span>{t('logout', 'Sign Out')}</span>
          </button>
        </div>

        <div className="mx-3 mb-4 p-3 rounded-xl bg-surface-container border border-outline-variant/40 flex items-center gap-3">
          {liveAvatar ? (
            <img src={liveAvatar} alt={user?.name || "Household"}
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-primary/20" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[13px] font-bold shrink-0">{initials}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-on-surface truncate leading-none">{user?.name || 'Household'}</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">{user?.email}</p>
          </div>
          <NotificationBell />
        </div>
      </aside>

      {/* ── Mobile Top Bar — Premium App Header ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-3.5 bg-surface/95 backdrop-blur border-b border-outline-variant/60">
        {/* Hamburger */}
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
        <Link to="/household" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center shadow-[0_2px_8px_rgba(30,107,101,0.3)]">
            <Handshake size={14} className="text-on-primary-fixed" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-on-surface tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>SahakarGig</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <LangToggle />
          <NotificationBell />
          <button onClick={signOut} className="w-10 h-10 flex items-center justify-center rounded-xl text-error hover:bg-error-container/30 transition-colors cursor-pointer" aria-label="Sign out">
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── Slide-in Drawer (Mobile) ── */}
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

            {/* Drawer header */}
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
                    <p className="text-[14px] font-bold truncate leading-tight">{user?.name || 'Household'}</p>
                    <p className="text-[11px] text-on-primary/80 truncate">{user?.email}</p>
                  </div>
                </div>
                <button onClick={closeDrawer} className="w-9 h-9 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center cursor-pointer shrink-0" aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer nav */}
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

            {/* Drawer footer */}
            <div className="px-3 pb-5 pt-3 border-t border-outline-variant/40 space-y-1">
              <button onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold text-error hover:bg-error-container/30 transition-all duration-200 cursor-pointer">
                <LogOut size={18} strokeWidth={2} />
                <span>Sign Out</span>
              </button>
              <div className="flex items-center gap-2 px-3 pt-1 text-[11px] text-on-surface-variant/70">
                <MapPin size={12} className="text-primary" />
                <span>New Delhi, India</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="flex-1 min-w-0 lg:ml-[260px] pt-14 lg:pt-0 pb-8 lg:pb-0 min-h-screen">
        <div className="w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
