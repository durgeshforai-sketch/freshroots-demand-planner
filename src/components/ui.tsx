import type { ReactNode } from "react";

export const FLAG_STYLES: Record<string, { label: string; cls: string }> = {
  STOCKOUT_RISK: { label: "Stockout risk", cls: "bg-red-100 text-red-800 ring-red-200" },
  OVERSTOCK: { label: "Overstock", cls: "bg-amber-100 text-amber-900 ring-amber-200" },
  HIGH_DEMAND: { label: "High demand", cls: "bg-violet-100 text-violet-800 ring-violet-200" },
  WATCH: { label: "Watch", cls: "bg-sky-100 text-sky-800 ring-sky-200" },
  OK: { label: "OK", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  EXCEPTION: { label: "Exception → Raghav", cls: "bg-slate-800 text-white ring-slate-800" },
};

export const STATUS_STYLES: Record<string, string> = {
  PENDING: "text-slate-600",
  APPROVED: "text-emerald-700 font-medium",
  OVERRIDDEN: "text-violet-700 font-medium",
  REJECTED: "text-red-700 font-medium",
};

export function FlagBadge({ flag }: { flag: string }) {
  const s = FLAG_STYLES[flag] ?? { label: flag, cls: "bg-slate-100 text-slate-700 ring-slate-200" };
  return <span className={`inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ring-1 ${s.cls}`}>{s.label}</span>;
}

export function Card({ title, children, tone }: { title: string; children: ReactNode; tone?: "warn" | "ok" | "bad" }) {
  const ring = tone === "bad" ? "border-red-300" : tone === "warn" ? "border-amber-300" : tone === "ok" ? "border-emerald-300" : "border-slate-200";
  return (
    <div className={`rounded-lg border bg-white p-4 ${ring}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function Banner({ tone, title, children }: { tone: "red" | "amber" | "sky"; title: string; children?: ReactNode }) {
  const cls = tone === "red" ? "border-red-300 bg-red-50 text-red-900" : tone === "amber" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-sky-300 bg-sky-50 text-sky-900";
  return (
    <div role={tone === "red" ? "alert" : "status"} className={`rounded-lg border p-4 ${cls}`}>
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-1 text-sm">{children}</div>}
    </div>
  );
}

export const n0 = (v: number | null | undefined) => (v === null || v === undefined ? "—" : Math.round(v).toLocaleString("en-IN"));
export const n1 = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("en-IN", { maximumFractionDigits: 1, minimumFractionDigits: 1 }));
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const day = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));
