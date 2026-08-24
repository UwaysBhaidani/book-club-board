"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar({ displayName }: { displayName: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const links = [
    { href: "/", label: "Current Read" },
    { href: "/archive", label: "Previous Reads" },
    { href: "/want-to-read", label: "Potential Reads" },
  ];

  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-paper/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-5xl items-center justify-center px-4 py-4">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          className="absolute left-4 flex h-9 w-9 flex-none items-center justify-center rounded-control border border-border text-ink-soft hover:border-accent hover:text-accent-ink"
        >
          ☰
        </button>
        <Link
          href="/"
          className="text-center font-display text-xl font-semibold tracking-tight text-ink"
        >
          The Dawgs Club
        </Link>
      </div>

      {open && (
        <nav className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  pathname === l.href
                    ? "font-medium text-accent-ink"
                    : "text-ink-soft hover:text-accent-ink"
                }
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
              {displayName && <span className="text-ink-soft">{displayName}</span>}
              <Link
                href="/profile"
                className={
                  pathname === "/profile"
                    ? "font-medium text-accent-ink"
                    : "text-ink-faint hover:text-accent-ink"
                }
              >
                Profile
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
