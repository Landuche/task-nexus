import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { Toaster } from "sonner";
import { DebugMenu } from "@/components/DebugMenu";
import { TRPCProvider } from "@/trpc/Provider";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Tasks", template: "%s · Tasks" },
  description: "A simple task manager built with Next.js 15 and tRPC",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <TRPCProvider>
          <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
            <nav className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="grid size-7 place-items-center rounded-md bg-accent text-white">
                  <CheckSquare className="size-4" aria-hidden />
                </span>
                Tasks
              </Link>
              <DebugMenu />
            </nav>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
          <Toaster richColors closeButton position="bottom-right" />
        </TRPCProvider>
      </body>
    </html>
  );
}
