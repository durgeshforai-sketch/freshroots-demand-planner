import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-sm">
      <h1 className="text-lg font-semibold">Not found</h1>
      <Link href="/" className="underline">Back to the latest run</Link>
    </div>
  );
}
