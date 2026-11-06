"use client";
import { useState } from "react";
import { Icon } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [shake, setShake] = useState(0);

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
      setShake((n) => n + 1);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label className="block text-sm font-semibold" htmlFor="password">
        Password
      </label>
      <div key={shake} className={`relative ${shake ? "animate-[shake_0.35s_ease-in-out]" : ""}`}>
        <input id="password" name="password" type={show ? "text" : "password"} required autoFocus autoComplete="current-password" className="input py-2.5 pr-16" />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-ink">
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {error && (
        <p className="animate-rise flex items-center gap-1.5 text-sm text-risk" role="alert">
          <Icon name="alert" className="h-4 w-4" /> {error}
        </p>
      )}
      <button disabled={busy} className="btn btn-primary w-full py-2.5">
        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Icon name="arrow" />}
        {busy ? "Checking…" : "Open planner"}
      </button>
    </form>
  );
}
