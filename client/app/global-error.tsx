"use client";

// global-error replaces the root layout when the layout itself throws, so it must
// render its own <html>/<body> and pull in the stylesheet. next/font isn't
// available here, so type falls back to the system stack defined in globals.css.
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-primary antialiased">
        <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-coral" />
            <span className="font-mono text-sm tracking-[0.18em] uppercase">RecallAI</span>
          </div>

          <p className="mt-12 font-mono text-xs uppercase tracking-[0.22em] text-coral">
            Something went wrong
          </p>
          <h1 className="mt-5 text-4xl sm:text-5xl font-medium tracking-tight leading-[1.05]">
            The app hit a snag.
          </h1>
          <p className="mt-5 max-w-md text-body-muted text-lg leading-relaxed">
            An unexpected error stopped RecallAI from loading. Reloading usually clears it.
          </p>

          <button
            onClick={() => reset()}
            className="mt-9 inline-flex items-center justify-center h-12 px-7 rounded-full bg-primary text-on-primary text-[15px] font-medium tracking-tight hover:bg-cohere-black active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-blue"
          >
            Reload
          </button>

          {error?.digest && (
            <p className="mt-6 font-mono text-xs text-muted">Ref: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
