import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("profile")}</h1>

      <div className="card flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container font-heading text-2xl font-bold text-on-primary-container">
          {(user?.name || "?").charAt(0)}
        </div>
        <div>
          <p className="font-headline-md text-headline-md text-on-surface">{user?.name}</p>
          <p className="font-body-md text-sm text-on-surface-variant">{user?.email}</p>
          <p className="font-body-md text-sm capitalize text-on-surface-variant">{user?.role}</p>
        </div>
      </div>

      <div className="stat-tile">
        <span className="font-heading text-sm font-semibold text-on-surface-variant">{t("name")}</span>
        <span className="font-heading text-lg font-bold text-on-surface">{user?.id || ""}</span>
      </div>

      <button onClick={handleLogout} className="btn-danger w-full">
        <span className="material-symbols-outlined mr-1 text-[18px]">logout</span>
        {t("logout")}
      </button>
    </div>
  );
}
