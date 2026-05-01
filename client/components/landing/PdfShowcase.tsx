"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export function PdfShowcase() {
  const [hover, setHover] = useState<"input" | "output">("output");

  return (
    <section id="pdfs" className="mx-auto max-w-7xl px-6 lg:px-10 py-24">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
            The output
          </p>
          <h2 className="mt-3 text-4xl md:text-5xl font-medium tracking-tight text-primary">
            A PDF you'd actually study from.
          </h2>
          <p className="mt-6 text-lg text-body-muted leading-relaxed max-w-lg">
            Every question tagged by difficulty. High-frequency topics surfaced so you study
            what's actually tested, not what you already know. Hover the preview to see
            the transformation.
          </p>
        </div>

        <div
          className="relative h-[420px] sm:h-[480px]"
          onMouseEnter={() => setHover("input")}
          onMouseLeave={() => setHover("output")}
        >
          <motion.div
            animate={{
              x: hover === "output" ? 32 : 0,
              y: hover === "output" ? 32 : 0,
              rotate: hover === "output" ? 2 : 0,
            }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 rounded-lg bg-soft-stone p-6 border border-card-border"
          >
            <div className="text-xs font-mono text-muted uppercase tracking-wider">input.pdf</div>
            <div className="mt-3 space-y-2">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-2 bg-hairline rounded" style={{ width: `${50 + (i * 13) % 50}%` }} />
              ))}
            </div>
          </motion.div>
          <motion.div
            animate={{
              x: hover === "input" ? -32 : 0,
              y: hover === "input" ? -32 : 0,
              rotate: hover === "input" ? -2 : 0,
            }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 rounded-lg bg-canvas p-6 border border-card-border shadow-[0_30px_60px_-40px_rgba(0,0,0,0.3)]"
          >
            <div className="text-xs font-mono text-deep-green uppercase tracking-wider">recallai.pdf</div>
            <div className="mt-3">
              <div className="text-[15px] text-primary font-medium">Sorting Algorithms</div>
              <div className="mt-1 h-px w-12 bg-coral" />
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: "Easy", color: "bg-pale-green text-deep-green" },
                { label: "Moderate", color: "bg-[#fff4e0] text-[#7a4a00]" },
                { label: "Moderate", color: "bg-[#fff4e0] text-[#7a4a00]" },
                { label: "Challenging", color: "bg-[#fde7e7] text-[#8a1c1c]" },
              ].map((row, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${row.color}`}>{row.label}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pale-blue text-action-blue">
                      Conceptual
                    </span>
                  </div>
                  <div className="h-1.5 bg-hairline rounded" style={{ width: `${60 + (i * 11) % 30}%` }} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
