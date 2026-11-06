"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", match: (p: string) => p === "/" },
  { href: "/runs/latest", label: "Review", match: (p: string) => p.startsWith("/runs") },
  { href: "/exceptions", label: "Exceptions", match: (p: string) => p.startsWith("/exceptions") },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex w-full items-center gap-1 rounded-full bg-paper p-1 ring-1 ring-line sm:w-auto" aria-label="Main">
      {LINKS.map((l) => {
        const active = l.match(path);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 rounded-full px-3.5 py-1.5 text-center sm:flex-none text-sm font-semibold transition-all duration-200 ${
              active ? "bg-white text-forest-800 shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
