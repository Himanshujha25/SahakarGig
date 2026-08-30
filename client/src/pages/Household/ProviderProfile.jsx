import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import TrustRing from "../../components/TrustRing";
import VerifiedBadge from "../../components/VerifiedBadge";
import Icon from "../../components/Icon";
import TrustSystemBadge from "../../components/TrustSystemBadge";
import FairWageBreakdown from "../../components/FairWageBreakdown";
import FavoriteButton from "../../components/FavoriteButton";

export default function ProviderProfile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favourite, setFavourite] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get(`/providers/${id}`)
      .then((res) => {
        if (active) setProvider(res.data);
      })
      .catch(() => {
        if (active) setProvider(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    // Check favourite state once provider id is known.
    api
      .get("/favorites/ids")
      .then(({ data }) => {
        if (active && Array.isArray(data) && data.some((x) => String(x) === String(id))) {
          setFavourite(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  const toggleFav = async () => {
    if (favBusy) return;
    setFavBusy(true);
    try {
      if (favourite) {
        await api.delete(`/favorites/${id}`);
        setFavourite(false);
      } else {
        await api.post(`/favorites/${id}`);
        setFavourite(true);
      }
    } catch {
      /* keep state unchanged on failure */
    } finally {
      setFavBusy(false);
    }
  };

  if (loading)
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="animate-pulse rounded-xl border border-outline-variant bg-surface p-6">
          <div className="mb-4 h-12 w-12 rounded-full bg-surface-variant"></div>
          <div className="mb-3 h-5 w-1/3 rounded bg-surface-variant"></div>
          <div className="h-4 w-2/3 rounded bg-surface-variant"></div>
        </div>
      </div>
    );
  if (!provider) return <p className="p-8 font-body-md text-on-surface-variant text-center">Provider not found.</p>;

  const providerReviews = provider.reviews || [];
  const completedJobs = (provider.bookings || []).filter((b) => b.status === "completed").length;
  const avgRating = providerReviews.length
    ? (providerReviews.reduce((s, r) => s + r.rating, 0) / providerReviews.length).toFixed(1)
    : 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-1 font-heading text-sm font-semibold text-primary hover:text-primary-container"
      >
        <Icon name="arrow_back" className=" text-[18px]" />
        Back
      </button>

      {/* Profile card */}
      <div className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-container font-heading text-2xl font-bold text-on-primary-container">
          {(provider.userId?.name || "?").charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-heading text-lg font-bold text-on-surface">{provider.userId?.name}</h1>
            {provider.verified && <VerifiedBadge size={19} />}
          </div>
          <p className="truncate font-body-md text-sm text-on-surface-variant">{provider.cooperativeId?.name}</p>
          <p className="mt-1 font-heading text-lg font-bold text-primary">₹{provider.hourlyRate}/hr</p>
        </div>
        <TrustRing score={provider.trustScore} size={48} />
        <FavoriteButton favourite={favourite} onToggle={toggleFav} size={20} />
      </div>

      {/* 5-Stage Institutional Trust Verification */}
      <div className="mt-4">
        <TrustSystemBadge
          providerName={provider.userId?.name}
          rating={avgRating}
          jobsCompleted={completedJobs}
          identityVerified={!!provider.verified}
          coopVerified={!!provider.verified}
          skillCertified={(provider.skills || []).length > 0}
          insuranceActive={false}
        />
      </div>

      {/* Transparent Fair Wage Engine Breakdown */}
      {provider.hourlyRate > 0 && (
        <div className="mt-4">
          <FairWageBreakdown customerPays={provider.hourlyRate} />
        </div>
      )}

      {/* Skills */}
      <div className="mt-4 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <h2 className="mb-3 font-heading text-base font-semibold text-on-surface">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {(provider.skills || []).map((s) => (
            <span key={s} className="rounded-full bg-surface-variant px-3 py-1 font-body-md text-sm font-medium text-on-surface-variant">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-4 rounded-xl border border-outline-variant bg-surface p-5 md:p-6">
        <h2 className="mb-3 font-heading text-base font-semibold text-on-surface">{t("rate")}</h2>
        {(provider.reviews || []).length === 0 ? (
          <p className="font-body-md text-sm text-on-surface-variant">No reviews yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {provider.reviews.map((r, i) => (
              <div key={i} className="border-b border-outline-variant/60 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="font-heading text-sm font-semibold text-on-surface">{r.createdBy?.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-0.5 font-heading text-sm font-semibold text-on-primary-container">
                    <Icon name="star" className=" text-[16px]" />
                    {r.rating}
                  </span>
                </div>
                <p className="mt-1 font-body-md text-sm text-on-surface-variant">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => navigate(`/household/book/${provider._id}`)} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-heading font-semibold text-on-primary transition-all hover:shadow-[0_4px_12px_rgba(0,40,142,0.18)]">
        <Icon name="event_available" className=" text-[20px]" />
        {t("book")}
      </button>
    </div>
  );
}