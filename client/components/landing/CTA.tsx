"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { track } from "@/lib/umami";

export function CTA({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="privacy" className="mx-auto max-w-7xl px-6 lg:px-10 py-20">
      <div className="rounded-lg bg-primary text-on-dark px-8 py-16 lg:px-16 lg:py-20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">

        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
            Bring your own key
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-medium tracking-tight">
            Your key is secure.
          </h2>
          <p className="mt-4 text-on-dark/60 text-lg leading-relaxed">
            Bring your Gemini API key. We use it for the job and nothing else.
          </p>
        </div>

        <Link
          href={signedIn ? "/dashboard" : "/signin"}
          onClick={() => track("landing_cta_click", { location: "cta" })}
          className="shrink-0"
        >
          <Button
            size="lg"
            className="bg-coral text-white hover:bg-coral/90 active:scale-[0.98] transition border-0"
          >
            {signedIn ? "Open Dashboard" : "Get started"}
          </Button>
        </Link>

      </div>
    </section>
  );
}
