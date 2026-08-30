export default function VerifiedBadge({ label = "Verified", size = 14 }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2l2.4 2.03 3.14-.28 1.2 2.9 2.9 1.2-.82 3.05 1.56 2.74-2.2 2.11.18 3.14-3.13.45-1.68 2.65-2.94-1.12-2.94 1.12-1.68-2.65-3.13-.45.18-3.14L2.62 13.6l1.56-2.74-.82-3.05 2.9-1.2 1.2-2.9 3.14.28z"
          fill="var(--color-secondary-container)"
        />
        <path
          d="M10.6 15.8l-3.2-3.2 1.4-1.4 1.8 1.8 4.2-4.2 1.4 1.4z"
          fill="var(--color-on-secondary-container)"
        />
      </svg>
    </span>
  );
}
