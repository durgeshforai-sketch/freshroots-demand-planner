import { LoginForm } from "@/components/LoginForm";
import { Icon, LogoMark } from "@/components/ui";

export const metadata = { title: "Log in · Freshroots Planner" };

const POINTS = [
  { icon: "spark" as const, text: "Raghav's rules run on fresh SAP data in seconds, not two days." },
  { icon: "users" as const, text: "The engine recommends. People approve every order." },
  { icon: "shield" as const, text: "Exceptions, a guardrail and a pre-placement check keep it safe." },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    // Full-screen overlay so the app chrome doesn't show before login.
    <div className="fixed inset-0 z-50 grid overflow-y-auto bg-paper lg:grid-cols-[1.1fr_1fr]">
      <aside className="brand-texture relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full border border-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full border border-white/10" aria-hidden />
        <div className="animate-rise flex items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <span className="text-lg font-extrabold tracking-tight">Freshroots</span>
        </div>
        <div className="relative max-w-md">
          <p className="animate-rise text-xs font-bold uppercase tracking-[0.18em] text-marigold-300" style={{ animationDelay: "80ms" }}>
            Demand planning
          </p>
          <h1 className="animate-rise mt-3 text-4xl font-extrabold leading-tight tracking-tight" style={{ animationDelay: "140ms" }}>
            Fewer stockouts. Less waste. Same trusted judgment.
          </h1>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p, i) => (
              <li key={p.text} className="animate-rise flex gap-3 text-white/80" style={{ animationDelay: `${240 + i * 90}ms` }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-marigold-300">
                  <Icon name={p.icon} />
                </span>
                <span className="pt-1 text-sm">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/50">Maharashtra &amp; Goa · 400 SKUs · 1,200 distributors</p>
      </aside>

      <section className="flex items-center justify-center p-6">
        <div className="animate-rise w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-10 w-10" />
            <span className="text-lg font-extrabold">Freshroots</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted">Enter the shared team password to open this week&apos;s plan.</p>
          <LoginForm next={typeof next === "string" ? next : "/"} />
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-white p-3 text-xs text-muted ring-1 ring-line">
            <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This is a simple shared-password gate, not individual accounts.
          </p>
        </div>
      </section>
    </div>
  );
}
