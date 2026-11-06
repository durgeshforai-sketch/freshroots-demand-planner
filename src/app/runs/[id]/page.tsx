import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner, FlagBadge, FLAG_STYLES, STATUS_STYLES, day, n0, n1 } from "@/components/ui";
import { DecisionControls } from "@/components/DecisionControls";
import { PreplacementButton, type CheckView } from "@/components/PreplacementButton";
import { reasonCodes } from "@/config/reasonCodes";
import { getRun, listRecommendations } from "@/lib/services/planning";
import { ApiError } from "@/lib/api";
import { recQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const { id } = await params;
  const runId = Number(id);
  if (!Number.isInteger(runId) || runId <= 0) notFound();
  const sp = await searchParams;
  const parsed = recQuerySchema.safeParse({ flag: sp.flag || undefined, status: sp.status || undefined, perishable: sp.perishable || undefined });
  const filters = parsed.success ? parsed.data : {};

  let run;
  try {
    run = await getRun(runId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const recs = await listRecommendations({ ...filters, runId });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Run #{run.id} · {day(run.runDate)}</h1>
        <p className="text-sm text-slate-600">{run.status} · created {run.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC · {run.recommendations.length} SKUs</p>
      </div>

      {run.status === "HALTED" && <Banner tone="red" title="Guardrail halted this run: plan manually">{run.haltReason}</Banner>}

      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm" method="get">
        <label>
          <span className="block text-xs text-slate-500">Flag</span>
          <select name="flag" defaultValue={filters.flag ?? ""} className="rounded border border-slate-300 px-2 py-1">
            <option value="">All</option>
            {Object.entries(FLAG_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label>
          <span className="block text-xs text-slate-500">Status</span>
          <select name="status" defaultValue={filters.status ?? ""} className="rounded border border-slate-300 px-2 py-1">
            <option value="">All</option>
            {["PENDING", "APPROVED", "OVERRIDDEN", "REJECTED"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span className="block text-xs text-slate-500">Perishable</span>
          <select name="perishable" defaultValue={filters.perishable === undefined ? "" : String(filters.perishable)} className="rounded border border-slate-300 px-2 py-1">
            <option value="">All</option>
            <option value="true">Perishable</option>
            <option value="false">General</option>
          </select>
        </label>
        <button className="rounded bg-slate-900 px-3 py-1.5 text-white">Filter</button>
        <Link href={`/runs/${run.id}`} className="text-slate-600 underline">Clear</Link>
      </form>

      {recs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No recommendations match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="p-2">SKU</th><th className="p-2">Flag</th>
                <th className="p-2 text-right">AVG4</th><th className="p-2 text-right">AVG12</th><th className="p-2 text-right">Rate/wk</th>
                <th className="p-2 text-right">Stock</th><th className="p-2 text-right">Cover (wk)</th><th className="p-2 text-right">Qty</th>
                <th className="p-2">Why</th><th className="p-2">Decision</th>
              </tr>
            </thead>
            <tbody>
              {recs.map((r) => {
                const d = r.decisions[0];
                const last = r.preplacementChecks[0];
                const check: CheckView | null = last ? { id: last.id, result: last.result, triggers: (last.triggers as string[]) ?? [], ownerDecision: last.ownerDecision, checkedAt: last.checkedAt.toISOString() } : null;
                return (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="p-2">
                      <Link href={`/skus/${r.skuCode}`} className="font-medium underline">{r.skuCode}</Link>
                      <div className="text-xs text-slate-500">{r.sku.name.replace("Freshroots ", "")}</div>
                      {r.sku.isPerishable && <div className="text-xs text-amber-700">Perishable</div>}
                    </td>
                    <td className="p-2"><FlagBadge flag={r.flag} />{r.festivalFactor > 1 && <div className="mt-1 text-xs text-slate-500">Festival ×{r.festivalFactor}</div>}</td>
                    <td className="p-2 text-right tabular">{n0(r.avg4)}</td>
                    <td className="p-2 text-right tabular">{n0(r.avg12)}</td>
                    <td className="p-2 text-right tabular">{n0(r.demandRate)}</td>
                    <td className="p-2 text-right tabular">{n0(r.inventoryPosition)}{!r.onOrderAvailable && <div className="text-[10px] text-slate-400">no on-order</div>}</td>
                    <td className="p-2 text-right tabular">{n1(r.weeksOfCover)}</td>
                    <td className="p-2 text-right font-semibold tabular">{r.qty ? n0(r.qty) : "—"}</td>
                    <td className="max-w-sm p-2 text-xs text-slate-700">{r.reason}</td>
                    <td className="p-2">
                      <div className={`mb-1 text-xs ${STATUS_STYLES[r.status]}`}>{r.status}</div>
                      {r.status === "PENDING" ? (
                        <DecisionControls recId={r.id} flag={r.flag} qty={r.qty} />
                      ) : (
                        d && (
                          <div className="space-y-2 text-xs text-slate-600">
                            <div>{d.action}{d.newQty !== null ? ` → ${n0(d.newQty)}` : ""} · {reasonCodes[d.reasonCode as keyof typeof reasonCodes] ?? d.reasonCode} · {d.decidedBy}{d.note ? ` · “${d.note}”` : ""}</div>
                            {r.status !== "REJECTED" && <PreplacementButton recId={r.id} last={check} />}
                          </div>
                        )
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
