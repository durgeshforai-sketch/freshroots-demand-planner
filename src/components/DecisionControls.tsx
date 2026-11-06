"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui";
import { reasonCodes } from "@/config/reasonCodes";

type Action = "APPROVE" | "OVERRIDE" | "REJECT";

const ACTION_UI: Record<Action, { label: string; cls: string; title: string }> = {
  APPROVE: { label: "Approve", cls: "bg-forest-700 text-white hover:bg-forest-800", title: "Approve" },
  OVERRIDE: { label: "Override", cls: "bg-white text-surge ring-1 ring-surge/30 hover:bg-surge-soft", title: "Override quantity" },
  REJECT: { label: "Reject", cls: "bg-white text-risk ring-1 ring-risk/25 hover:bg-risk-soft", title: "Reject" },
};

export function DecisionControls({ recId, flag, qty }: { recId: number; flag: string; qty: number }) {
  const router = useRouter();
  const isException = flag === "EXCEPTION";
  const [action, setAction] = useState<Action | null>(null);
  const [newQty, setNewQty] = useState(String(qty || ""));
  const [reasonCode, setReasonCode] = useState("AGREE");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(a: Action) {
    setAction(a);
    setError(null);
    setReasonCode(a === "APPROVE" ? "AGREE" : "LOCAL_KNOWLEDGE");
  }

  async function submit(a: Action = action!) {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { action: a, reasonCode: a === "APPROVE" && !action ? "AGREE" : reasonCode, note: note || undefined };
      if (a === "OVERRIDE") body.newQty = Number(newQty);
      const res = await fetch(`/api/recommendations/${recId}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error?.message ?? "Could not save decision");
      setSaved(true);
      setTimeout(() => router.refresh(), 650); // let the confirmation play
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save decision");
      setBusy(false);
    }
  }

  if (saved)
    return (
      <div className="animate-pop inline-flex items-center gap-2 rounded-full bg-ok-soft px-3 py-1.5 text-xs font-bold text-forest-700" role="status">
        <Icon name="check" className="h-4 w-4" /> Saved
      </div>
    );

  if (!action)
    return (
      <div className="flex flex-wrap gap-1.5 xl:flex-nowrap">
        {isException ? (
          <button onClick={() => open("OVERRIDE")} className="btn bg-exc px-3 py-1.5 text-xs text-white hover:bg-forest-900">
            <Icon name="spark" className="h-3.5 w-3.5 text-marigold-300" /> Decide qty
          </button>
        ) : (
          // One-click approve for the common case; reason defaults to "Agree with engine".
          <button onClick={() => submit("APPROVE")} disabled={busy} className={`btn px-3 py-1.5 text-xs ${ACTION_UI.APPROVE.cls}`}>
            {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Icon name="check" className="h-3.5 w-3.5" />}
            Approve
          </button>
        )}
        {!isException && (
          <button onClick={() => open("OVERRIDE")} className={`btn px-2.5 py-1.5 text-xs ${ACTION_UI.OVERRIDE.cls}`}>
            Override
          </button>
        )}
        <button onClick={() => open("REJECT")} className={`btn px-2.5 py-1.5 text-xs ${ACTION_UI.REJECT.cls}`} aria-label="Reject">
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
        {error && <p className="w-full text-xs text-risk" role="alert">{error}</p>}
      </div>
    );

  const codes = Object.entries(reasonCodes).filter(([k]) => (action === "APPROVE" ? true : k !== "AGREE"));
  return (
    <div className="animate-pop w-60 space-y-2.5 rounded-xl bg-white p-3 text-xs shadow-[var(--shadow-lift)] ring-1 ring-line">
      <div className="flex items-center justify-between">
        <span className="font-bold text-ink">{action === "OVERRIDE" ? (isException ? "Raghav's quantity" : "Override quantity") : ACTION_UI[action].title}</span>
        <button onClick={() => setAction(null)} className="text-faint hover:text-ink" aria-label="Cancel">
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      </div>
      {action === "OVERRIDE" && (
        <label className="block font-semibold text-muted">
          Units
          <input type="number" min={0} value={newQty} onChange={(e) => setNewQty(e.target.value)} autoFocus className="input mt-1 py-1.5 text-sm font-bold tabular text-ink" />
        </label>
      )}
      <label className="block font-semibold text-muted">
        Reason
        <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="input mt-1 py-1.5 text-ink">
          {codes.map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-semibold text-muted">
        Note <span className="font-normal text-faint">(optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="input mt-1 py-1.5 text-ink" />
      </label>
      {error && (
        <p className="text-risk" role="alert">
          {error}
        </p>
      )}
      <button onClick={() => submit()} disabled={busy || (action === "OVERRIDE" && newQty === "")} className={`btn w-full py-2 text-xs ${action === "REJECT" ? "bg-risk text-white hover:opacity-90" : "btn-primary"}`}>
        {busy ? "Saving…" : action === "REJECT" ? "Reject recommendation" : "Save decision"}
      </button>
    </div>
  );
}
