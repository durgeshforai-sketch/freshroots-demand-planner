"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface CheckView { id: number; result: string; triggers: string[]; ownerDecision: string | null; checkedAt: string }

export function PreplacementButton({ recId, last }: { recId: number; last: CheckView | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owner, setOwner] = useState("");

  async function call(body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recommendations/${recId}/preplacement-check`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error?.message ?? "Check failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1 text-xs">
      {last && (
        <div className={last.result === "HOLD" ? "text-amber-800" : "text-emerald-700"}>
          <span className="font-semibold">{last.result}</span>
          {last.ownerDecision && <span> · {last.ownerDecision}</span>}
          {last.triggers.length > 0 && <ul className="ml-4 list-disc text-slate-600">{last.triggers.map((t, i) => <li key={i}>{t}</li>)}</ul>}
        </div>
      )}
      {last?.result === "HOLD" && !last.ownerDecision ? (
        <div className="flex flex-wrap items-center gap-1">
          <input placeholder="Owner name" value={owner} onChange={(e) => setOwner(e.target.value)} className="w-28 rounded border border-slate-300 px-1 py-0.5" />
          {(["PROCEED", "REDUCE", "CANCEL"] as const).map((d) => (
            <button key={d} disabled={busy || !owner.trim()} onClick={() => call({ owner, ownerDecision: d })} className="rounded border border-slate-400 px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-50">{d.toLowerCase()}</button>
          ))}
        </div>
      ) : (
        <button disabled={busy} onClick={() => call({})} className="rounded border border-sky-500 px-2 py-1 font-medium text-sky-800 hover:bg-sky-50 disabled:opacity-60">
          {busy ? "Checking…" : "Pre-placement check"}
        </button>
      )}
      {error && <p className="text-red-700" role="alert">{error}</p>}
    </div>
  );
}
