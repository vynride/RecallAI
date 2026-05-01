"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Jobs", exact: true },
  { href: "/dashboard/settings", label: "Settings", exact: false },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="hidden md:flex items-center gap-1">
      {LINKS.map(({ href, label, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative px-3 py-1.5 text-sm rounded-sm transition-colors ${
              active
                ? "text-primary font-medium"
                : "text-body-muted hover:text-primary"
            }`}
          >
            {label}
            {active && (
              <span className="absolute inset-x-3 -bottom-px h-px bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
