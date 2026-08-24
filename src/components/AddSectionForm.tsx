"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BookLoader from "./BookLoader";

export default function AddSectionForm({
  bookId,
  bookTitle,
  nextOrder,
  currentUserId,
}: {
  bookId: string;
  bookTitle: string;
  nextOrder: number;
  currentUserId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    const { data: section, error: insertError } = await supabase
      .from("chapter_sections")
      .insert({ book_id: bookId, title: title.trim(), sort_order: nextOrder })
      .select()
      .single();

    if (insertError || !section) {
      setError(insertError?.message ?? "Could not create section");
      setLoading(false);
      return;
    }

    // The creator shouldn't have to unlock a section they just wrote themselves.
    await supabase
      .from("section_unlocks")
      .insert({ section_id: section.id, user_id: currentUserId });

    if (autoGenerate) {
      try {
        const res = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: section.id,
            sectionTitle: section.title,
            bookTitle,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(
            body?.error
              ? `Section added, but suggesting questions failed: ${body.error}`
              : "Section added, but suggesting questions failed."
          );
        }
      } catch {
        setError("Section added, but question generation failed.");
      }
    }

    setTitle("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-card border border-dashed border-border p-4">
      <p className="mb-2 text-sm font-medium text-ink">Add a discussion section</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapters 1–5"
          className="flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-control bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? <BookLoader /> : "Add section"}
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          checked={autoGenerate}
          onChange={(e) => setAutoGenerate(e.target.checked)}
        />
        Suggest discussion questions for this section
      </label>
      {error && <p className="mt-2 text-sm text-accent-ink">{error}</p>}
    </form>
  );
}
