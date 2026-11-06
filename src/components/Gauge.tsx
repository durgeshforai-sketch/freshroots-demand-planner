// Semicircular gauge for the guardrail: needle position = ratio, red zone beyond the limit.
export function Gauge({ ratio, limit, max = 2 }: { ratio: number; limit: number; max?: number }) {
  const R = 52, C = Math.PI * R; // half circumference
  const frac = (v: number) => Math.max(0, Math.min(1, v / max));
  const angle = -90 + frac(ratio) * 180;
  const tripped = ratio > limit;
  return (
    <svg viewBox="0 0 140 84" className="w-full" role="img" aria-label={`Guardrail at ${ratio.toFixed(2)} times, limit ${limit} times`}>
      <path d="M 18 72 A 52 52 0 0 1 122 72" fill="none" stroke="var(--color-paper)" strokeWidth="12" strokeLinecap="round" />
      {/* danger zone from limit to max */}
      <path
        d="M 18 72 A 52 52 0 0 1 122 72"
        fill="none"
        stroke="var(--color-risk-soft)"
        strokeWidth="12"
        strokeDasharray={`${C * (1 - frac(limit))} ${C}`}
        strokeDashoffset={-C * frac(limit)}
      />
      {/* filled value */}
      <path
        d="M 18 72 A 52 52 0 0 1 122 72"
        fill="none"
        stroke={tripped ? "var(--color-risk)" : "var(--color-forest-500)"}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${C * frac(ratio)} ${C}`}
        style={{ transition: "stroke-dasharray 1s cubic-bezier(.2,.7,.2,1)" }}
        className="gauge-fill"
      />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "70px 72px" }} className="gauge-needle">
        <line x1="70" y1="72" x2="70" y2="30" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="70" cy="72" r="5" fill="var(--color-ink)" />
      <text x="18" y="83" fontSize="8" fill="var(--color-faint)" textAnchor="middle">0×</text>
      <text x="122" y="83" fontSize="8" fill="var(--color-faint)" textAnchor="middle">{max}×</text>
    </svg>
  );
}
