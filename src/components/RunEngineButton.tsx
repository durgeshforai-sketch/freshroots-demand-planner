"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunEngineButton({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [runDate, setRunDate] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <span className="block text-xs text-slate-500">Run date</span>
        <input type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5" />
      </label>
      <button onClick={run} disabled={busy || !runDate} className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        {busy ? "Running…" : "Run engine"}
      </button>
      {error && <p className="w-full text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
