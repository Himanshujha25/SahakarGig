import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import NotificationBell from '../components/NotificationBell';
import socket from '../lib/socket';

const NAV = [
  { to: '/federation', icon: 'dashboard', label: 'Dashboard', end: true },
  { to: '/federation/cooperatives', icon: 'corporate_fare', label: 'Cooperatives' },
  { to: '/federation/earnings', icon: 'payments', label: 'Earnings & Payouts' },
];

export default function FederationLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    socket.connect();
    return () => { socket.disconnect(); };
  }, []);

  function signOut() { logout(); navigate('/login'); }

  const Sidebar = () => (
    <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-[260px] bg-surface-container-low border-r border-outline-variant z-40">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-outline-variant">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Icon name="account_balance" className="text-white text-[20px]" />
        </div>
        <div>
          <p className="font-heading text-sm font-bold text-primary leading-tight">SahakarGig</p>
          <p className="text-[11px] text-on-surface-variant font-medium">Federation Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Navigation</p>
        {NAV.map(({ to, icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-[#e8edff] text-[#00288e]'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={icon} className="text-[20px]" />
                <span className="flex-1">{label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3 border-t border-outline-variant pt-3 space-y-1">
        <NavLink to="/federation/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-[#e8edff] text-[#00288e]'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name="settings" className="text-[20px]" />
              <span className="flex-1">Settings</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />}
            </>
          )}
        </NavLink>

        <button onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-error hover:bg-error-container transition-colors">
          <Icon name="logout" className="text-[20px]" />
          Sign Out
        </button>
        <div className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() || "F"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-on-surface truncate">{user?.name || "Neeta Joshi"}</p>
            <p className="text-[10px] text-on-surface-variant truncate">Federation Admin</p>
          </div>
          <NotificationBell />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex overflow-hidden">
      <Sidebar />

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="lg:hidden fixed inset-0 bg-black/40 z-50" />
      )}
      {mobileOpen && (
        <div className="lg:hidden fixed top-0 left-0 bottom-0 w-[260px] bg-surface-container-low z-50 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
            <p className="font-heading text-sm font-bold text-primary">Federation Portal</p>
            <button onClick={() => setMobileOpen(false)}><Icon name="close" /></button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map(({ to, icon, label, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                    isActive ? 'bg-[#e8edff] text-[#00288e]' : 'text-on-surface-variant hover:bg-surface-container'
                  }`
                }
              >
                <Icon name={icon} className="text-[20px]" />{label}
              </NavLink>
            ))}
          </nav>
          <div className="px-3 pb-4 border-t border-outline-variant pt-3">
            <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-error hover:bg-error-container">
              <Icon name="logout" className="text-[20px]" />Sign Out
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 lg:ml-[260px] h-screen overflow-y-auto bg-background pb-20 lg:pb-0">
        <header className="lg:hidden sticky top-0 z-30 bg-surface border-b border-outline-variant px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <Icon name="account_balance" className="text-[18px]" />
            </div>
            <span className="font-heading text-sm font-bold text-primary">Federation</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-2 text-on-surface-variant rounded-lg hover:bg-surface-variant/50">
            <Icon name="menu" />
          </button>
        </header>
        <div className="w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around bg-surface border-t border-outline-variant px-4 py-3 rounded-t-xl">
        {NAV.map(({ to, icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex flex-col items-center text-[10px] font-semibold ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
            }
          >
            <Icon name={icon} /><span className="mt-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      <NotificationBell />
    </div>
  );
}
