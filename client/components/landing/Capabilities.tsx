"use client";

import { motion } from "framer-motion";
import { FileSearch, ListOrdered, FileDown } from "lucide-react";

const CARDS = [
  {
    icon: FileSearch,
    title: "Reads everything",
    body: "Typed, scanned, image-heavy — it handles all of it.",
    iconBg: "bg-coral/10 text-coral",
  },
  {
    icon: ListOrdered,
    title: "Sorted instantly",
    body: "By topic. By difficulty. So you know what to study first.",
    iconBg: "bg-pale-green text-deep-green",
  },
  {
    icon: FileDown,
    title: "Study-ready in seconds",
    body: "Open the PDF. Start revising. No extra steps.",
    iconBg: "bg-pale-blue text-action-blue",
  },
];

export function Capabilities() {
  return (
    <section id="how" className="bg-soft-stone">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-deep-green">
          How it works
        </p>
        <h2 className="mt-3 text-4xl md:text-5xl font-medium tracking-tight text-primary max-w-2xl">
          Three steps. Totally magical.
        </h2>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {CARDS.map(({ icon: Icon, title, body, iconBg }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              whileHover={{ y: -2 }}
              className="bg-canvas rounded-sm p-7 shadow-sm transition"
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-sm ${iconBg}`}>
                <Icon size={20} strokeWidth={1.6} />
              </div>
              <h3 className="mt-6 text-2xl font-medium tracking-tight text-primary">{title}</h3>
              <p className="mt-2 text-[15px] text-body-muted leading-relaxed">{body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
