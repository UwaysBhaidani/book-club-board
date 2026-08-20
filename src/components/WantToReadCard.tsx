"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/lib/types";

export default function WantToReadCard({
  book,
  voterIds,
  currentUserId,
}: {
  book: Book;
  voterIds: string[];
  currentUserId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [voted, setVoted] = useState(voterIds.includes(currentUserId));
  const [count, setCount] = useState(voterIds.length);
  const [loading, setLoading] = useState(false);

  async function toggleVote() {
    setLoading(true);
    if (voted) {
      await supabase
        .from("want_to_read_votes")
        .delete()
        .eq("book_id", book.id)
        .eq("user_id", currentUserId);
      setVoted(false);
      setCount((c) => c - 1);
    } else {
      await supabase
        .from("want_to_read_votes")
        .insert({ book_id: book.id, user_id: currentUserId });
      setVoted(true);
      setCount((c) => c + 1);
    }
    setLoading(false);
  }

  async function promoteToCurrent() {
    if (!confirm(`Set "${book.title}" as the club's current read?`)) return;
    setLoading(true);
    await supabase
      .from("books")
      .update({ status: "current", started_at: new Date().toISOString().slice(0, 10) })
      .eq("id", book.id);
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-medium text-stone-800">{book.title}</h2>
        {book.author && <p className="text-sm text-stone-500">by {book.author}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={toggleVote}
          disabled={loading}
          className={
            voted
              ? "rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              : "rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-600 hover:border-amber-600 hover:text-amber-700 disabled:opacity-50"
          }
        >
          {voted ? "🙋 I'm in" : "🙋 I want to read this"} · {count}
        </button>
        <button
          onClick={promoteToCurrent}
          disabled={loading}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-amber-600 hover:text-amber-700 disabled:opacity-50"
        >
          Read next
        </button>
      </div>
    </div>
  );
}
