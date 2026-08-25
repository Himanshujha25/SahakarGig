export default function TrustRing({ score = 4.6, max = 5, size = 44, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / max));
  const offset = circ * (1 - pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} className="trust-ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} className="trust-ring-fill"
          strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-heading text-xs font-semibold text-on-surface">{score}</span>
    </div>
  );
}
