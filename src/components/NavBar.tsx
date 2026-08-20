"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NavBar({ displayName }: { displayName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const links = [
    { href: "/", label: "Current Read" },
    { href: "/archive", label: "Previous Reads" },
    { href: "/want-to-read", label: "Want to Read" },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-base font-semibold text-stone-800 sm:text-lg">
          📖 The Book Club
        </Link>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:gap-4 sm:text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname === l.href
                  ? "font-medium text-amber-700"
                  : "text-stone-600 hover:text-amber-700"
              }
            >
              {l.label}
            </Link>
          ))}
          {displayName && <span className="hidden text-stone-400 sm:inline">|</span>}
          {displayName && <span className="hidden text-stone-500 sm:inline">{displayName}</span>}
          <button onClick={signOut} className="text-stone-500 hover:text-red-600">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
