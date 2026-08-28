import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estimation e-commerce | Dn'D",
  description: "Outil interne d'estimation de projets e-commerce",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                E
              </span>
              <span className="text-sm font-semibold text-slate-900">
                Estimation e-commerce
                <span className="ml-1.5 text-slate-400">· Presales</span>
              </span>
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
