import Link from "next/link";
import { Icon, rise, type IconName } from "@/components/ui";
import { listExceptions } from "@/lib/services/planning";

export const dynamic = "force-dynamic";

const CODES: Record<string, { title: string; what: string; icon: IconName }> = {
  E1: { title: "New SKU", what: "Under 12 weeks of history, so averages aren't reliable yet.", icon: "leaf" },
  E2: { title: "Distributor swing", what: "A big distributor moved 50%+ against its own average.", icon: "users" },
  E3: { title: "Market event", what: "Someone flagged a scheme or event affecting this SKU.", icon: "flag" },
  E4: { title: "Data problem", what: "Missing weeks, negative stock, or unmatched IDs.", icon: "alert" },
  E5: { title: "Lead-time conflict", what: "Supplier lead time is at or above minimum cover.", icon: "calendar" },
  E6: { title: "Large order", what: "Order value is above ₹5 lakh.", icon: "box" },
  E7: { title: "Floor breach", what: "Even the capped order leaves cover below the minimum.", icon: "gauge" },
};

export default async function ExceptionsPage({ searchParams }: PageProps<"/exceptions">) {
  const { runId } = await searchParams;
  const id = typeof runId === "string" && /^\d+$/.test(runId) ? Number(runId) : undefined;
  const data = await listExceptions(id);
  const skus = new Set(data.items.map((e) => e.skuCode)).size;

  return (
    <div className="space-y-6">
      <div className="animate-rise">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-marigold-700">The 15–20% that needs judgment</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Exceptions for Raghav</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          {data.runId ? (
            <>
              {skus} SKU{skus === 1 ? "" : "s"} in{" "}
              <Link href={`/runs/${data.runId}?flag=EXCEPTION`} className="font-semibold text-forest-700 hover:underline">
                run #{data.runId}
              </Link>{" "}
              get no automatic quantity. Each card says why; decide the quantity on the review page.
            </>
          ) : (
            "No runs yet."
          )}
        </p>
      </div>

      {data.items.length === 0 ? (
        <div className="card animate-rise grid place-items-center gap-2 p-12 text-center">
          <Icon name="check" className="h-12 w-12 rounded-full bg-ok-soft p-2.5 text-forest-600" />
          <p className="text-lg font-bold">No exceptions</p>
          <p className="text-sm text-muted">Every SKU in this run fits Raghav&apos;s rules.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {Object.keys(CODES)
            .filter((c) => data.byCode[c])
            .map((code, gi) => {
              const meta = CODES[code];
              const items = data.items.filter((e) => e.code === code);
              return (
                <section key={code} className="card animate-rise overflow-hidden" style={rise(gi + 1)}>
                  <header className="flex items-start gap-3 border-b border-line bg-paper/50 p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-exc text-marigold-300">
                      <Icon name={meta.icon} className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-bold text-white">{code}</span>
                        <h2 className="font-bold">{meta.title}</h2>
                        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-muted ring-1 ring-line">{items.length}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{meta.what}</p>
                    </div>
                  </header>
                  <ul className="divide-y divide-line/70">
                    {items.map((e) => (
                      <li key={e.id}>
                        <Link href={`/skus/${e.skuCode}`} className="group flex gap-3 p-4 transition-colors hover:bg-paper/60">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold group-hover:text-forest-700">{e.sku.name.replace("Freshroots ", "")}</span>
                              <span className="text-xs text-faint">{e.skuCode}</span>
                              {e.sku.isPerishable && <span className="rounded bg-marigold-100 px-1.5 py-px text-[10px] font-bold text-marigold-700">PERISHABLE</span>}
                            </div>
                            <p className="mt-1 text-sm text-muted">{e.detail}</p>
                          </div>
                          <Icon name="arrow" className="mt-1 h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-1 group-hover:text-forest-700" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}
