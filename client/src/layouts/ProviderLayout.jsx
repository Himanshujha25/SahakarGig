import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import NotificationToasts from "../components/NotificationToasts";
import LangToggle from "../components/LangToggle";

const nav = [
  { key: "jobs", label: "Jobs", icon: "list_alt", to: "/provider" },
  { key: "earnings", label: "Earnings", icon: "payments", to: "/provider/earnings" },
  { key: "welfare", label: "Welfare", icon: "health_and_safety", to: "/provider/welfare" },
  { key: "profile", label: "Profile", icon: "person", to: "/provider/profile" },
];

export default function ProviderLayout() {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-4 py-3">
        <Link to="/provider" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-heading text-lg font-bold text-on-primary">
            S
          </div>
          <span className="font-heading text-lg font-bold text-on-surface">{t("appName")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-1 font-heading text-sm font-semibold text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {t("logout")}
          </button>
        </div>
      </header>

      <main className="flex-grow px-4 py-4">
        <div className="mx-auto max-w-container-max">
          <Outlet />
        </div>
      </main>

      <nav className="bottom-nav rounded-t-xl shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {nav.map((n) => (
          <NavLink
            key={n.key}
            to={n.to}
            end={n.to === "/provider"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center rounded-lg p-2 font-label-sm text-[10px] leading-tight transition-colors active:bg-surface-container-high ${
                isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined mb-1">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <NotificationToasts />
    </div>
  );
}
