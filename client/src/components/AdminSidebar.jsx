import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const nav = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", to: "/admin" },
  { key: "verifications", label: "Verifications", icon: "verified_user", to: "/admin/verifications" },
  { key: "disputes", label: "Disputes", icon: "gavel", to: "/admin/disputes" },
  { key: "providers", label: "Providers", icon: "engineering", to: "/admin/providers" },
  { key: "commission", label: "Commission", icon: "account_balance", to: "/admin/commission" },
];

export default function AdminSidebar() {
  const { user } = useAuth();

  return (
    <aside className="sidebar hidden flex-col md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-heading text-lg font-bold text-on-primary">
          S
        </div>
        <div>
          <p className="font-heading text-sm font-bold text-on-surface">SahakarGig</p>
          <p className="text-xs text-on-surface-variant">Coop Admin</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((n) => (
          <NavLink
            key={n.key}
            to={n.to}
            end={n.to === "/admin"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 font-heading text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-primary-fixed-dim text-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-lg bg-surface-container-low p-3">
        <p className="font-heading text-sm font-semibold text-on-surface">{user?.name || "Admin"}</p>
        <p className="truncate font-body-md text-xs text-on-surface-variant">{user?.email}</p>
      </div>
    </aside>
  );
}
