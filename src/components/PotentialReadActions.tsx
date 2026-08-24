"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DeleteBookButton from "./DeleteBookButton";

export default function PotentialReadActions({
  bookId,
  bookTitle,
  isVotedByMe: initialVoted,
  voterCount: initialCount,
  currentUserId,
  canRemove,
}: {
  bookId: string;
  bookTitle: string;
  isVotedByMe: boolean;
  voterCount: number;
  currentUserId: string;
  canRemove: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggleVote() {
    setLoading(true);
    await supabase.from("want_to_read_votes").delete().eq("user_id", currentUserId);
    if (!voted) {
      await supabase.from("want_to_read_votes").insert({ book_id: bookId, user_id: currentUserId });
      setVoted(true);
      setCount((c) => c + 1);
    } else {
      setVoted(false);
      setCount((c) => Math.max(0, c - 1));
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={toggleVote}
        disabled={loading}
        className={
          voted
            ? "rounded-pill bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
            : "rounded-pill border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-accent hover:text-accent-ink disabled:opacity-50"
        }
      >
        {voted ? "Voted" : "I want to read this"} · {count}
      </button>
      {canRemove && <DeleteBookButton bookId={bookId} title={bookTitle} />}
    </div>
  );
}
