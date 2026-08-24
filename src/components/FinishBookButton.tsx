"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BookLoader from "./BookLoader";

export default function FinishBookButton({ bookId }: { bookId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("Move this book to Previous Reads? The discussion board stays intact.")) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("books")
      .update({ status: "previous", finished_at: new Date().toISOString().slice(0, 10) })
      .eq("id", bookId);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-accent hover:text-accent-ink disabled:opacity-50"
      >
        {loading ? <BookLoader /> : "Mark as finished"}
      </button>
      {error && <p className="mt-1 text-xs text-accent-ink">{error}</p>}
    </div>
  );
}
