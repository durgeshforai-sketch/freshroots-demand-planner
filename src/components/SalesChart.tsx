// Server-rendered SVG: weekly units (bars) with AVG4 and AVG12 lines. No chart library needed.
export interface Point { weekStart: string; units: number; avg4: number; avg12: number | null }

export function SalesChart({ data }: { data: Point[] }) {
  if (!data.length) return <p className="text-sm text-slate-500">No sales history.</p>;
  const W = 720, H = 240, L = 44, R = 12, T = 12, B = 36;
  const max = Math.max(...data.flatMap((d) => [d.units, d.avg4, d.avg12 ?? 0])) * 1.1 || 1;
  const bw = (W - L - R) / data.length;
  const x = (i: number) => L + i * bw + bw / 2;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const line = (key: "avg4" | "avg12") =>
    data.map((d, i) => (d[key] === null ? null : `${x(i)},${y(d[key] as number)}`)).filter(Boolean).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly units sold with 4-week and 12-week averages">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.weekStart}>
            <rect x={x(i) - bw * 0.35} width={bw * 0.7} y={y(d.units)} height={y(0) - y(d.units)} fill="#94a3b8" rx="1">
              <title>{`${d.weekStart}: ${d.units} units`}</title>
            </rect>
            {i % 2 === 0 && <text x={x(i)} y={H - B + 14} textAnchor="middle" fontSize="9" fill="#64748b">{d.weekStart.slice(5)}</text>}
          </g>
        ))}
        <polyline points={line("avg12")} fill="none" stroke="#0f766e" strokeWidth="2" />
        <polyline points={line("avg4")} fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5 3" />
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
        <span><span className="mr-1 inline-block h-2 w-3 bg-slate-400" />Weekly units</span>
        <span><span className="mr-1 inline-block h-0.5 w-4 bg-teal-700 align-middle" />AVG12</span>
        <span><span className="mr-1 inline-block h-0.5 w-4 bg-violet-600 align-middle" />AVG4</span>
        <span>Week-start dates (Mon)</span>
      </figcaption>
    </figure>
  );
}
