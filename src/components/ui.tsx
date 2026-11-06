import type { CSSProperties, ReactNode } from "react";

// ---------- Flags ----------
// Ordered by urgency: the order planners should work through them.
export const FLAG_ORDER = ["EXCEPTION", "STOCKOUT_RISK", "HIGH_DEMAND", "OVERSTOCK", "WATCH", "OK"] as const;

export const FLAG_META: Record<string, { label: string; short: string; hint: string; fg: string; bg: string; dot: string; icon: IconName }> = {
  EXCEPTION: { label: "Needs Raghav", short: "Exception", hint: "No auto quantity. Your call.", fg: "text-white", bg: "bg-exc", dot: "bg-marigold-300", icon: "spark" },
  STOCKOUT_RISK: { label: "Stockout risk", short: "Stockout", hint: "Below minimum cover. Reorder now.", fg: "text-risk", bg: "bg-risk-soft", dot: "bg-risk", icon: "alert" },
  HIGH_DEMAND: { label: "High demand", short: "Surge", hint: "Confirmed 2-week surge. 1.5× order.", fg: "text-surge", bg: "bg-surge-soft", dot: "bg-surge", icon: "trend" },
  OVERSTOCK: { label: "Overstock", short: "Overstock", hint: "Above maximum cover. Pause next order.", fg: "text-over", bg: "bg-over-soft", dot: "bg-over", icon: "pause" },
  WATCH: { label: "Watch", short: "Watch", hint: "One-week spike. Retest next run.", fg: "text-watch", bg: "bg-watch-soft", dot: "bg-watch", icon: "eye" },
  OK: { label: "On track", short: "OK", hint: "Cover inside the window. No change.", fg: "text-ok", bg: "bg-ok-soft", dot: "bg-ok", icon: "check" },
};

export function FlagBadge({ flag, size = "sm" }: { flag: string; size?: "sm" | "md" }) {
  const m = FLAG_META[flag] ?? { label: flag, fg: "text-ink", bg: "bg-paper", dot: "bg-faint" };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${m.bg} ${m.fg} ${size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden />
      {m.label}
    </span>
  );
}

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-paper text-muted ring-1 ring-line" },
  APPROVED: { label: "Approved", cls: "bg-ok-soft text-forest-700" },
  OVERRIDDEN: { label: "Overridden", cls: "bg-surge-soft text-surge" },
  REJECTED: { label: "Rejected", cls: "bg-risk-soft text-risk" },
};

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, cls: "bg-paper text-muted" };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${m.cls}`}>{m.label}</span>;
}

// ---------- Layout ----------
/** Staggered entrance: pass an index to delay each item a little more. */
export const rise = (i = 0): CSSProperties => ({ animationDelay: `${Math.min(i, 12) * 55}ms` });

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`card animate-rise ${className}`} style={style}>{children}</div>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {aside}
    </div>
  );
}

export function Banner({ tone, title, children, icon }: { tone: "red" | "amber" | "forest"; title: string; children?: ReactNode; icon?: IconName }) {
  const cls =
    tone === "red" ? "border-risk/30 bg-risk-soft text-risk" : tone === "amber" ? "border-marigold-300 bg-marigold-100 text-marigold-700" : "border-forest-200 bg-forest-50 text-forest-800";
  return (
    <div role={tone === "red" ? "alert" : "status"} className={`animate-rise flex gap-3 rounded-2xl border p-4 ${cls}`}>
      {icon && <Icon name={icon} className="mt-0.5 h-5 w-5 shrink-0" />}
      <div>
        <div className="font-bold">{title}</div>
        {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
      </div>
    </div>
  );
}

// ---------- Meters ----------
/**
 * Horizontal meter with a shaded target band, e.g. exception rate vs 15–20%.
 * `max` is the right edge of the scale.
 */
export function BandMeter({ value, band, max, tone }: { value: number; band: [number, number]; max: number; tone: "ok" | "warn" | "bad" }) {
  const pctOf = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const bar = tone === "ok" ? "bg-forest-500" : tone === "warn" ? "bg-marigold-500" : "bg-risk";
  return (
    <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-paper ring-1 ring-line" aria-hidden>
      <div className="absolute inset-y-0 bg-forest-100" style={{ left: pctOf(band[0]), width: `calc(${pctOf(band[1])} - ${pctOf(band[0])})` }} />
      <div className={`animate-grow-x absolute inset-y-0 left-0 origin-left rounded-full ${bar}`} style={{ width: pctOf(value) }} />
    </div>
  );
}

/**
 * Weeks-of-cover visual: the min–max window is shaded, the marker is where stock sits.
 * Planners read "left of the band = reorder, right of the band = overstock" at a glance.
 */
export function CoverBar({ woc, min, max, flag }: { woc: number; min: number; max: number; flag: string }) {
  const scale = Math.max(max * 1.5, woc * 1.1, min * 2);
  const p = (v: number) => Math.max(0, Math.min(100, (v / scale) * 100));
  const tone = woc < min ? "bg-risk" : woc > max ? "bg-over" : "bg-forest-500";
  return (
    <div className="w-36" title={`${woc.toFixed(1)} weeks of cover · window ${min}–${max} weeks`}>
      <div className="relative h-2 rounded-full bg-paper ring-1 ring-line">
        <div className="absolute inset-y-0 rounded-full bg-forest-100" style={{ left: `${p(min)}%`, width: `${p(max) - p(min)}%` }} />
        <div className={`animate-grow-x absolute inset-y-0 left-0 origin-left rounded-full opacity-35 ${tone}`} style={{ width: `${p(woc)}%` }} />
        <div
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${tone} ${flag === "STOCKOUT_RISK" ? "animate-pulse-ring" : ""}`}
          style={{ left: `${p(woc)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-faint tabular">
        <span>{woc >= 999 ? "∞" : woc.toFixed(1)} wk</span>
        <span>
          {min}–{max}
        </span>
      </div>
    </div>
  );
}

// ---------- Icons (inline, no dependency) ----------
export type IconName = "alert" | "trend" | "pause" | "eye" | "check" | "spark" | "play" | "shield" | "gauge" | "users" | "leaf" | "arrow" | "info" | "calendar" | "box" | "flag" | "logout" | "x";

const PATHS: Record<IconName, ReactNode> = {
  alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
  trend: <><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>,
  pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  spark: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></>,
  play: <path d="m7 4 13 8-13 8V4Z" />,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  gauge: <><path d="m12 14 4-4" /><path d="M3.3 19a10 10 0 1 1 17.4 0" /></>,
  users: <><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9" /></>,
  leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" /><path d="M2 21c0-3 1.9-5.4 5.1-6" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>,
  flag: <><path d="M4 22V4" /><path d="M4 4h13l-2 4 2 4H4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  x: <path d="M18 6 6 18M6 6l12 12" />,
};

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span className={`inline-grid place-items-center rounded-xl bg-forest-700 text-marigold-300 shadow-sm ${className}`}>
      <Icon name="leaf" className="h-[60%] w-[60%]" />
    </span>
  );
}

// ---------- Formatters ----------
export const n0 = (v: number | null | undefined) => (v === null || v === undefined ? "—" : Math.round(v).toLocaleString("en-IN"));
export const n1 = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("en-IN", { maximumFractionDigits: 1, minimumFractionDigits: 1 }));
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const day = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));
export const prettyDay = (d: Date | string) =>
  new Date(`${day(d)}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
