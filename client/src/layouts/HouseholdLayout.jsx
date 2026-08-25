import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import NotificationToasts from '../components/NotificationToasts';
import LangToggle from '../components/LangToggle';
import BottomNav from '../components/BottomNav';

export default function HouseholdLayout() {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const onSearch = (e) => {
    e.preventDefault();
    navigate('/household/bookings');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-50 flex w-full max-w-container-max items-center justify-between border-b border-outline-variant bg-surface px-gutter py-md mx-auto">
        <div className="flex items-center gap-lg">
          <Link to="/household" className="font-display-lg text-headline-md font-bold text-primary">
            SahakarGig
          </Link>
          <form
            onSubmit={onSearch}
            className="hidden items-center gap-sm rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 focus-within:border-primary md:flex"
          >
            <span className="material-symbols-outlined text-outline">search</span>
            <input
              className="w-48 border-none bg-transparent font-body-md text-body-md text-on-surface outline-none placeholder:text-outline"
              placeholder="Search services..."
            />
          </form>
        </div>

        <nav className="hidden items-center gap-lg md:flex">
          <NavItem to="/household" label="Find Services" />
          <NavItem to="/household/bookings" label="My Bookings" />
          <NavItem to="/household/bookings" label="Resources" />
          <NavItem to="/household/profile" label="Support" />
        </nav>

        <div className="flex items-center gap-sm">
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
          <Link
            to="/household/profile"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high transition-colors hover:bg-surface-variant"
            aria-label="Profile"
          >
            <span className="material-symbols-outlined text-on-surface">person</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow px-gutter py-md">
        <div className="mx-auto max-w-container-max">
          <Outlet />
        </div>
      </main>

      <BottomNav active="home" />
      <NotificationToasts />
    </div>
  );
}

function NavItem({ to, label }) {
  return (
    <Link
      to={to}
      className="font-label-sm text-label-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
    >
      {label}
    </Link>
  );
}
