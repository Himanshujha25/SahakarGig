import { Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Reusable heart toggle for "Save to Favourites".
// Uses the app's tertiary (warm-amber) accent — the same one used for star
// ratings — so it stays fully in sync with the Material 3 theme in both
// light and dark modes. `favourite` (state) + `onToggle` are provided by parent.
export default function FavoriteButton({ favourite, onToggle, size = 18 }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <button
      type="button"
      aria-label={favourite ? "Remove from favourites" : "Save to favourites"}
      title={favourite ? "Remove from favourites" : "Save to favourites"}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ring-1 ring-inset transition-all duration-200 ${
        favourite
          ? "border-tertiary/50 bg-tertiary-container ring-tertiary/20 text-on-tertiary-container shadow-sm"
          : "border-outline-variant bg-surface ring-outline-variant/10 text-on-surface-variant hover:border-tertiary/60 hover:bg-tertiary-container/40 hover:text-tertiary dark:hover:text-tertiary"
      }`}
    >
      <Heart
        size={size}
        strokeWidth={2}
        fill={favourite ? "currentColor" : "none"}
        className={favourite ? "" : "opacity-90"}
      />
    </button>
  );
}