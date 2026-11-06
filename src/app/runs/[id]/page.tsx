import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DecisionControls } from "@/components/DecisionControls";
import { PreplacementButton, type CheckView } from "@/components/PreplacementButton";
import { Banner, CoverBar, FLAG_META, FLAG_ORDER, FlagBadge, Icon, StatusPill, n0, prettyDay, rise } from "@/components/ui";
import { engineConfig } from "@/config/engine";
import { reasonCodes } from "@/config/reasonCodes";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRun, listRecommendations } from "@/lib/services/planning";
import { recQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

/** Build a URL that toggles one filter while keeping the others. */
function hrefWith(runId: number, sp: SP, key: string, value: string | null) {
  const q = new URLSearchParams();
  for (const k of ["flag", "status", "perishable"]) {
    const v = k === key ? value : typeof sp[k] === "string" ? (sp[k] as string) : null;
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return `/runs/${runId}${s ? `?${s}` : ""}`;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
        active ? "bg-forest-800 text-white shadow-sm" : "bg-white text-muted ring-1 ring-line hover:text-ink hover:ring-forest-200"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (id === "latest") {
    const latest = await prisma.run.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } });
    if (!latest) redirect("/");
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
    redirect(`/runs/${latest.id}${q ? `?${q}` : ""}`);
  }
  const runId = Number(id);
  if (!Number.isInteger(runId) || runId <= 0) notFound();
  const parsed = recQuerySchema.safeParse({ flag: sp.flag || undefined, status: sp.status || undefined, perishable: sp.perishable || undefined });
  const filters = parsed.success ? parsed.data : {};

  let run;
  try {
    run = await getRun(runId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const all = run.recommendations;
  const recs = (await listRecommendations({ ...filters, runId })).sort(
    (a, b) => FLAG_ORDER.indexOf(a.flag as (typeof FLAG_ORDER)[number]) - FLAG_ORDER.indexOf(b.flag as (typeof FLAG_ORDER)[number]) || a.skuCode.localeCompare(b.skuCode),
  );
  const decided = all.filter((r) => r.status !== "PENDING").length;
  const countBy = (f: string) => all.filter((r) => r.flag === f).length;

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-xs font-semibold text-muted hover:text-ink">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Review run #{run.id}</h1>
          <p className="mt-1 text-sm text-muted">
            Plan for <strong className="text-ink">{prettyDay(run.runDate)}</strong> · {all.length} SKUs · created {run.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
          </p>
        </div>
        {run.status === "COMPLETED" && (
          <div className="card w-full max-w-xs p-4 sm:w-72">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-bold">Decisions</span>
              <span className="tabular text-muted">
                {decided}/{all.length}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper ring-1 ring-line">
              <div className="animate-grow-x h-full origin-left rounded-full bg-forest-500" style={{ width: `${all.length ? (decided / all.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </div>

      {run.status === "HALTED" && (
        <Banner tone="red" title="Guardrail halted this run: plan manually" icon="shield">
          {run.haltReason}
        </Banner>
      )}

      {/* ---------- Filters ---------- */}
      <div className="card animate-rise space-y-3 p-4" style={rise(1)}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-[11px] font-bold uppercase tracking-wider text-faint">Flag</span>
          <Chip href={hrefWith(run.id, sp, "flag", null)} active={!filters.flag}>
            All <span className="opacity-60">{all.length}</span>
          </Chip>
          {FLAG_ORDER.map((f) => (
            <Chip key={f} href={hrefWith(run.id, sp, "flag", f)} active={filters.flag === f}>
              <span className={`h-1.5 w-1.5 rounded-full ${FLAG_META[f].dot}`} />
              {FLAG_META[f].short} <span className="opacity-60">{countBy(f)}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-[11px] font-bold uppercase tracking-wider text-faint">Status</span>
          {[null, "PENDING", "APPROVED", "OVERRIDDEN", "REJECTED"].map((s) => (
            <Chip key={s ?? "all"} href={hrefWith(run.id, sp, "status", s)} active={(filters.status ?? null) === s}>
              {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
            </Chip>
          ))}
          <span className="ml-0 w-16 text-[11px] font-bold uppercase tracking-wider text-faint sm:ml-4">Type</span>
          {[
            [null, "All"],
            ["true", "Perishable"],
            ["false", "General"],
          ].map(([v, l]) => (
            <Chip key={l} href={hrefWith(run.id, sp, "perishable", v)} active={(filters.perishable === undefined ? null : String(filters.perishable)) === v}>
              {l}
            </Chip>
          ))}
        </div>
      </div>

      {/* ---------- Table ---------- */}
      {recs.length === 0 ? (
        <div className="card animate-rise grid place-items-center gap-2 p-12 text-center">
          <Icon name="check" className="h-10 w-10 rounded-full bg-ok-soft p-2 text-forest-600" />
          <p className="font-bold">Nothing here</p>
          <p className="text-sm text-muted">No recommendations match these filters.</p>
          <Link href={`/runs/${run.id}`} className="mt-2 text-sm font-semibold text-forest-700 hover:underline">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="card animate-rise overflow-x-auto" style={rise(2)}>
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="sticky top-0 z-10 bg-white/95 text-left text-[11px] font-bold uppercase tracking-wider text-faint backdrop-blur">
              <tr className="border-b border-line">
                <th className="px-4 py-3">SKU</th>
                <th className="px-3 py-3">Flag</th>
                <th className="px-3 py-3 text-right">Demand / wk</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="px-3 py-3">Cover vs window</th>
                <th className="px-3 py-3 text-right">Order</th>
                <th className="px-3 py-3">Why</th>
                <th className="px-4 py-3">Decision</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((r, i) => {
                const d = r.decisions[0];
                const last = r.preplacementChecks[0];
                const check: CheckView | null = last
                  ? { id: last.id, result: last.result, triggers: (last.triggers as string[]) ?? [], ownerDecision: last.ownerDecision, checkedAt: last.checkedAt.toISOString() }
                  : null;
                const win = r.sku.isPerishable ? engineConfig.cover.perishable : engineConfig.cover.general;
                const trend = r.avg12 > 0 ? r.avg4 / r.avg12 - 1 : 0;
                return (
                  <tr
                    key={r.id}
                    style={rise(i + 3)}
                    className={`animate-rise border-b border-line/70 align-top transition-colors last:border-0 hover:bg-paper/60 ${r.status !== "PENDING" ? "bg-paper/30" : ""}`}
                  >
                    <td className="px-4 py-3.5">
                      <Link href={`/skus/${r.skuCode}`} className="font-bold text-ink hover:text-forest-700">
                        {r.sku.name.replace("Freshroots ", "")}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-faint">
                        {r.skuCode} · {r.sku.category}
                        {r.sku.isPerishable && <span className="rounded bg-marigold-100 px-1.5 py-px text-[10px] font-bold text-marigold-700">PERISHABLE</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <FlagBadge flag={r.flag} />
                      {r.festivalFactor > 1 && <div className="mt-1.5 text-[11px] text-marigold-700">✦ Festival ×{r.festivalFactor}</div>}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular">
                      <div className="font-bold">{n0(r.demandRate)}</div>
                      <div title="Last 4 weeks vs 12-week average" className={`whitespace-nowrap text-[11px] ${Math.abs(trend) < 0.05 ? "text-faint" : trend > 0 ? "text-surge" : "text-watch"}`}>
                        {trend > 0 ? "▲" : trend < 0 ? "▼" : "•"} {Math.abs(Math.round(trend * 100))}% recent
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular">
                      <div className="font-semibold">{n0(r.inventoryPosition)}</div>
                      {!r.onOrderAvailable && <div className="whitespace-nowrap text-[10px] text-faint" title="On-order quantity is not in the SAP export">on hand only</div>}
                    </td>
                    <td className="px-3 py-3.5">
                      <CoverBar woc={r.weeksOfCover} min={win.min} max={win.max} flag={r.flag} />
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      {r.qty ? <span className="text-lg font-extrabold tabular text-forest-800">{n0(r.qty)}</span> : <span className="text-faint">—</span>}
                    </td>
                    <td className="max-w-xs px-3 py-3.5">
                      <details className="group text-xs leading-relaxed text-muted">
                        <summary className="cursor-pointer list-none">
                          <span className="line-clamp-2 group-open:line-clamp-none">{r.reason}</span>
                          <span className="mt-0.5 inline-block font-semibold text-forest-700 group-open:hidden">more</span>
                        </summary>
                      </details>
                    </td>
                    <td className="px-4 py-3.5">
                      {r.status === "PENDING" ? (
                        <DecisionControls recId={r.id} flag={r.flag} qty={r.qty} />
                      ) : (
                        <div className="animate-pop space-y-2 text-xs">
                          <StatusPill status={r.status} />
                          {d && (
                            <div className="text-muted">
                              {d.newQty !== null && <strong className="text-ink">{n0(d.newQty)} units · </strong>}
                              {reasonCodes[d.reasonCode as keyof typeof reasonCodes] ?? d.reasonCode}
                              <div className="text-faint">by {d.decidedBy}</div>
                              {d.note && <div className="mt-1 italic">“{d.note}”</div>}
                            </div>
                          )}
                          {r.status !== "REJECTED" && <PreplacementButton recId={r.id} last={check} />}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
