import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import TrustRing from "../../components/TrustRing";
import VerifiedBadge from "../../components/VerifiedBadge";
import Icon from "../../components/Icon";
import TrustSystemBadge from "../../components/TrustSystemBadge";
import FairWageBreakdown from "../../components/FairWageBreakdown";

export default function ProviderProfile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

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
    return () => {
      active = false;
    };
  }, [id]);

  if (loading)
    return (
      <div className="mx-auto w-full max-w-2xl pt-lg">
        <div className="animate-pulse rounded-xl border border-outline-variant bg-surface p-6">
          <div className="mb-4 h-12 w-12 rounded-full bg-surface-variant"></div>
          <div className="mb-3 h-5 w-1/3 rounded bg-surface-variant"></div>
          <div className="h-4 w-2/3 rounded bg-surface-variant"></div>
        </div>
      </div>
    );
  if (!provider) return <p className="pt-lg font-body-md text-on-surface-variant">Provider not found.</p>;

  return (
    <div className="mx-auto w-full max-w-2xl pt-lg">
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
            {provider.verified && <VerifiedBadge />}
          </div>
          <p className="truncate font-body-md text-sm text-on-surface-variant">{provider.cooperativeId?.name}</p>
          <p className="mt-1 font-heading text-lg font-bold text-primary">₹{provider.hourlyRate}/hr</p>
        </div>
        <TrustRing score={provider.trustScore} size={48} />
      </div>

      {/* 5-Stage Institutional Trust Verification */}
      <div className="mt-4">
        <TrustSystemBadge
          providerName={provider.userId?.name}
          rating={provider.trustScore || 4.8}
          jobsCompleted={47}
          identityVerified={true}
          coopVerified={true}
          skillCertified={true}
          insuranceActive={true}
        />
      </div>

      {/* Transparent Fair Wage Engine Breakdown */}
      <div className="mt-4">
        <FairWageBreakdown customerPays={provider.hourlyRate || 250} />
      </div>

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