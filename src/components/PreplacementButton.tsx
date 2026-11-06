"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui";

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

  const hold = last?.result === "HOLD";
  return (
    <div className="space-y-1.5 text-xs">
      {last && (
        <div className={`animate-pop rounded-lg p-2 ${hold ? "bg-over-soft text-over" : "bg-ok-soft text-forest-700"}`}>
          <div className="flex items-center gap-1.5 font-bold">
            <Icon name={hold ? "pause" : "shield"} className="h-3.5 w-3.5" />
            {hold ? "On hold" : "Clear to order"}
            {last.ownerDecision && <span className="font-semibold opacity-80">· {last.ownerDecision}</span>}
          </div>
          {last.triggers.length > 0 && (
            <ul className="ml-5 mt-1 list-disc space-y-0.5 text-[11px] text-muted">
              {last.triggers.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {hold && !last?.ownerDecision ? (
        <div className="space-y-1.5">
          <input placeholder="Owner name" value={owner} onChange={(e) => setOwner(e.target.value)} className="input py-1 text-xs" />
          <div className="flex gap-1">
            {(["PROCEED", "REDUCE", "CANCEL"] as const).map((d) => (
              <button
                key={d}
                disabled={busy || !owner.trim()}
                onClick={() => call({ owner, ownerDecision: d })}
                className={`btn flex-1 px-1.5 py-1 text-[11px] ring-1 ${d === "CANCEL" ? "text-risk ring-risk/30 hover:bg-risk-soft" : d === "REDUCE" ? "text-over ring-over/30 hover:bg-over-soft" : "text-forest-700 ring-forest-200 hover:bg-ok-soft"}`}
              >
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button disabled={busy} onClick={() => call({})} className="btn bg-watch-soft px-2.5 py-1.5 text-[11px] text-watch hover:brightness-95">
          {busy ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="shield" className="h-3.5 w-3.5" />}
          {last ? "Re-check before ordering" : "Pre-placement check"}
        </button>
      )}
      {error && (
        <p className="text-risk" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
