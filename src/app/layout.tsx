import type { Metadata } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import { NavLinks } from "@/components/NavLinks";
import { Icon, LogoMark } from "@/components/ui";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: "Freshroots Demand Planner",
  description: "Weekly reorder recommendations from Raghav's rules. The engine recommends, Raghav decides, procurement orders.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5">
              <LogoMark className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6" />
              <span className="leading-tight">
                <span className="block text-[15px] font-extrabold tracking-tight text-forest-900">Freshroots</span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Demand planner</span>
              </span>
            </Link>
            <div className="order-last w-full sm:order-none sm:w-auto">
              <NavLinks />
            </div>
            <form action="/api/logout" method="post" className="ml-auto">
              <button className="btn btn-ghost px-3 py-1.5 text-sm" title="Log out">
                <Icon name="logout" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

        <footer className="border-t border-line py-4">
          <ol className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-xs text-muted" aria-label="How a decision flows">
            {["Engine recommends", "Raghav approves or overrides", "Pre-placement check", "Procurement orders"].map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                {i > 0 && <Icon name="arrow" className="h-3 w-3 text-faint" />}
                <span className={i === 1 ? "font-semibold text-forest-700" : ""}>{s}</span>
              </li>
            ))}
          </ol>
        </footer>
      </body>
    </html>
  );
}
