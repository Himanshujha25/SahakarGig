import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import { Home, CalendarDays, User, LogOut, Handshake, Search } from 'lucide-react';

const NAV = [
  { label: 'Home',          Icon: Home,         to: '/household',       end: true  },
  { label: 'Find Services', Icon: Search,        to: '/household/find',  end: false },
  { label: 'My Bookings',   Icon: CalendarDays,  to: '/household/bookings', end: false },
  { label: 'Profile',       Icon: User,          to: '/household/profile',  end: false },
];

const activeStyle   = 'bg-[#e8edff] text-[#00288e]';
const inactiveStyle = 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface';

export default function HouseholdLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'HH';

  function signOut() { logout(); navigate('/login'); }

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col h-screen w-[260px] fixed left-0 top-0 z-40 bg-surface-container-low border-r border-outline-variant/60">

        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,40,142,0.25)]">
              <Handshake size={17} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-primary tracking-tight leading-none truncate"
                style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                SahakarGig
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5 truncate font-medium">Household Portal</p>
            </div>
          </div>
        </div>

        {/* Section label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.12em]">Navigation</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ label, Icon, to, end }) => (
            <NavLink key={label} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${isActive ? activeStyle : inactiveStyle}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  <span>{label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00288e]" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-4 pt-3 border-t border-outline-variant/40">
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold text-error hover:bg-error-container/30 transition-all duration-200">
            <LogOut size={17} strokeWidth={2} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* User card */}
        <div className="mx-3 mb-4 p-3 rounded-xl bg-surface-container border border-outline-variant/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[13px] font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-on-surface truncate leading-none">{user?.name || 'Household'}</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">{user?.email}</p>
          </div>
          <NotificationBell />
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-surface border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Handshake size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-primary" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>SahakarGig</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={signOut} className="text-[13px] font-semibold text-error flex items-center gap-1.5">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 lg:ml-[260px] pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-outline-variant/60 flex pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        {NAV.map(({ label, Icon, to, end }) => (
          <NavLink key={label} to={to} end={end} className="flex-1 flex flex-col items-center justify-center py-2 gap-1 min-h-[48px] active:scale-95 transition-transform">
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-[#00288e]' : 'text-on-surface-variant'} />
                <span className={`text-[11px] font-semibold ${isActive ? 'text-[#00288e]' : 'text-on-surface-variant'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  );
}
