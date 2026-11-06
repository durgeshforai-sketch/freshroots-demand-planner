import Link from "next/link";
import { Icon } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="card animate-rise mx-auto max-w-lg p-8 text-center">
      <Icon name="box" className="mx-auto h-12 w-12 rounded-full bg-paper p-2.5 text-faint ring-1 ring-line" />
      <h1 className="mt-4 text-xl font-extrabold">Not found</h1>
      <p className="mt-2 text-sm text-muted">That run or SKU doesn&apos;t exist.</p>
      <Link href="/" className="btn btn-primary mt-5 px-4 py-2 text-sm">
        Back to dashboard
      </Link>
    </div>
  );
}
