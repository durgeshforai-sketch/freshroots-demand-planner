"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
      <div className="font-semibold">Something went wrong</div>
      <p className="mt-1 text-sm">{error.message || "Unexpected error."} If the database is not configured, check DATABASE_URL.</p>
      <button onClick={reset} className="mt-3 rounded bg-red-800 px-3 py-1.5 text-sm text-white">Try again</button>
    </div>
  );
}
