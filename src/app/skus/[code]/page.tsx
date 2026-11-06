import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, FlagBadge, day, n0, n1 } from "@/components/ui";
import { SalesChart } from "@/components/SalesChart";
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
  const coverHistory = [...sku.recommendations].reverse();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{sku.code} · {sku.name}</h1>
        <p className="text-sm text-slate-600">
          {sku.category} · {sku.isPerishable ? "Perishable (cover 3–4 weeks)" : "General (cover 6–14 weeks)"} · Standard reorder {n0(sku.standardReorderQty)} {sku.unitOfMeasure ?? ""} · Distributor {sku.primaryDistributor ? `${sku.primaryDistributor.name} (${sku.primaryDistributor.region})` : "—"}
        </p>
      </div>
      <section className="grid gap-3 sm:grid-cols-4">
        <Card title="AVG4 (latest)"><div className="text-xl font-semibold tabular">{n0(last?.avg4)}</div></Card>
        <Card title="AVG12 (latest)"><div className="text-xl font-semibold tabular">{n0(last?.avg12)}</div></Card>
        <Card title="On hand"><div className="text-xl font-semibold tabular">{n0(inv?.onHand)}</div><p className="text-xs text-slate-500">{inv ? `as of ${day(inv.asOfDate)} · on-order ${inv.onOrder ?? "unavailable"}` : "no snapshot"}</p></Card>
        <Card title="Weeks of history"><div className="text-xl font-semibold tabular">{sku.series.length}</div></Card>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Weekly sales</h2>
        <SalesChart data={sku.series} />
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Cover over time (per engine run)</h2>
        {coverHistory.length === 0 ? (
          <p className="text-sm text-slate-500">No runs yet. Cover history builds up with each weekly run.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Run date</th><th>Flag</th><th className="text-right">Cover (wk)</th><th className="text-right">Rate/wk</th><th className="text-right">Qty</th><th className="pl-3">Status</th></tr></thead>
            <tbody>
              {coverHistory.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-1"><Link className="underline" href={`/runs/${r.runId}`}>{day(r.run.runDate)}</Link></td>
                  <td><FlagBadge flag={r.flag} /></td>
                  <td className="text-right tabular">{n1(r.weeksOfCover)}</td>
                  <td className="text-right tabular">{n0(r.demandRate)}</td>
                  <td className="text-right tabular">{r.qty ? n0(r.qty) : "—"}</td>
                  <td className="pl-3 text-xs">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
