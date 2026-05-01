"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/LogoMark";

const NAV_LINKS = [
  { href: "#how", label: "Features" },
  { href: "#pdfs", label: "Preview" },
  { href: "#privacy", label: "Privacy" },
];

export function Nav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-canvas/90 border-b border-hairline">
      <nav className="mx-auto max-w-7xl flex items-center justify-between px-6 lg:px-10 h-16">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="font-mono text-sm tracking-[0.18em] uppercase text-primary">RecallAI</span>
        </Link>

        <ul className="hidden md:flex items-center gap-10 text-sm text-ink">
          {NAV_LINKS.map((item) => (
            <li key={item.href}>
              <motion.a
                href={item.href}
                whileHover={{ y: -1 }}
                className="relative inline-block py-2"
              >
                <span>{item.label}</span>
                <span className="absolute left-0 right-0 -bottom-px h-px bg-coral scale-x-0 hover:scale-x-100 transition-transform origin-left" />
              </motion.a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {signedIn ? (
            <Link href="/dashboard">
              <Button>Open Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/signin" className="text-sm text-ink hidden sm:inline">
                Sign in
              </Link>
              <Link href="/signin">
                <Button>Get started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
