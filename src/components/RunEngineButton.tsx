"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui";

export function RunEngineButton({ defaultDate, tone = "light" }: { defaultDate: string; tone?: "light" | "dark" }) {
  const router = useRouter();
  const [runDate, setRunDate] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dark = tone === "dark";

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runDate }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Run failed");
      router.push(`/runs/${body.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-sm">
        <span className={`mb-1 flex items-center gap-1 text-xs ${dark ? "text-white/70" : "text-muted"}`}>
          <Icon name="calendar" className="h-3 w-3" /> Run date
        </span>
        <input
          type="date"
          value={runDate}
          onChange={(e) => setRunDate(e.target.value)}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold tabular outline-none transition ${
            dark ? "border-white/20 bg-white/10 text-white [color-scheme:dark] focus:border-marigold-300" : "input w-auto"
          }`}
        />
      </label>
      <button onClick={run} disabled={busy || !runDate} className={`btn px-4 py-2 text-sm ${dark ? "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25" : "btn-primary"}`}>
        {busy ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> Running…
          </>
        ) : (
          <>
            <Icon name="play" className="h-3.5 w-3.5" /> Run engine
          </>
        )}
      </button>
      {error && (
        <p className={`animate-rise w-full text-sm ${dark ? "text-marigold-300" : "text-risk"}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
