"use client";

import { motion } from "framer-motion";

export function Announcement() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="hidden sm:block bg-cohere-black text-on-dark text-xs"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-9 flex items-center justify-center gap-3 font-mono tracking-wide">
        <span>Bring Your Own Key · Open Source · </span>
        <a href="#how" className="underline underline-offset-2">See how it works</a>
      </div>
    </motion.div>
  );
}
