import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freshroots Demand Planner",
  description: "Weekly reorder recommendations from Raghav's rules. The engine recommends, Raghav decides, procurement orders.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold text-emerald-800">Freshroots Planner</Link>
            <Link href="/" className="text-slate-700 hover:text-slate-950">Latest run</Link>
            <Link href="/exceptions" className="text-slate-700 hover:text-slate-950">Exceptions</Link>
            <form action="/api/logout" method="post" className="ml-auto">
              <button className="text-slate-500 hover:text-slate-900">Log out</button>
            </form>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 py-3 text-center text-xs text-slate-500">
          The engine recommends · Raghav approves or overrides · Procurement places the order
        </footer>
      </body>
    </html>
  );
}
