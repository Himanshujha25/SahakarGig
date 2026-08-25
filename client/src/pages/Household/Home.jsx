import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import TrustRing from "../../components/TrustRing";
import VerifiedBadge from "../../components/VerifiedBadge";

const categories = [
  {
    key: "education",
    title: "Education & Tutoring",
    icon: "school",
    tile: "bg-primary-container text-on-primary-container",
    to: "/household/bookings",
  },
  {
    key: "cleaning",
    title: "Cleaning Services",
    icon: "cleaning_services",
    tile: "bg-secondary-container text-on-secondary-container",
    to: "/household/bookings",
  },
  {
    key: "care",
    title: "Caregiving",
    icon: "health_and_safety",
    tile: "bg-tertiary-container text-on-tertiary-container",
    to: "/household/bookings",
  },
  {
    key: "all",
    title: "View All",
    icon: "more_horiz",
    tile: "bg-surface-tint text-on-primary",
    to: "/household/bookings",
  },
];

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get("/providers")
      .then((res) => {
        if (active) setProviders((res.data || []).slice(0, 5));
      })
      .catch(() => {
        if (active) setProviders([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const goSearch = (e) => {
    e.preventDefault();
    navigate(`/household/bookings?service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`);
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center px-gutter pb-24 pt-xl text-center">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-container-low to-surface opacity-50" />
        <h1 className="mb-md max-w-4xl text-headline-lg-mobile text-on-background md:text-display-lg">
          Find Trusted <span className="text-primary">Cooperative</span> Services
        </h1>
        <p className="mb-xl max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
          Connect directly with verified local professionals backed by your community cooperative. Reliable, safe, and empowering for everyone.
        </p>

        <form
          onSubmit={goSearch}
          className="flex w-full max-w-3xl flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-2 shadow-lg sm:flex-row"
        >
          <div className="flex flex-1 items-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 py-3">
            <span className="material-symbols-outlined mr-2 text-primary">search</span>
            <input
              className="w-full border-none bg-transparent font-body-md text-body-md text-on-surface outline-none placeholder:text-outline"
              placeholder="What service do you need? (e.g., Plumbing, Tutor)"
              value={service}
              onChange={(e) => setService(e.target.value)}
            />
          </div>
          <div className="flex flex-1 items-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 py-3">
            <span className="material-symbols-outlined mr-2 text-primary">location_on</span>
            <input
              className="w-full border-none bg-transparent font-body-md text-body-md text-on-surface outline-none placeholder:text-outline"
              placeholder="Your Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 font-label-sm text-label-sm text-on-primary transition-colors hover:bg-on-primary-fixed-variant"
          >
            Search
          </button>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-4 text-on-surface-variant">
          <span className="flex items-center gap-1 font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[18px] text-secondary">verified</span> Verified by Cooperative
          </span>
          <span className="flex items-center gap-1 font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[18px] text-secondary">gpp_good</span> Secure Payments
          </span>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="px-gutter py-xl">
        <h2 className="mb-lg font-headline-lg text-headline-lg text-on-background">Browse by Category</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-lg">
          <div className="group relative col-span-2 row-span-2 h-64 cursor-pointer overflow-hidden rounded-xl border border-outline-variant bg-surface md:h-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-container to-surface-tint transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-on-background/80 via-on-background/20 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full p-lg">
              <h3 className="mb-1 font-headline-md text-headline-md text-surface-container-lowest">Home Maintenance</h3>
              <p className="font-body-md text-body-md text-surface-container-low opacity-90">Electricians, Plumbers, Carpenters</p>
            </div>
          </div>

          <Link
            to="/household/bookings"
            className="group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low p-md transition-shadow hover:bg-surface-container hover:shadow-lg"
          >
            <div className="mb-sm flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined">school</span>
            </div>
            <h3 className="text-center font-label-sm text-label-sm text-on-surface">Education &amp; Tutoring</h3>
          </Link>

          {categories.slice(1).map((c) => (
            <Link
              key={c.key}
              to={c.to}
              className="group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low p-md transition-shadow hover:bg-surface-container hover:shadow-lg"
            >
              <div className={`mb-sm flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${c.tile}`}>
                <span className="material-symbols-outlined">{c.icon}</span>
              </div>
              <h3 className="text-center font-label-sm text-label-sm text-on-surface">{c.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Verified providers near you */}
      <section className="px-gutter py-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-headline-lg text-headline-lg text-on-background">Verified Providers Near You</h2>
        </div>
        {loading ? (
          <p className="font-body-md text-on-surface-variant">Loading…</p>
        ) : providers.length === 0 ? (
          <p className="font-body-md text-on-surface-variant">No verified providers nearby.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {providers.map((p) => (
              <div key={p._id} className="card flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container font-heading text-lg font-bold text-on-primary-container">
                  {(p.userId?.name || "?").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-heading text-sm font-bold text-on-surface">{p.userId?.name}</p>
                    {p.verified && <VerifiedBadge />}
                  </div>
                  <p className="font-body-md text-sm text-on-surface-variant">
                    {(p.skills && p.skills[0]) || "Service"} · ₹{p.hourlyRate}/hr
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <TrustRing score={p.trustScore ?? 4.5} size={40} />
                  <Link
                    to={`/household/book/${p._id}`}
                    className="rounded-lg bg-primary px-4 py-1.5 font-heading text-xs font-semibold text-on-primary"
                  >
                    {t("book")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
