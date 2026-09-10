import { useEffect, useRef, useState } from "react";
import { Link, Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import LangToggle from "../components/LangToggle";
import AdminSidebar from "../components/AdminSidebar";
import api from "../lib/api";
import socket from "../lib/socket";
import {
  LayoutDashboard, ShieldCheck, AlertTriangle, BarChart2,
  Settings, LogOut, Handshake, Users, IndianRupee,
  Megaphone, Building2, HeartHandshake, X, MapPin
} from "lucide-react";

const NAV = [
  { label: "Dashboard",              Icon: LayoutDashboard, to: "/admin",               end: true },
  { label: "Bulk Crew RFPs",         Icon: Building2,       to: "/admin/rfp",           end: false },
  { label: "Members & Workforce",    Icon: Users,           to: "/admin/providers",     end: false },
  { label: "Verifications",          Icon: ShieldCheck,     to: "/admin/verifications", end: false },
  { label: "Earnings & Payouts",     Icon: IndianRupee,     to: "/admin/financials",    end: false },
  { label: "Notice Board",           Icon: Megaphone,       to: "/admin/notices",       end: false },
  { label: "Welfare & Schemes",      Icon: HeartHandshake,  to: "/admin/welfare",       end: false },
  { label: "Disputes",               Icon: AlertTriangle,   to: "/admin/disputes",      end: false },
  { label: "Performance",            Icon: BarChart2,       to: "/admin/commission",    end: false },
];

const activeStyle   = "bg-primary text-on-primary shadow-[0_4px_14px_rgba(0,40,142,0.3)]";
const inactiveStyle = "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [coopName, setCoopName] = useState("");
  const closeTimer = useRef(null);

  const [liveAvatar, setLiveAvatar] = useState(() => {
    return (
      user?.avatarUrl ||
      user?.avatar ||
      user?.profileImage ||
      localStorage.getItem("sg_admin_avatar") ||
      localStorage.getItem("sg_coop_avatar") ||
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
        localStorage.getItem("sg_admin_avatar") ||
        localStorage.getItem("sg_coop_avatar") ||
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

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "CA";

  useEffect(() => {
    if (!socket.connected) socket.connect();
    api.get("/admin/dashboard").then(({ data }) => {
      if (data?.cooperativeName) setCoopName(data.cooperativeName);
    }).catch(() => {});
  }, []);

  // Close drawer on route change + lock body scroll while open
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  function signOut() { logout(); navigate("/login"); }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop Sidebar ── */}
      <AdminSidebar />

      {/* ── Mobile Top Bar (Exact same design and placement as Household & Provider) ── */}
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
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center shadow-[0_2px_8px_rgba(0,40,142,0.25)]">
            <Handshake size={14} className="text-on-primary-fixed" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-on-surface tracking-tight" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
            SahakarGig Admin
          </span>
        </Link>

        {/* Right: Header Actions */}
        <div className="flex items-center gap-1.5">
          <LangToggle />
          <NotificationBell />
          <button onClick={signOut} className="w-10 h-10 flex items-center justify-center rounded-xl text-error hover:bg-error-container/30 transition-colors cursor-pointer" aria-label="Sign out">
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── Mobile Slide-in Drawer (Exact same design as Household & Provider) ── */}
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
                      alt={coopName || user?.name || "Cooperative"}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-on-primary/30 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-on-primary/20 flex items-center justify-center text-[13px] font-bold ring-1 ring-on-primary/30 shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold truncate leading-tight">{coopName || user?.name || "Cooperative Admin"}</p>
                    <p className="text-[11px] text-on-primary/80 truncate">{user?.email || "Central Society Desk"}</p>
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
              <NavLink
                to="/admin/settings"
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
            <div className="px-3 pb-5 pt-3 border-t border-outline-variant/40 space-y-1">
              <button onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-semibold text-error hover:bg-error-container/30 transition-all duration-200 cursor-pointer">
                <LogOut size={18} strokeWidth={2} />
                <span>Sign Out</span>
              </button>
              <div className="flex items-center gap-2 px-3 pt-1 text-[11px] text-on-surface-variant/70">
                <MapPin size={12} className="text-primary" />
                <span>Cooperative Federation Node</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Canvas ── */}
      <main className="flex-1 lg:ml-[260px] min-h-screen bg-background pt-14 lg:pt-0 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
