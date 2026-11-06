import Link from "next/link";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Gauge } from "@/components/Gauge";
import { RunEngineButton } from "@/components/RunEngineButton";
import { BandMeter, Banner, Card, FLAG_META, FLAG_ORDER, Icon, SectionTitle, n0, pct, prettyDay, rise } from "@/components/ui";
import { engineConfig } from "@/config/engine";
import { defaultRunDate, getMetrics, latestRun } from "@/lib/services/planning";

export const dynamic = "force-dynamic";

type Totals = { byFlag?: Record<string, number>; guardrailRatio?: number; guardrailBasis?: string; festivalFactor?: number; recommendedQty?: number; baselineQty?: number };

export default async function Home() {
  const [run, metrics, defDate] = await Promise.all([latestRun(), getMetrics(), defaultRunDate()]);
  const totals = (run?.totals ?? {}) as Totals;
  const warnings = (run?.warnings ?? []) as string[];
  const recs = run?.recommendations ?? [];
  const decided = recs.filter((r) => r.status !== "PENDING").length;
  const progress = recs.length ? decided / recs.length : 0;
  const pendingUrgent = recs.filter((r) => r.status === "PENDING" && (r.flag === "EXCEPTION" || r.flag === "STOCKOUT_RISK")).length;
  const ratio = totals.guardrailRatio ?? 0;
  const limit = engineConfig.guardrailMultiple;
  const exBand = engineConfig.killMetrics.expectedExceptionRate;

  return (
    <div className="space-y-8">
      {/* ---------- Hero ---------- */}
      <section className="brand-texture animate-rise relative overflow-hidden rounded-3xl p-6 text-white shadow-[var(--shadow-lift)] sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full border border-white/10" aria-hidden />
        <div className="pointer-events-none absolute -right-2 top-16 h-32 w-32 rounded-full border border-white/10" aria-hidden />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-marigold-300">Weekly demand plan</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {run ? (run.status === "HALTED" ? "This week needs manual planning" : pendingUrgent ? `${pendingUrgent} urgent SKU${pendingUrgent > 1 ? "s" : ""} need you` : decided === recs.length ? "All decisions made" : "Ready for review") : "No plan yet this week"}
            </h1>
            <p className="mt-2 text-sm text-white/75">
              {run ? (
                <>
                  Run #{run.id} for <strong className="text-white">{prettyDay(run.runDate)}</strong> · {recs.length} SKUs
                  {(totals.festivalFactor ?? 1) > 1 && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-marigold-500/20 px-2 py-0.5 text-xs font-semibold text-marigold-300 ring-1 ring-marigold-300/40">
                      <Icon name="spark" className="h-3 w-3" /> Festival uplift ×{totals.festivalFactor}
                    </span>
                  )}
                </>
              ) : (
                "Load this week's SAP export, then run the engine. It takes a few seconds."
              )}
            </p>

            {run && run.status === "COMPLETED" && (
              <div className="mt-6">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold">Review progress</span>
                  <span className="tabular text-white/80">
                    {decided} of {recs.length} decided
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
                  <div className="animate-grow-x h-full origin-left rounded-full bg-gradient-to-r from-marigold-300 to-marigold-500" style={{ width: `${Math.max(progress * 100, 2)}%` }} />
                </div>
                <Link href={`/runs/${run.id}${pendingUrgent ? "?flag=EXCEPTION" : ""}`} className="btn btn-accent mt-5 px-4 py-2.5 text-sm">
                  {decided === recs.length ? "View decisions" : pendingUrgent ? "Start with exceptions" : "Continue review"}
                  <Icon name="arrow" />
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">New run</p>
            <RunEngineButton defaultDate={defDate} tone="dark" />
          </div>
        </div>
      </section>

      {run?.status === "HALTED" && (
        <Banner tone="red" title="Guardrail tripped: plan manually this week" icon="shield">
          {run.haltReason} No recommendations were saved. Tell Deepa.
        </Banner>
      )}

      {/* ---------- Work queue ---------- */}
      {run && run.status === "COMPLETED" && (
        <section>
          <SectionTitle aside={<Link href={`/runs/${run.id}`} className="text-sm font-semibold text-forest-700 hover:underline">See all {recs.length} →</Link>}>
            This week by urgency
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {FLAG_ORDER.map((f, i) => {
              const m = FLAG_META[f];
              const count = totals.byFlag?.[f] ?? 0;
              const pending = recs.filter((r) => r.flag === f && r.status === "PENDING").length;
              const dark = f === "EXCEPTION";
              return (
                <Link
                  key={f}
                  href={`/runs/${run.id}?flag=${f}`}
                  style={rise(i + 1)}
                  className={`card card-hover animate-rise group relative flex flex-col p-4 ${dark ? "!border-exc !bg-exc text-white" : ""} ${count === 0 ? "opacity-70" : ""}`}
                >
                  <span className={`inline-grid h-9 w-9 place-items-center rounded-xl ${dark ? "bg-white/10 text-marigold-300" : `${m.bg} ${m.fg}`}`}>
                    <Icon name={m.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className={`mt-3 text-3xl font-extrabold tracking-tight ${dark ? "" : "text-ink"}`}>
                    <AnimatedNumber value={count} />
                  </span>
                  <span className="text-sm font-bold">{m.label}</span>
                  <span className={`mt-1 text-xs leading-snug ${dark ? "text-white/65" : "text-muted"}`}>{m.hint}</span>
                  {pending > 0 && f !== "OK" && (
                    <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold ${dark ? "bg-marigold-500 text-forest-900" : "bg-paper text-muted ring-1 ring-line"}`}>
                      {pending} to do
                    </span>
                  )}
                  <Icon name="arrow" className={`absolute bottom-4 right-4 h-4 w-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 ${dark ? "text-marigold-300" : "text-forest-600"}`} />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- Health ---------- */}
      {run && run.status === "COMPLETED" && (
        <section>
          <SectionTitle>Safety &amp; kill metrics</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex items-center gap-5 p-5" style={rise(7)}>
              <div className="w-36 shrink-0 sm:w-40">
                <Gauge ratio={ratio} limit={limit} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                  <Icon name="shield" className="h-3.5 w-3.5" /> Guardrail
                </div>
                <div className={`mt-1 text-2xl font-extrabold ${ratio > limit ? "text-risk" : "text-forest-700"}`}>
                  {ratio > limit ? "Tripped" : "Passed"} · <AnimatedNumber value={ratio} decimals={2} suffix="×" />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {n0(totals.recommendedQty)} recommended vs {n0(totals.baselineQty)} if every SKU ordered its standard qty ({totals.guardrailBasis}). Halts above {limit}×.
                </p>
              </div>
            </Card>

            <Card className="p-5" style={rise(8)}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                  <Icon name="spark" className="h-3.5 w-3.5" /> Exception rate
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${metrics.exceptionBand === "within" ? "bg-ok-soft text-forest-700" : "bg-over-soft text-over"}`}>
                  {metrics.exceptionBand === "within" ? "In band" : metrics.exceptionBand === "above" ? "Above band" : "Below band"}
                </span>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-ink">
                <AnimatedNumber value={metrics.exceptionRate * 100} suffix="%" />
              </div>
              <BandMeter value={metrics.exceptionRate} band={[exBand.min, exBand.max]} max={0.5} tone={metrics.exceptionBand === "within" ? "ok" : "warn"} />
              <p className="mt-2 text-xs text-muted">
                Expected {pct(exBand.min)}–{pct(exBand.max)} (the share Raghav handles on judgment). {metrics.latestRun?.exceptions ?? 0} of {metrics.latestRun?.recommendations ?? 0} SKUs.{" "}
                <Link href="/exceptions" className="font-semibold text-forest-700 hover:underline">
                  Open
                </Link>
              </p>
            </Card>

            <Card className="p-5" style={rise(9)}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                  <Icon name="users" className="h-3.5 w-3.5" /> Override rate
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${metrics.overrideWarn ? "bg-risk-soft text-risk" : "bg-ok-soft text-forest-700"}`}>
                  {metrics.overrideWarn ? "Review rules" : "Healthy"}
                </span>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-ink">
                <AnimatedNumber value={metrics.overrideRate * 100} suffix="%" />
              </div>
              <BandMeter value={metrics.overrideRate} band={[0, metrics.overrideRateWarnAt]} max={1} tone={metrics.overrideWarn ? "bad" : "ok"} />
              <p className="mt-2 text-xs text-muted">
                Warn above {pct(metrics.overrideRateWarnAt)}. {metrics.decisions.approve} approved · {metrics.decisions.override} overridden · {metrics.decisions.reject} rejected (all runs).
              </p>
            </Card>
          </div>
        </section>
      )}

      <Banner tone="forest" title="Kill metric for Deepa" icon="info">
        {metrics.killRule} The app reports; Deepa decides. Runs so far: {metrics.runs.total} ({metrics.runs.halted} halted).
      </Banner>

      {warnings.length > 0 && (
        <details className="card animate-rise group p-5" style={rise(10)}>
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">
            <span className="flex items-center gap-2">
              <Icon name="info" className="h-4 w-4 text-marigold-700" /> Data limitations in this run ({warnings.length})
            </span>
            <span className="text-muted transition-transform duration-200 group-open:rotate-90">
              <Icon name="arrow" />
            </span>
          </summary>
          <ul className="mt-3 space-y-1.5 pl-6 text-sm text-muted marker:text-faint [list-style:disc]">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
