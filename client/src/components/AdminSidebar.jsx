import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../lib/api";
import socket from "../lib/socket";
import {
  LayoutDashboard, ShieldCheck, AlertTriangle, BarChart2,
  Trophy, Settings, LogOut, Handshake, Users, IndianRupee, Receipt,
  Megaphone, FileCheck2, Building2, HeartHandshake
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import LangToggle from "./LangToggle";

const NAV = [
  { label: "Dashboard",              Icon: LayoutDashboard, to: "/admin",               end: true },
  { label: "Bulk Crew RFPs",         Icon: Building2,       to: "/admin/rfp",           end: false },
  { label: "Members & Workforce",    Icon: Users,           to: "/admin/providers",     end: false },
  { label: "Skill Certifications",    Icon: FileCheck2,      to: "/admin/certifications",end: false },
  { label: "Verifications",          Icon: ShieldCheck,     to: "/admin/verifications", end: false },
  { label: "Earnings & Payouts",     Icon: IndianRupee,     to: "/admin/financials",    end: false },
  { label: "Notice Board",           Icon: Megaphone,       to: "/admin/notices",       end: false },
  { label: "Welfare & Schemes",      Icon: HeartHandshake,  to: "/admin/welfare",       end: false },
  { label: "Disputes",               Icon: AlertTriangle,   to: "/admin/disputes",      end: false },
  { label: "Performance",            Icon: BarChart2,       to: "/admin/commission",    end: false },
];

const activeStyle = "bg-[#e8edff] text-[#00288e]";
const inactiveStyle = "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [coopName, setCoopName] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [disputesCount, setDisputesCount] = useState(0);

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

  useEffect(() => {
    function loadStats() {
      api.get("/admin/dashboard").then(({ data }) => {
        if (data?.cooperativeName) setCoopName(data.cooperativeName);
        if (data?.pendingVerifications != null) setPendingCount(data.pendingVerifications);
        if (data?.activeDisputes != null) setDisputesCount(data.activeDisputes);
      }).catch(() => {});
    }
    loadStats();

    socket.on('notification', loadStats);
    socket.on('verification_update', loadStats);
    return () => {
      socket.off('notification', loadStats);
      socket.off('verification_update', loadStats);
    };
  }, []);

  const initials = user?.name ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "CA";

  return (
    <aside className="hidden lg:flex flex-col h-screen w-[260px] fixed left-0 top-0 z-40 bg-surface-container-low border-r border-outline-variant/60">

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-outline-variant/40">
        <div className="flex items-center gap-3">
          <img src="/icon-512.png" alt="SahakarGig Logo" className="w-9 h-9 rounded-xl object-contain shrink-0 shadow-[0_2px_8px_rgba(0,40,142,0.25)]" />
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-primary tracking-tight leading-none truncate" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
              SahakarGig
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5 truncate font-medium">
              {coopName ? coopName : "Admin Console"}
            </p>
          </div>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="px-4 py-3 border-b border-outline-variant/30">
        <LangToggle fullWidth align="left" />
      </div>

      {/* Nav label */}
      <div className="px-5 pt-4 pb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.12em]">Navigation</p>
        {pendingCount > 0 && (
          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
            {pendingCount}+ Audit Pending
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto no-scrollbar">
        {NAV.map(({ label, Icon, to, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-200 ${
                isActive ? activeStyle : inactiveStyle
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span>{label}</span>
                {label === "Verifications" && pendingCount > 0 ? (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500 text-white shadow-xs animate-pulse">
                    {pendingCount}+
                  </span>
                ) : label === "Disputes" && disputesCount > 0 ? (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10.5px] font-black bg-rose-500 text-white shadow-xs">
                    {disputesCount}+
                  </span>
                ) : isActive ? (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00288e]" />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-3 pt-2 border-t border-outline-variant/40 space-y-0.5">
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-200 ${
              isActive ? activeStyle : inactiveStyle
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
              <span>Settings</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00288e]" />}
            </>
          )}
        </NavLink>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-semibold text-error hover:bg-error-container/30 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={16} strokeWidth={2} className="shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* User card */}
      <div className="mx-3 mb-4 p-3 rounded-xl bg-surface-container border border-outline-variant/40 flex items-center gap-3">
        {liveAvatar ? (
          <img
            src={liveAvatar}
            alt={user?.name || "Admin"}
            className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-[13px] font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-on-surface truncate leading-none">{user?.name || "Admin"}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">{user?.email || "admin@coops.com"}</p>
        </div>
        <NotificationBell />
      </div>
    </aside>
  );
}
