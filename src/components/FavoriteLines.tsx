"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FavoriteLine } from "@/lib/types";

export default function FavoriteLines({
  sectionId,
  initialLines,
  currentUserId,
}: {
  sectionId: string;
  initialLines: FavoriteLine[];
  currentUserId: string;
}) {
  const supabase = createClient();
  const [lines, setLines] = useState(initialLines);
  const [quote, setQuote] = useState("");
  const [posting, setPosting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote.trim()) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("favorite_lines")
      .insert({ section_id: sectionId, user_id: currentUserId, quote: quote.trim() })
      .select("*, profiles(display_name)")
      .single();
    setPosting(false);
    if (!error && data) {
      setLines((prev) => [...prev, data as unknown as FavoriteLine]);
      setQuote("");
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex flex-col gap-2">
        {lines.map((l) => (
          <div key={l.id} className="rounded-control bg-paper px-3 py-2">
            <p className="text-sm italic text-ink-soft">&ldquo;{l.quote}&rdquo;</p>
            <p className="mt-1 text-xs text-ink-faint">
              — {l.profiles?.display_name ?? "Member"}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="Share a line that stuck with you…"
          className="flex-1 rounded-control border border-border bg-paper px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={posting}
          className="rounded-control border border-border px-3 py-2 text-sm text-ink-soft hover:border-accent hover:text-accent-ink disabled:opacity-50"
        >
          Share
        </button>
      </form>
    </div>
  );
}
