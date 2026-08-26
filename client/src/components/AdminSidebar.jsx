import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../lib/api";
import {
  LayoutDashboard, ShieldCheck, AlertTriangle, BarChart2,
  Trophy, Settings, LogOut, Handshake
} from "lucide-react";
import NotificationBell from "./NotificationBell";

const NAV = [
  { label: "Dashboard",     Icon: LayoutDashboard, to: "/admin",               end: true },
  { label: "Verifications", Icon: ShieldCheck,     to: "/admin/verifications", end: false },
  { label: "Disputes",      Icon: AlertTriangle,   to: "/admin/disputes",      end: false },
  { label: "Analytics",     Icon: BarChart2,       to: "/admin/commission",    end: false },
  { label: "Leaderboard",   Icon: Trophy,          to: "/admin/providers",     end: false },
];

const activeStyle = "bg-[#e8edff] text-[#00288e]";
const inactiveStyle = "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [coopName, setCoopName] = useState("");

  useEffect(() => {
    api.get("/admin/dashboard").then(({ data }) => {
      if (data?.cooperativeName) setCoopName(data.cooperativeName);
    }).catch(() => {});
  }, []);

  const initials = user?.name ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "CA";

  return (
    <aside className="hidden lg:flex flex-col h-screen w-[260px] fixed left-0 top-0 z-40 bg-surface-container-low border-r border-outline-variant/60">

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-outline-variant/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,40,142,0.25)]">
            <Handshake size={17} className="text-white" strokeWidth={2.5} />
          </div>
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

      {/* Nav label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.12em]">Navigation</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ label, Icon, to, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
                isActive ? activeStyle : inactiveStyle
              }`
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

      {/* Bottom section */}
      <div className="px-3 pb-4 pt-3 border-t border-outline-variant/40 space-y-0.5">
        <NavLink
          to="/admin/settings"
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
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00288e]" />}
            </>
          )}
        </NavLink>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold text-error hover:bg-error-container/30 transition-all duration-200"
        >
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
          <p className="text-[13px] font-bold text-on-surface truncate leading-none">{user?.name || "Admin"}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">{user?.email || "admin@coops.com"}</p>
        </div>
        <NotificationBell />
      </div>
    </aside>
  );
}
