"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BookSearchPicker, { CoverThumb } from "./BookSearchPicker";
import BookLoader from "./BookLoader";
import type { BookSearchResult } from "@/lib/types";
import { FINAL_THOUGHTS_QUESTIONS } from "@/lib/constants";

type PendingSection = { title: string; selected: boolean };

export default function SetCurrentBookForm({ currentUserId }: { currentUserId: string }) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalChapters, setTotalChapters] = useState("");
  const [pagesPerWeek, setPagesPerWeek] = useState("100");
  const [pendingSections, setPendingSections] = useState<PendingSection[]>([]);
  const [manualTitle, setManualTitle] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  function pickBook(book: BookSearchResult) {
    setSelected(book);
    setPendingSections([]);
    setSuggestError(null);
  }

  async function suggestSplits() {
    if (!selected?.page_count) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const res = await fetch("/api/suggest-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: selected.title,
          author: selected.author,
          pageCount: selected.page_count,
          pagesPerWeek: Number(pagesPerWeek) || 100,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSuggestError(body?.error ?? "Couldn't suggest a schedule.");
        return;
      }
      const suggestions: string[] = body.sections ?? [];
      setPendingSections((prev) => [
        ...prev,
        ...suggestions.map((title) => ({ title, selected: true })),
      ]);
    } catch {
      setSuggestError("Couldn't suggest a schedule.");
    } finally {
      setSuggesting(false);
    }
  }

  function addManualSection() {
    if (!manualTitle.trim()) return;
    setPendingSections((prev) => [...prev, { title: manualTitle.trim(), selected: true }]);
    setManualTitle("");
  }

  function toggleSection(index: number) {
    setPendingSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s))
    );
  }

  function removeSection(index: number) {
    setPendingSections((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirmSelection() {
    if (!selected) return;
    setLoading(true);
    setError(null);

    try {
      const { data: book, error: insertError } = await supabase
        .from("books")
        .insert({
          title: selected.title,
          author: selected.author,
          cover_url: selected.cover_url,
          page_count: selected.page_count,
          total_chapters: Number(totalChapters) || null,
          status: "current",
          added_by: currentUserId,
          started_at: new Date().toISOString().slice(0, 10),
        })
        .select()
        .single();

      if (insertError || !book) {
        setError(insertError?.message ?? "Could not set the current read");
        return;
      }

      // Sections start locked for everyone, including whoever set up the book.
      const chosenSections = pendingSections.filter((s) => s.selected);
      const failedTitles: string[] = [];

      for (let i = 0; i < chosenSections.length; i++) {
        const { data: section, error: sectionError } = await supabase
          .from("chapter_sections")
          .insert({ book_id: book.id, title: chosenSections[i].title, sort_order: i })
          .select()
          .single();
        if (sectionError || !section) {
          failedTitles.push(chosenSections[i].title);
          continue;
        }
        try {
          await fetch("/api/generate-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sectionId: section.id,
              sectionTitle: section.title,
              bookTitle: book.title,
            }),
          });
        } catch {
          // Best-effort — the section still gets created without question suggestions.
        }
      }

      // Every new current read gets a standing wrap-up section and a Favorite
      // Lines board, both locked like any other section.
      const { error: finalThoughtsError } = await supabase.from("chapter_sections").insert({
        book_id: book.id,
        title: "Final Thoughts",
        sort_order: chosenSections.length,
        kind: "final_thoughts",
        suggested_questions: FINAL_THOUGHTS_QUESTIONS,
      });
      if (finalThoughtsError) failedTitles.push("Final Thoughts");

      const { error: favoriteLinesError } = await supabase.from("chapter_sections").insert({
        book_id: book.id,
        title: "Favorite Lines",
        sort_order: chosenSections.length + 1,
        kind: "favorite_lines",
      });
      if (favoriteLinesError) failedTitles.push("Favorite Lines");

      if (failedTitles.length > 0) {
        setError(`Book set, but couldn't create: ${failedTitles.join(", ")}.`);
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-dashed border-border bg-surface p-5">
      <p className="mb-3 font-display text-lg text-ink">What&rsquo;s the club reading now?</p>

      {!selected && <BookSearchPicker onSelect={pickBook} />}

      {selected && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-control border border-border bg-paper p-3">
            <div className="flex h-24 w-16 flex-none items-center justify-center overflow-hidden rounded bg-accent-soft">
              <CoverThumb url={selected.cover_url} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{selected.title}</p>
              <p className="text-sm text-ink-soft">{selected.author ?? "Unknown author"}</p>
            </div>
          </div>

          <div className="rounded-control border border-border bg-paper p-3">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              Number of chapters
              <input
                type="number"
                min={1}
                value={totalChapters}
                onChange={(e) => setTotalChapters(e.target.value)}
                placeholder="e.g. 24"
                className="w-20 rounded-control border border-border bg-surface px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          <div className="rounded-control border border-border bg-paper p-3">
            <p className="mb-2 text-sm font-medium text-ink">Discussion sections</p>

            {pendingSections.length > 0 && (
              <ul className="mb-3 flex flex-col gap-1.5">
                {pendingSections.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={s.selected}
                      onChange={() => toggleSection(i)}
                    />
                    <span className="flex-1">{s.title}</span>
                    <button
                      onClick={() => removeSection(i)}
                      className="text-xs text-ink-faint hover:text-accent-ink"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selected.page_count && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  Pages per week
                  <input
                    type="number"
                    min={1}
                    value={pagesPerWeek}
                    onChange={(e) => setPagesPerWeek(e.target.value)}
                    className="w-20 rounded-control border border-border bg-surface px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                </label>
                <button
                  onClick={suggestSplits}
                  disabled={suggesting}
                  className="rounded-pill border border-border px-3 py-1.5 text-sm text-ink-soft hover:border-accent hover:text-accent-ink disabled:opacity-50"
                >
                  {suggesting ? <BookLoader /> : "Suggest chapter splits"}
                </button>
              </div>
            )}
            {suggestError && <p className="mt-2 text-sm text-accent-ink">{suggestError}</p>}

            <div className="mt-2 flex gap-2">
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g. Chapters 1–5"
                className="flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <button
                onClick={addManualSection}
                className="rounded-control border border-border px-3 py-2 text-sm text-ink-soft hover:border-accent hover:text-accent-ink"
              >
                Add section
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirmSelection}
              disabled={loading}
              className="rounded-pill bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? <BookLoader /> : "Set as current read"}
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
      )}

      {error && <p className="mt-2 text-sm text-accent-ink">{error}</p>}
    </div>
  );
}
