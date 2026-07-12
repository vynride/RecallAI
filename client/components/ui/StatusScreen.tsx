import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/ui/LogoMark";

// Shared pill-link styling that mirrors Button's `primary` variant, for use as an
// anchor (navigation) where a real <button> isn't appropriate.
export const primaryActionClass =
  "inline-flex items-center justify-center h-12 px-7 rounded-pill bg-primary text-on-primary " +
  "text-[15px] font-medium tracking-tight hover:bg-cohere-black active:scale-[0.98] transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-blue";

export const secondaryLinkClass =
  "text-sm text-ink underline underline-offset-4 decoration-1 hover:decoration-2 transition";

/**
 * Editorial full-page status shell (404 / error boundaries). White canvas, a mono
 * coral eyebrow, a tight display headline, and centered actions — per DESIGN.md.
 */
export function StatusScreen({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-canvas text-primary flex flex-col">
      <header className="px-6 sm:px-10 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2.5" aria-label="RecallAI home">
          <LogoMark size={24} />
          <span className="font-mono text-sm tracking-[0.18em] uppercase">RecallAI</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-coral">{eyebrow}</p>
          <h1 className="mt-5 text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05] text-balance">
            {title}
          </h1>
          <div className="mt-5 text-body-muted text-lg leading-relaxed text-pretty">
            {description}
          </div>
          {actions && (
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              {actions}
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 sm:px-10 h-16 flex items-center">
        <p className="font-mono text-xs text-muted">© RecallAI</p>
      </footer>
    </main>
  );
}
