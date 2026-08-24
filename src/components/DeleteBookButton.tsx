"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteBookButton({
  bookId,
  title,
  confirmMessage,
}: {
  bookId: string;
  title: string;
  confirmMessage?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(confirmMessage ?? `Permanently remove "${title}"?`)) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("books").delete().eq("id", bookId);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-none flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex-none rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-ink-faint hover:border-accent hover:text-accent-ink disabled:opacity-50"
      >
        {loading ? "Removing…" : "Remove"}
      </button>
      {error && <p className="text-xs text-accent-ink">{error}</p>}
    </div>
  );
}
