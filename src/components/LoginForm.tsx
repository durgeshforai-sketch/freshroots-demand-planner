"use client";
import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const password = new FormData(e.currentTarget).get("password");
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, next }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Login failed");
      window.location.assign(body.next ?? "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label className="block text-sm font-medium" htmlFor="password">Password</label>
      <input id="password" name="password" type="password" required autoFocus className="w-full rounded border border-slate-300 px-3 py-2" />
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-emerald-700 px-3 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
