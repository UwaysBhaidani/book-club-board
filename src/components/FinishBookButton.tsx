"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FinishBookButton({ bookId }: { bookId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Move this book to Previous Reads? The discussion board stays intact.")) return;
    setLoading(true);
    await supabase
      .from("books")
      .update({ status: "previous", finished_at: new Date().toISOString().slice(0, 10) })
      .eq("id", bookId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-amber-600 hover:text-amber-700 disabled:opacity-50"
    >
      {loading ? "Moving…" : "Mark as finished → move to Previous Reads"}
    </button>
  );
}
