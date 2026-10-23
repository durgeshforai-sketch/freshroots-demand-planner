import Link from "next/link";
import { FlagBadge } from "@/components/ui";
import { listExceptions } from "@/lib/services/planning";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  E1: "New SKU (under 12 weeks of history)",
  E2: "Distributor swing",
  E3: "Market event flag",
  E4: "Data problem",
  E5: "Lead-time conflict",
  E6: "Large order (over ₹5 lakh)",
  E7: "Floor breach after capped order",
};

export default async function ExceptionsPage({ searchParams }: PageProps<"/exceptions">) {
  const { runId } = await searchParams;
  const id = typeof runId === "string" && /^\d+$/.test(runId) ? Number(runId) : undefined;
  const data = await listExceptions(id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Exceptions → Raghav</h1>
        <p className="text-sm text-slate-600">
          {data.runId ? <>Run <Link href={`/runs/${data.runId}?flag=EXCEPTION`} className="underline">#{data.runId}</Link>. These SKUs get no automatic quantity; Raghav decides.</> : "No runs yet."}
        </p>
      </div>
      {data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No exceptions in this run.</p>
      ) : (
        Object.keys(LABELS).filter((c) => data.byCode[c]).map((code) => (
          <section key={code} className="rounded-lg border border-slate-200 bg-white">
            <h2 className="flex items-center gap-2 border-b border-slate-100 p-3 text-sm font-semibold">
              <FlagBadge flag="EXCEPTION" /> {code} · {LABELS[code]} <span className="text-slate-500">({data.byCode[code]})</span>
            </h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {data.items.filter((e) => e.code === code).map((e) => (
                <li key={e.id} className="p-3">
                  <Link href={`/skus/${e.skuCode}`} className="font-medium underline">{e.skuCode}</Link>{" "}
                  <span className="text-slate-500">{e.sku.name.replace("Freshroots ", "")}</span>
                  <p className="text-slate-700">{e.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
