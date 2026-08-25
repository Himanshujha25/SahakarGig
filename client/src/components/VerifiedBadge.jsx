export default function VerifiedBadge({ label = "Verified" }) {
  return (
    <span className="badge-verified">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 1.6l2.6 2.2 3.4-.3 1.3 3.2 3.1 1.5-.9 3.3 1.7 3-2.4 2.3.2 3.4-3.4.5L12 22.4l-3.1-2 3.4-.5.2-3.4L9.7 14.2l-.9-3.3 3.1-1.5 1.3-3.2 3.4.3z" />
      </svg>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M9.5 16.2l-4-4 1.4-1.4 2.6 2.6 6-6 1.4 1.4z" />
      </svg>
      {label}
    </span>
  );
}
