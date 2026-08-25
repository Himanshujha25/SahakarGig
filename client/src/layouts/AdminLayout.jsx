import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import NotificationToasts from "../components/NotificationToasts";
import LangToggle from "../components/LangToggle";
import AdminSidebar from "../components/AdminSidebar";

const titles = {
  "/admin": "Dashboard",
  "/admin/verifications": "Verifications",
  "/admin/disputes": "Disputes",
  "/admin/providers": "Providers",
  "/admin/commission": "Commission",
};

export default function AdminLayout() {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = titles[pathname] || t("dashboard");

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary md:hidden">menu</span>
            <h1 className="font-headline-md text-headline-md text-on-surface">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
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
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-container-max">
            <Outlet />
          </div>
        </main>
      </div>
      <NotificationToasts />
    </div>
  );
}
