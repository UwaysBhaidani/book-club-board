"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BookSearchPicker, { CoverThumb } from "./BookSearchPicker";
import type { BookSearchResult } from "@/lib/types";

export default function AddProposalForm({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmSelection() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("books").insert({
      title: selected.title,
      author: selected.author,
      cover_url: selected.cover_url,
      page_count: selected.page_count,
      status: "want_to_read",
      added_by: currentUserId,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSelected(null);
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-card border border-dashed border-border bg-surface p-4">
      <p className="mb-2 text-sm font-medium text-ink">Propose a book</p>

      {!selected && <BookSearchPicker onSelect={setSelected} />}

      {selected && (
        <div className="flex items-start gap-3 rounded-control border border-border bg-paper p-3">
          <div className="flex h-24 w-16 flex-none items-center justify-center overflow-hidden rounded bg-accent-soft">
            <CoverThumb url={selected.cover_url} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{selected.title}</p>
            <p className="text-sm text-ink-soft">{selected.author ?? "Unknown author"}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={confirmSelection}
                disabled={loading}
                className="rounded-pill bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
              >
                {loading ? "Adding…" : "Add to list"}
              </button>
              <button
                onClick={() => setSelected(null)}
                disabled={loading}
                className="rounded-pill border border-border px-4 py-1.5 text-sm text-ink-soft hover:border-accent hover:text-accent-ink"
              >
                Choose a different book
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-accent-ink">{error}</p>}
    </div>
  );
}
