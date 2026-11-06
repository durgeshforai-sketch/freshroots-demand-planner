"use client";
import { Icon } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="card animate-rise mx-auto max-w-lg p-8 text-center">
      <Icon name="alert" className="mx-auto h-12 w-12 rounded-full bg-risk-soft p-2.5 text-risk" />
      <h1 className="mt-4 text-xl font-extrabold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">{error.message || "Unexpected error."} If the database isn&apos;t configured, check DATABASE_URL.</p>
      <button onClick={reset} className="btn btn-primary mt-5 px-4 py-2 text-sm">
        Try again
      </button>
    </div>
  );
}
