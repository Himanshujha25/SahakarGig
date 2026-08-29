import { useState, useCallback } from "react";
import api from "../lib/api";

// Toggle favourite state for a provider and persist it via the /api/favorites endpoints.
// `initial` may come from server-synced data (e.g. favourites ids fetched up front).
export default function useFavorite(providerId, initial = false) {
  const [favourite, setFavourite] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    if (busy || !providerId) return;
    setBusy(true);
    try {
      if (favourite) {
        await api.delete(`/favorites/${providerId}`);
        setFavourite(false);
      } else {
        await api.post(`/favorites/${providerId}`);
        setFavourite(true);
      }
    } catch {
      // Keep current state on failure — user can retry the toggle.
    } finally {
      setBusy(false);
    }
  }, [favourite, providerId, busy]);

  return { favourite, busy, toggle, setFavourite };
}