import Link from "next/link";
import { Banner, Card, FlagBadge, FLAG_STYLES, day, n0, pct } from "@/components/ui";
import { RunEngineButton } from "@/components/RunEngineButton";
import { defaultRunDate, getMetrics, latestRun } from "@/lib/services/planning";

export const dynamic = "force-dynamic";

type Totals = { byFlag?: Record<string, number>; exceptionRate?: number; guardrailRatio?: number; guardrailBasis?: string; festivalFactor?: number; recommendedQty?: number; baselineQty?: number };

export default async function Home() {
  const [run, metrics, defDate] = await Promise.all([latestRun(), getMetrics(), defaultRunDate()]);
  const totals = (run?.totals ?? {}) as Totals;
  const warnings = (run?.warnings ?? []) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Weekly demand plan</h1>
          <p className="text-sm text-slate-600">
            {run ? <>Latest run <Link className="underline" href={`/runs/${run.id}`}>#{run.id}</Link> for {day(run.runDate)} · {run.status}</> : "No runs yet."}
          </p>
        </div>
        <RunEngineButton defaultDate={defDate} />
      </div>

      {run?.status === "HALTED" && (
        <Banner tone="red" title="Guardrail tripped: use manual planning this week">
          {run.haltReason} No recommendations were saved.
        </Banner>
      )}

      {run && run.status === "COMPLETED" && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.keys(FLAG_STYLES).map((f) => (
              <Link key={f} href={`/runs/${run.id}?flag=${f}`} className="rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-400">
                <FlagBadge flag={f} />
                <div className="mt-2 text-2xl font-semibold tabular">{totals.byFlag?.[f] ?? 0}</div>
              </Link>
            ))}
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <Card title="Guardrail" tone={(totals.guardrailRatio ?? 0) > 1.5 ? "bad" : "ok"}>
              <div className="text-lg font-semibold">Passed · {(totals.guardrailRatio ?? 0).toFixed(2)}×</div>
              <p className="text-xs text-slate-600">
                Recommended {n0(totals.recommendedQty)} vs {n0(totals.baselineQty)} if every SKU ordered Q_std ({totals.guardrailBasis}). Halts above 1.5×.
              </p>
            </Card>
            <Card title="Exception rate (expected 15–20%)" tone={metrics.exceptionBand === "within" ? "ok" : "warn"}>
              <div className="text-lg font-semibold">{pct(metrics.exceptionRate)} · {metrics.exceptionBand} band</div>
              <p className="text-xs text-slate-600">{metrics.latestRun?.exceptions ?? 0} of {metrics.latestRun?.recommendations ?? 0} SKUs routed to Raghav. <Link href="/exceptions" className="underline">See exceptions</Link></p>
            </Card>
            <Card title="Override rate (warn above 30%)" tone={metrics.overrideWarn ? "warn" : "ok"}>
              <div className="text-lg font-semibold">{pct(metrics.overrideRate)}{metrics.overrideWarn ? " · review rules" : ""}</div>
              <p className="text-xs text-slate-600">
                {metrics.decisions.approve} approved · {metrics.decisions.override} overridden · {metrics.decisions.reject} rejected (all runs)
              </p>
            </Card>
          </section>
        </>
      )}

      <Banner tone="sky" title="Kill metric for Deepa">
        {metrics.killRule} This app reports the numbers; it does not make that call. Runs so far: {metrics.runs.total} ({metrics.runs.halted} halted).
      </Banner>

      {warnings.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Data limitations in this run</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
