import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import LangToggle from '../components/LangToggle';
import CoopMarqueeTicker from '../components/CoopMarqueeTicker';
import api from '../lib/api';
import { toast } from '../lib/toast';
import socket from '../lib/socket';
import { SERVER_URL } from '../lib/config';
import { triggerJobAlert, stopSiren, unlockAudio } from '../lib/alarmSound';
import {
  Briefcase, IndianRupee, ShieldCheck, User, LogOut, Handshake,
  Radio, Settings, Megaphone, GraduationCap, X, MapPin, Wrench,
  Siren, Zap, Volume2, VolumeX, ArrowRight, CheckCircle2, AlertTriangle,
  Clock
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

  // Global Emergency Broadcast Alert State (Accessible across all provider pages)
  const [activeAlertJob, setActiveAlertJob] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);

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
        const url = data.avatar.startsWith('http') ? data.avatar : `${SERVER_URL}${data.avatar}`;
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

  // ── Global Real-Time Emergency Socket Listener & Siren Engine ──
  useEffect(() => {
    if (!socket.connected) socket.connect();

    function onNewBroadcast(job) {
      if (!isMuted) {
        triggerJobAlert(job);
      }
      setActiveAlertJob(job);
      setTimeRemaining(60);
    }

    function onJobClaimed(payload) {
      if (activeAlertJob && (activeAlertJob._id === payload?.bookingId || activeAlertJob.bookingId === payload?.bookingId)) {
        stopSiren();
        setActiveAlertJob(null);
      }
    }

    function onJobCancelled(payload) {
      if (activeAlertJob && (activeAlertJob._id === payload?.bookingId || activeAlertJob.bookingId === payload?.bookingId)) {
        stopSiren();
        setActiveAlertJob(null);
      }
    }

    socket.on('booking:broadcast_new', onNewBroadcast);
    socket.on('booking:claimed', onJobClaimed);
    socket.on('booking:cancelled', onJobCancelled);

    return () => {
      socket.off('booking:broadcast_new', onNewBroadcast);
      socket.off('booking:claimed', onJobClaimed);
      socket.off('booking:cancelled', onJobCancelled);
      stopSiren();
    };
  }, [activeAlertJob, isMuted]);

  // Countdown timer for active broadcast alert
  useEffect(() => {
    if (!activeAlertJob) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          stopSiren();
          setActiveAlertJob(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAlertJob]);

  // Accept Broadcast Job directly from Global Modal
  async function handleAcceptBroadcastJob() {
    if (!activeAlertJob) return;
    setAccepting(true);
    stopSiren();

    const bookingId = activeAlertJob._id || activeAlertJob.bookingId;
    try {
      await api.post(`/bookings/${bookingId}/broadcast/accept`);
      setActiveAlertJob(null);
      navigate(`/provider/jobs/${bookingId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Job already claimed by another provider or expired.");
      setActiveAlertJob(null);
    } finally {
      setAccepting(false);
    }
  }

  function handleDismissAlert() {
    stopSiren();
    setActiveAlertJob(null);
  }

  function handleToggleMute() {
    if (!isMuted) {
      stopSiren();
      setIsMuted(true);
    } else {
      setIsMuted(false);
      if (activeAlertJob) triggerJobAlert(activeAlertJob);
    }
  }

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
    <div className="flex min-h-screen bg-background" onClick={() => unlockAudio()}>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col h-screen w-[260px] fixed left-0 top-0 z-40 bg-surface-container-low border-r border-outline-variant/60">
        
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <img src="/icon-512.png" alt="SahakarGig Logo" className="w-9 h-9 rounded-xl object-contain shrink-0 shadow-[0_2px_8px_rgba(0,40,142,0.25)]" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-primary tracking-tight leading-none truncate"
                style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
                SahakarGig
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5 truncate font-medium">Provider Portal</p>
            </div>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="px-4 py-3 border-b border-outline-variant/30">
          <LangToggle fullWidth align="left" />
        </div>

        {/* Section label */}
        <div className="px-5 pt-4 pb-2">
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
              `flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-200 ${
                isActive ? activeStyle : inactiveStyle
              }`
            }
          >
            <Settings size={16} strokeWidth={2} className="shrink-0" />
            <span>Settings</span>
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
                  alt={user?.name || "Provider"}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : null}
              <span className={liveAvatar ? "absolute inset-0 flex items-center justify-center -z-10" : ""}>
                {initials}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-on-surface truncate leading-tight">{user?.name || 'Verified Provider'}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{user?.phone || user?.email || 'Gig Worker'}</p>
            </div>
            <NotificationBell />
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-3.5 bg-surface/95 backdrop-blur border-b border-outline-variant/60">
        <button
          onClick={openDrawer}
          aria-label="Open menu"
          className="w-10 h-10 -ml-1.5 flex items-center justify-center rounded-xl text-on-surface hover:bg-surface-container transition-colors cursor-pointer active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 5.5h16" /><path d="M2 10h16" /><path d="M2 14.5h16" />
          </svg>
        </button>

        <Link to="/provider" className="flex items-center gap-2">
          <img src="/icon-512.png" alt="SahakarGig Logo" className="w-7 h-7 rounded-lg object-contain shrink-0 shadow-[0_2px_8px_rgba(0,40,142,0.25)]" />
          <span className="text-[15px] font-bold text-on-surface tracking-tight" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
            SahakarGig Provider
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <LangToggle />
          <NotificationBell />
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={closeDrawer} />
          <div className={`absolute left-0 top-0 bottom-0 w-[78%] max-w-[320px] bg-surface flex flex-col shadow-2xl ${drawerOpen ? 'animate-drawer-slide' : 'animate-drawer-close'}`}>
            <div className="bg-primary text-on-primary px-4 pt-5 pb-4 relative">
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-on-primary/20 flex items-center justify-center text-[13px] font-bold ring-2 ring-on-primary/30 shrink-0 overflow-hidden">
                    {liveAvatar ? (
                      <img src={liveAvatar} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : null}
                    <span>{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold truncate leading-tight">{user?.name || 'Verified Provider'}</p>
                    <p className="text-[11px] text-on-primary/80 truncate">{user?.phone || 'Gig Worker'}</p>
                  </div>
                </div>
                <button onClick={closeDrawer} className="w-9 h-9 rounded-full bg-on-primary/15 hover:bg-on-primary/25 flex items-center justify-center cursor-pointer shrink-0">
                  <X size={18} />
                </button>
              </div>
            </div>

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
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="p-3 border-t border-outline-variant/60 bg-surface-container-low">
              <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-error hover:bg-error-container/30 transition-colors cursor-pointer">
                <LogOut size={16} strokeWidth={2} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GLOBAL EMERGENCY DISPATCH POPUP (Loud Siren & One-Tap Accept on Any Screen) ── */}
      {activeAlertJob && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-scale-in">
          <div className="w-full max-w-md bg-surface border-2 border-rose-500/80 rounded-3xl shadow-[0_0_50px_rgba(225,29,72,0.4)] overflow-hidden space-y-0">
            {/* Pulsating Emergency Banner */}
            <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white p-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Siren size={20} className="animate-spin text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">Emergency Job Alert</h3>
                  <p className="text-[11px] text-white/90 font-medium">Broadcasted to Nearby Verified Workers</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleMute}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition cursor-pointer"
                  title={isMuted ? "Unmute Siren" : "Mute Siren"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  onClick={handleDismissAlert}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition cursor-pointer"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Job Details Card */}
            <div className="p-5 space-y-4 text-on-surface">
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant/60 pb-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {activeAlertJob.targetCategory || activeAlertJob.service || "Emergency Gig"}
                  </span>
                  <h2 className="text-lg font-black text-on-surface mt-1">{activeAlertJob.service || "Immediate Service Needed"}</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold">Guaranteed Payout</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">₹{activeAlertJob.price || 250}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-on-surface font-semibold">
                  <MapPin size={15} className="text-primary shrink-0" />
                  <span className="truncate">{activeAlertJob.locationText || "NCR Neighborhood"}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium pt-1 border-t border-outline-variant/30">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-amber-500" />
                    Auto-Cancels in: <strong className="text-rose-600 dark:text-rose-400 font-mono text-xs">{timeRemaining}s</strong>
                  </span>
                  <span className="text-primary font-bold">1st Acceptance Wins</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDismissAlert}
                  className="h-12 rounded-2xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface-variant transition active:scale-98 cursor-pointer"
                >
                  Decline Job
                </button>
                <button
                  type="button"
                  onClick={handleAcceptBroadcastJob}
                  disabled={accepting}
                  className="h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Zap size={16} className="fill-white" />
                  <span>{accepting ? "Locking Escrow..." : "ACCEPT JOB NOW"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Viewport Container ── */}
      <main className="flex-1 lg:ml-[260px] min-h-screen bg-background pt-14 lg:pt-0 overflow-y-auto">
        <CoopMarqueeTicker />
        <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
