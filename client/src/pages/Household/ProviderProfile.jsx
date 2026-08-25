import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../lib/api";
import TrustRing from "../../components/TrustRing";
import VerifiedBadge from "../../components/VerifiedBadge";

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

  if (loading) return <p className="font-body-md text-on-surface-variant">Loading…</p>;
  if (!provider) return <p className="font-body-md text-on-surface-variant">Provider not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 font-heading text-sm font-semibold text-primary"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back
      </button>

      <div className="card flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container font-heading text-2xl font-bold text-on-primary-container">
          {(provider.userId?.name || "?").charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-headline-md text-headline-md text-on-surface">{provider.userId?.name}</h1>
            {provider.verified && <VerifiedBadge />}
          </div>
          <p className="font-body-md text-sm text-on-surface-variant">{provider.cooperativeId?.name}</p>
        </div>
        <TrustRing score={provider.trustScore ?? 4.5} size={44} />
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="font-headline-md text-headline-md text-on-surface">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {(provider.skills || []).map((s) => (
            <span key={s} className="status-pill bg-surface-container text-on-surface-variant">
              {s}
            </span>
          ))}
        </div>
        <p className="font-body-md text-on-surface">₹{provider.hourlyRate}/hr</p>
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="font-headline-md text-headline-md text-on-surface">{t("rate")}</h2>
        {(provider.reviews || []).length === 0 ? (
          <p className="font-body-md text-on-surface-variant">No reviews yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {provider.reviews.map((r, i) => (
              <div key={i} className="border-b border-outline-variant pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <p className="font-heading text-sm font-bold text-on-surface">{r.createdBy?.name}</p>
                  <span className="font-heading text-sm font-semibold text-primary">{r.rating} ★</span>
                </div>
                <p className="font-body-md text-sm text-on-surface-variant">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => navigate(`/household/book/${provider._id}`)} className="btn-primary w-full">
        <span className="material-symbols-outlined mr-1 text-[18px]">event_available</span>
        {t("book")}
      </button>
    </div>
  );
}
