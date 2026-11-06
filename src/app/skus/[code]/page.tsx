import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { SalesChart } from "@/components/SalesChart";
import { Card, FlagBadge, Icon, SectionTitle, StatusPill, n0, n1, prettyDay, rise } from "@/components/ui";
import { engineConfig } from "@/config/engine";
import { ApiError } from "@/lib/api";
import { skuDetail } from "@/lib/services/planning";

export const dynamic = "force-dynamic";

export default async function SkuPage({ params }: PageProps<"/skus/[code]">) {
  const { code } = await params;
  let sku;
  try {
    sku = await skuDetail(code);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const last = sku.series.at(-1);
  const inv = sku.inventory[0];
  const history = [...sku.recommendations].reverse();
  const latest = sku.recommendations[0];
  const win = sku.isPerishable ? engineConfig.cover.perishable : engineConfig.cover.general;
  const trend = last?.avg12 && last.avg4 !== null ? last.avg4 / last.avg12 - 1 : 0;
  const coverMax = Math.max(win.max * 1.4, ...history.map((h) => Math.min(h.weeksOfCover, 60)));

  const stats = [
    { label: "AVG4 / week", value: last?.avg4 ?? 0, sub: `${trend >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(trend * 100))}% vs AVG12`, tone: Math.abs(trend) < 0.05 ? "text-faint" : trend > 0 ? "text-surge" : "text-watch" },
    { label: "AVG12 / week", value: last?.avg12 ?? 0, sub: "12-week baseline", tone: "text-faint" },
    { label: "On hand", value: inv?.onHand ?? 0, sub: inv ? `as of ${prettyDay(inv.asOfDate)}` : "no snapshot", tone: "text-faint" },
    { label: "Weeks of history", value: sku.series.length, sub: sku.series.length < 12 ? "under 12: E1 exception" : "enough for AVG12", tone: sku.series.length < 12 ? "text-risk" : "text-faint" },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/runs/latest" className="text-xs font-semibold text-muted hover:text-ink">
            ← Back to review
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{sku.name.replace("Freshroots ", "")}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs ring-1 ring-line">{sku.code}</span>
            <span>{sku.category}</span>
            <span>·</span>
            {sku.isPerishable ? (
              <span className="rounded bg-marigold-100 px-1.5 py-0.5 text-xs font-bold text-marigold-700">Perishable · cover {win.min}–{win.max} wk</span>
            ) : (
              <span>General · cover {win.min}–{win.max} wk</span>
            )}
            <span>·</span>
            <span>Standard order {n0(sku.standardReorderQty)}</span>
            {sku.primaryDistributor && (
              <>
                <span>·</span>
                <span>
                  {sku.primaryDistributor.name} ({sku.primaryDistributor.region})
                </span>
              </>
            )}
          </div>
        </div>
        {latest && (
          <div className="card flex items-center gap-3 p-3 pr-4">
            <span className="text-xs font-semibold text-muted">Latest run</span>
            <FlagBadge flag={latest.flag} size="md" />
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={s.label} className="p-4" style={rise(i + 1)}>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{s.label}</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">
              <AnimatedNumber value={Math.round(s.value)} />
            </div>
            <div className={`mt-0.5 text-xs ${s.tone}`}>{s.sub}</div>
          </Card>
        ))}
      </section>

      <Card className="p-5" style={rise(5)}>
        <SectionTitle>Weekly sales</SectionTitle>
        <SalesChart data={sku.series} />
      </Card>

      <Card className="p-5" style={rise(6)}>
        <SectionTitle aside={<span className="text-xs text-muted">Shaded band = target cover window</span>}>Cover over time (one bar per engine run)</SectionTitle>
        {history.length === 0 ? (
          <div className="grid place-items-center gap-2 py-8 text-center text-sm text-muted">
            <Icon name="calendar" className="h-8 w-8 text-faint" />
            No runs yet. Cover history builds up with each weekly run.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-paper/60 p-3 ring-1 ring-line">
              {/* Fixed-height plot so percentage heights resolve; band and bars share one scale. */}
              <div className="relative mt-5 h-32">
                <div
                  className="pointer-events-none absolute inset-x-0 rounded bg-forest-100/80"
                  style={{ bottom: `${(win.min / coverMax) * 100}%`, height: `${((win.max - win.min) / coverMax) * 100}%` }}
                  aria-hidden
                />
                <span className="absolute right-1 text-[10px] font-semibold text-forest-700" style={{ bottom: `calc(${(win.max / coverMax) * 100}% + 2px)` }}>
                  {win.min}–{win.max} wk target
                </span>
                <div className="absolute inset-0 flex items-end gap-3">
                  {history.map((h, i) => {
                    const v = Math.min(h.weeksOfCover, coverMax);
                    const tone = h.weeksOfCover < win.min ? "bg-risk" : h.weeksOfCover > win.max ? "bg-over" : "bg-forest-500";
                    return (
                      <Link
                        key={h.id}
                        href={`/runs/${h.runId}`}
                        className={`animate-grow-y group relative block max-w-16 flex-1 origin-bottom rounded-t-md ${tone} transition-opacity hover:opacity-80`}
                        style={{ height: `${Math.max((v / coverMax) * 100, 2)}%`, animationDelay: `${i * 60}ms` }}
                        title={`Run ${h.runId}: ${n1(h.weeksOfCover)} weeks of cover`}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-ink tabular">{n1(h.weeksOfCover)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="mt-1 flex gap-3">
                {history.map((h) => (
                  <span key={h.id} className="max-w-16 flex-1 text-center text-[10px] text-faint">
                    #{h.runId}
                  </span>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] font-bold uppercase tracking-wider text-faint">
                  <tr className="border-b border-line">
                    <th className="py-2">Run</th>
                    <th>Flag</th>
                    <th className="text-right">Cover (wk)</th>
                    <th className="text-right">Rate / wk</th>
                    <th className="text-right">Order</th>
                    <th className="pl-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sku.recommendations.map((r) => (
                    <tr key={r.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2">
                        <Link className="font-semibold text-forest-700 hover:underline" href={`/runs/${r.runId}`}>
                          #{r.runId} · {prettyDay(r.run.runDate)}
                        </Link>
                      </td>
                      <td>
                        <FlagBadge flag={r.flag} />
                      </td>
                      <td className="text-right tabular">{n1(r.weeksOfCover)}</td>
                      <td className="text-right tabular">{n0(r.demandRate)}</td>
                      <td className="text-right font-bold tabular">{r.qty ? n0(r.qty) : "—"}</td>
                      <td className="pl-4">
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
