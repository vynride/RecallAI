"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { track } from "@/lib/umami";

const HEADLINE = "Question papers, decoded.";

// Segments must concatenate to exactly SAMPLE — verified by the SAMPLE const below
const SEGMENTS = [
  { text: "### ", cls: "text-coral" },
  { text: "Sorting Algorithms", cls: "text-on-dark font-semibold" },
  { text: "\n\n", cls: "" },
  { text: "- ", cls: "text-on-dark/40" },
  { text: "Q:", cls: "text-coral" },
  { text: " Compare quicksort and mergesort. Which is preferable when stability matters?", cls: "text-on-dark/85" },
  { text: "\n\n  ", cls: "" },
  { text: "*Tags: ", cls: "text-pale-green" },
  { text: "Moderate", cls: "text-[#fbbf24]" },
  { text: ", ", cls: "text-on-dark/50" },
  { text: "Conceptual", cls: "text-focus-blue" },
  { text: "*", cls: "text-pale-green" },
  { text: "\n  ", cls: "" },
  { text: "**Source: ", cls: "text-on-dark/50" },
  { text: "DSA-2023.pdf — Q4(b)", cls: "text-coral-soft" },
  { text: "**", cls: "text-on-dark/50" },
] as const;

const SAMPLE = SEGMENTS.map((s) => s.text).join("");

function renderHighlighted(charsTyped: number) {
  let remaining = charsTyped;
  return SEGMENTS.map((seg, i) => {
    if (remaining <= 0) return null;
    const visible = seg.text.slice(0, remaining);
    remaining -= seg.text.length;
    if (!visible) return null;
    return (
      <span key={i} className={seg.cls}>
        {visible}
      </span>
    );
  });
}

export function Hero({ signedIn }: { signedIn: boolean }) {
  const reduce = useReducedMotion();
  const [charsTyped, setCharsTyped] = useState(0);

  useEffect(() => {
    if (reduce) {
      setCharsTyped(SAMPLE.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(i + 2, SAMPLE.length);
      setCharsTyped(i);
      if (i >= SAMPLE.length) window.clearInterval(id);
    }, 20);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="relative overflow-hidden">
      {/* Full-bleed pale-green wash behind the hero */}
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-pale-green/60 via-pale-green/20 to-transparent" />

      <section className="mx-auto max-w-7xl px-6 lg:px-10 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: reduce ? 0 : 0.04 } },
            }}
            className="flex flex-wrap gap-x-4 gap-y-1 leading-[0.95] tracking-[-0.03em] font-medium text-[clamp(48px,8.5vw,96px)] text-primary"
          >
            {HEADLINE.split(" ").map((word, idx) => (
              <motion.span
                key={`${word}-${idx}`}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.5, ease: [0.2, 0.7, 0.1, 1] }}
                className="inline-block"
              >
                {word}
              </motion.span>
            ))}
          </motion.div>

          <p className="mt-8 max-w-xl text-lg text-body-muted leading-relaxed">
            Drop in past question papers get a topic-sorted, difficulty-ranked
            PDF you can actually study from.
          </p>

          <div className="mt-10 flex items-center gap-6">
            <Link
              href={signedIn ? "/dashboard" : "/signin"}
              onClick={() => track("landing_cta_click", { location: "hero" })}
            >
              <Button size="lg">{signedIn ? "Open Dashboard" : "Get started"}</Button>
            </Link>
            <a href="#how" className="text-sm text-ink underline underline-offset-4">
              See it run
            </a>
          </div>
        </div>

        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-lg bg-primary p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center justify-between text-[11px] text-muted font-mono tracking-wider uppercase">
              <span className="text-on-dark/50">recallai · agent</span>
              <span className="flex items-center gap-1.5 text-on-dark/50">
                <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
                streaming
              </span>
            </div>

            {/* Monokai-style tab bar */}
            <div className="mt-3 -mx-5 px-5 border-b border-on-dark/10 flex items-center gap-4 pb-2">
              <span className="text-[11px] font-mono text-coral border-b border-coral pb-2 -mb-2">output.md</span>
            </div>

            <pre className="mt-4 text-[12.5px] leading-relaxed font-mono whitespace-pre-wrap min-h-45">
              {renderHighlighted(charsTyped)}
              <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-coral align-middle animate-pulse" />
            </pre>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
