import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import useFavorite from "../../hooks/useFavorite";
import FavoriteButton from "../../components/FavoriteButton";
import VerifiedBadge from "../../components/VerifiedBadge";
import { Heart, Star, Search } from "lucide-react";

function SavedProviderCard({ provider, onUnsave }) {
  const { favourite, toggle } = useFavorite(provider._id, true);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant/60 bg-surface p-5 hover:shadow-[0_4px_24px_rgba(0,40,142,0.08)] hover:border-outline transition-all duration-200">
      {/* Top row */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-[15px] font-bold text-on-primary-container shrink-0">
          {(provider.userId?.name || "?").charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-bold text-on-surface truncate">{provider.userId?.name ?? "Provider"}</p>
            {provider.verified && <VerifiedBadge />}
          </div>
          <p className="text-[12px] text-on-surface-variant truncate">{provider.cooperativeId?.name}</p>
        </div>
        <FavoriteButton
          favourite={favourite}
          onToggle={async () => {
            await toggle();
            if (favourite) onUnsave(provider._id);
          }}
        />
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5">
        {(provider.skills || []).slice(0, 4).map((s) => (
          <span key={s} className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[11px] font-semibold">
            {s}
          </span>
        ))}
      </div>

      {/* Rate + trust */}
      <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-2.5 border border-outline-variant/30">
        <div className="flex items-center gap-1.5 text-[13px] text-on-surface-variant">
          <Star size={13} className="text-tertiary-container dark:text-tertiary" strokeWidth={2} />
          <span className="font-semibold text-on-surface">{provider.trustScore ?? "—"}</span>
          <span>trust score</span>
        </div>
        <span className="text-[14px] font-bold text-on-surface">
          ₹{provider.hourlyRate ?? "—"}<span className="text-[11px] font-normal text-on-surface-variant">/hr</span>
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          to={`/household/provider/${provider._id}`}
          className="flex-1 h-10 flex items-center justify-center rounded-xl border border-outline-variant bg-surface text-[13px] font-semibold text-on-surface hover:border-primary/40 hover:bg-primary-container hover:text-on-primary-container transition-all duration-200"
        >
          View
        </Link>
        <Link
          to={`/household/book/${provider._id}`}
          className="flex-1 h-10 flex items-center justify-center rounded-xl bg-primary text-[13px] font-bold text-on-primary hover:opacity-90 transition-all duration-200"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}

export default function SavedProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/favorites");
      setProviders(Array.isArray(data) ? data : []);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removeLocal = (id) => setProviders((prev) => prev.filter((p) => p._id !== id));

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pt-8 pb-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-[26px] font-bold tracking-tight text-on-surface"
            style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}
          >
            Saved Providers
          </h1>
          <p className="text-[14px] text-on-surface-variant mt-0.5">
            Your bookmarked cooperative service providers, stored for quick booking.
          </p>
        </div>
        {!loading && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-bold w-fit border border-tertiary/30 bg-tertiary-container text-on-tertiary-container">
            <Heart size={14} fill="currentColor" />
            {providers.length} saved
          </span>
        )}
      </div>
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface p-5 h-40" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface px-6 py-20 text-center">
          <Heart size={44} className="text-outline-variant" strokeWidth={1.5} />
          <p className="text-[15px] font-semibold text-on-surface">No saved providers yet</p>
          <p className="text-[14px] text-on-surface-variant">
            Tap the <Heart size={14} className="inline text-tertiary dark:text-tertiary" fill="currentColor" /> icon on any provider to keep them here.
          </p>
          <Link
            to="/household/find"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-on-primary hover:opacity-90 transition-all"
          >
            <Search size={16} />
            Browse providers
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <SavedProviderCard key={p._id} provider={p} onUnsave={removeLocal} />
          ))}
        </div>
      )}
    </div>
  );
}