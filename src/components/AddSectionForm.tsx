"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddSectionForm({
  bookId,
  bookTitle,
  nextOrder,
}: {
  bookId: string;
  bookTitle: string;
  nextOrder: number;
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
              ? `Section added, but question generation failed: ${body.error}`
              : "Section added, but question generation failed."
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
    <form onSubmit={handleSubmit} className="rounded-xl border border-dashed border-stone-300 p-4">
      <p className="mb-2 text-sm font-medium text-stone-700">Add a discussion section</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapters 1–5"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add section"}
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-stone-500">
        <input
          type="checkbox"
          checked={autoGenerate}
          onChange={(e) => setAutoGenerate(e.target.checked)}
        />
        Auto-generate discussion questions for this section
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
