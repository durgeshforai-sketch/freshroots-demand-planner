// Server-rendered SVG: weekly units (bars), AVG12 (area + line) and AVG4 (dashed). No chart library.
export interface Point { weekStart: string; units: number; avg4: number | null; avg12: number | null }

export function SalesChart({ data }: { data: Point[] }) {
  if (!data.length) return <p className="text-sm text-muted">No sales history.</p>;
  const W = 760, H = 260, L = 40, R = 12, T = 14, B = 34;
  const max = Math.max(...data.flatMap((d) => [d.units, d.avg4 ?? 0, d.avg12 ?? 0])) * 1.12 || 1;
  const bw = (W - L - R) / data.length;
  const x = (i: number) => L + i * bw + bw / 2;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const pts = (key: "avg4" | "avg12") => data.map((d, i) => (d[key] === null ? null : ([x(i), y(d[key] as number)] as const))).filter((p): p is readonly [number, number] => p !== null);
  const line = (key: "avg4" | "avg12") => pts(key).map(([a, b]) => `${a},${b}`).join(" ");
  const a12 = pts("avg12");
  const area = a12.length ? `M ${a12[0][0]},${y(0)} ${a12.map(([a, b]) => `L ${a},${b}`).join(" ")} L ${a12[a12.length - 1][0]},${y(0)} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly units sold with 4-week and 12-week averages">
        <defs>
          <linearGradient id="a12fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-forest-500)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-forest-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t ? "3 4" : undefined} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--color-faint)">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.weekStart}>
            <rect
              x={x(i) - bw * 0.32}
              width={bw * 0.64}
              y={y(d.units)}
              height={y(0) - y(d.units)}
              rx="4"
              fill={i >= data.length - 4 ? "var(--color-marigold-300)" : "var(--color-forest-100)"}
              className="animate-grow-y"
              style={{ transformOrigin: `0 ${y(0)}px`, transformBox: "view-box", animationDelay: `${i * 35}ms` }}
            >
              <title>{`${d.weekStart}: ${d.units} units`}</title>
            </rect>
            {i % 2 === 0 && (
              <text x={x(i)} y={H - B + 16} textAnchor="middle" fontSize="9.5" fill="var(--color-faint)">
                {new Date(`${d.weekStart}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}
              </text>
            )}
          </g>
        ))}
        {area && <path d={area} fill="url(#a12fill)" className="animate-fade" style={{ animationDelay: "500ms" }} />}
        <polyline points={line("avg12")} fill="none" stroke="var(--color-forest-600)" strokeWidth="2.5" strokeLinejoin="round" pathLength={1} strokeDasharray="1" className="animate-draw" />
        <polyline points={line("avg4")} fill="none" stroke="var(--color-surge)" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" className="animate-fade" style={{ animationDelay: "700ms" }} />
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-forest-100" />Weekly units</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-marigold-300" />Last 4 weeks</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-forest-600" />AVG12</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-surge" />AVG4</span>
      </figcaption>
    </figure>
  );
}
