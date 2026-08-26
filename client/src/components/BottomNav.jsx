import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

const items = [
  { key: 'home', label: 'Home', icon: 'home', to: '/household' },
  { key: 'search', label: 'Search', icon: 'search', to: '/household/bookings' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar_today', to: '/household/bookings' },
  { key: 'earnings', label: 'Earnings', icon: 'payments', to: '/household/invoice' },
];

export default function BottomNav({ active = 'home' }) {
  const { t } = useTranslation();
  return (
    <nav className="bottom-nav rounded-t-xl shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {items.map((it) => {
        const isActive = active === it.key;
        return (
          <NavLink
            key={it.key}
            to={it.to}
            className={`flex flex-col items-center justify-center rounded-lg p-2 font-label-sm text-[10px] leading-tight transition-colors active:bg-surface-container-high ${
              isActive
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name={it.icon} className="mb-1" />
            {t(it.label.toLowerCase())}
          </NavLink>
        );
      })}
    </nav>
  );
}
