"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-pill border border-border px-4 py-1.5 text-sm text-ink-soft hover:border-accent hover:text-accent-ink"
    >
      Sign out
    </button>
  );
}
