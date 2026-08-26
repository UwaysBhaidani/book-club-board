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

    // Rewrite whatever description we found into a short, consistent,
    // spoiler-free synopsis — raw Open Library/Google descriptions vary
    // wildly in length, quality, and spoiler content. Also fills in an
    // approximate page count when neither source had one, plus genre and
    // a discussion-appeal blurb, which no search provider gives us.
    let description = selected.description;
    let pageCount = selected.page_count;
    let genre: string | null = null;
    let discussionAppeal: string | null = null;
    try {
      const res = await fetch("/api/generate-synopsis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selected.title,
          author: selected.author,
          rawDescription: selected.description,
          pageCount: selected.page_count,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.synopsis) description = body.synopsis;
        if (!pageCount && body.page_count) pageCount = body.page_count;
        genre = body.genre ?? null;
        discussionAppeal = body.discussion_appeal ?? null;
      }
    } catch {
      // Fall back to whatever raw description/page count we already have.
    }

    const { data: book, error } = await supabase
      .from("books")
      .insert({
        title: selected.title,
        author: selected.author,
        cover_url: selected.cover_url,
        description,
        genre,
        discussion_appeal: discussionAppeal,
        page_count: pageCount,
        status: "want_to_read",
        added_by: currentUserId,
      })
      .select()
      .single();
    if (error || !book) {
      setLoading(false);
      setError(error?.message ?? "Could not add this book");
      return;
    }

    // Proposing a book counts as an automatic vote for it.
    await supabase
      .from("want_to_read_votes")
      .insert({ book_id: book.id, user_id: currentUserId });

    setLoading(false);
    setSelected(null);
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-card border border-border bg-surface p-4">
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
