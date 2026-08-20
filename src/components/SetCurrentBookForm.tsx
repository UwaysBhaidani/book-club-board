"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetCurrentBookForm({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("books").insert({
      title: title.trim(),
      author: author.trim() || null,
      status: "current",
      added_by: currentUserId,
      started_at: new Date().toISOString().slice(0, 10),
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTitle("");
    setAuthor("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-dashed border-stone-300 bg-white p-5"
    >
      <p className="mb-3 text-sm font-medium text-stone-700">
        No current read set. Pick what the club is reading now:
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Book title"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        />
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Author (optional)"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Set as current read"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
