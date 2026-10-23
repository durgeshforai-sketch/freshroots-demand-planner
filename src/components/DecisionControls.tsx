"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { reasonCodes } from "@/config/reasonCodes";

type Action = "APPROVE" | "OVERRIDE" | "REJECT";

export function DecisionControls({ recId, flag, qty }: { recId: number; flag: string; qty: number }) {
  const router = useRouter();
  const isException = flag === "EXCEPTION";
  const [action, setAction] = useState<Action | null>(null);
  const [newQty, setNewQty] = useState(String(qty));
  const [reasonCode, setReasonCode] = useState("AGREE");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(a: Action) {
    setAction(a);
    setError(null);
    setReasonCode(a === "APPROVE" ? "AGREE" : "LOCAL_KNOWLEDGE");
  }

  async function submit() {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { action, reasonCode, note: note || undefined };
      if (action === "OVERRIDE") body.newQty = Number(newQty);
      const res = await fetch(`/api/recommendations/${recId}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error?.message ?? "Could not save decision");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save decision");
      setBusy(false);
    }
  }

  if (!action)
    return (
      <div className="flex flex-wrap gap-1">
        {!isException && <button onClick={() => open("APPROVE")} className="rounded border border-emerald-600 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50">Approve</button>}
        <button onClick={() => open("OVERRIDE")} className="rounded border border-violet-500 px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-50">{isException ? "Decide qty" : "Override"}</button>
        <button onClick={() => open("REJECT")} className="rounded border border-red-400 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">Reject</button>
      </div>
    );

  const codes = Object.entries(reasonCodes).filter(([k]) => (action === "APPROVE" ? true : k !== "AGREE"));
  return (
    <div className="min-w-56 space-y-2 rounded border border-slate-200 bg-slate-50 p-2 text-xs">
      <div className="font-medium">{action === "APPROVE" ? "Approve" : action === "OVERRIDE" ? "Override quantity" : "Reject"}</div>
      {action === "OVERRIDE" && (
        <label className="block">Quantity
          <input type="number" min={0} value={newQty} onChange={(e) => setNewQty(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1" />
        </label>
      )}
      <label className="block">Reason
        <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-1 py-1">
          {codes.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="block">Note (optional)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1" />
      </label>
      {error && <p className="text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="rounded bg-slate-900 px-2 py-1 font-medium text-white disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
        <button onClick={() => setAction(null)} disabled={busy} className="rounded px-2 py-1 text-slate-600 hover:bg-slate-200">Cancel</button>
      </div>
    </div>
  );
}
