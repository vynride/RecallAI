"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "Upload",
    body: "Drop your past papers. One file or the entire exam archive you've been hoarding since freshman year. Up to 50MB, no drama.",
    numColor: "text-coral",
    borderColor: "border-coral/40",
    pillBg: "bg-coral/15",
  },
  {
    n: "02",
    title: "Sit back",
    body: "Grab a coffee. Live progress ticks in while the pipeline rips through every question, image, and scanned horror on the page.",
    numColor: "text-pale-green",
    borderColor: "border-pale-green/40",
    pillBg: "bg-pale-green/10",
  },
  {
    n: "03",
    title: "Download",
    body: "A crisp, topic-sorted, difficulty-tagged PDF materialises. Open it. Start demolishing the syllabus. You're already ahead.",
    numColor: "text-focus-blue",
    borderColor: "border-focus-blue/40",
    pillBg: "bg-focus-blue/15",
  },
];

export function DarkBand() {
  return (
    <section className="mx-auto max-w-7xl px-6 lg:px-10 py-12">
      <div className="rounded-lg bg-deep-green text-on-dark px-8 py-16 lg:px-16 lg:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-pale-green/80">
          The pipeline
        </p>
        <h2 className="mt-3 text-3xl md:text-5xl font-medium tracking-tight max-w-2xl">
          Upload. Wait a moment. Download.
        </h2>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`rounded-sm border ${step.borderColor} ${step.pillBg} px-6 py-8 backdrop-blur-sm`}
            >
              <span className={`font-mono text-2xl font-semibold tracking-wider ${step.numColor}`}>
                {step.n}
              </span>
              <h3 className="mt-4 text-xl font-medium text-on-dark">{step.title}</h3>
              <p className="mt-2 text-[15px] text-on-dark/70 leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
