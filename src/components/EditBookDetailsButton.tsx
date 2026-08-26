"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditBookDetailsButton({
  bookId,
  title,
  author,
  currentCoverUrl,
  currentDescription,
  currentGenre,
  currentDiscussionAppeal,
  currentPageCount,
}: {
  bookId: string;
  title: string;
  author: string | null;
  currentCoverUrl: string | null;
  currentDescription: string | null;
  currentGenre: string | null;
  currentDiscussionAppeal: string | null;
  currentPageCount: number | null;
}) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [coverUrl, setCoverUrl] = useState(currentCoverUrl ?? "");
  const [description, setDescription] = useState(currentDescription ?? "");
  const [genre, setGenre] = useState(currentGenre ?? "");
  const [discussionAppeal, setDiscussionAppeal] = useState(currentDiscussionAppeal ?? "");
  const [pageCount, setPageCount] = useState(currentPageCount ? String(currentPageCount) : "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    setEditing(false);
    setCoverUrl(currentCoverUrl ?? "");
    setDescription(currentDescription ?? "");
    setGenre(currentGenre ?? "");
    setDiscussionAppeal(currentDiscussionAppeal ?? "");
    setPageCount(currentPageCount ? String(currentPageCount) : "");
    setError(null);
  }

  async function generateWithClaude() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-synopsis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author,
          rawDescription: description || null,
          pageCount: pageCount ? Number(pageCount) : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Couldn't generate a description.");
        return;
      }
      if (body.synopsis) setDescription(body.synopsis);
      if (body.genre) setGenre(body.genre);
      if (body.discussion_appeal) setDiscussionAppeal(body.discussion_appeal);
      if (!pageCount && body.page_count) setPageCount(String(body.page_count));
    } catch {
      setError("Couldn't generate a description.");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("books")
      .update({
        cover_url: coverUrl.trim() || null,
        description: description.trim() || null,
        genre: genre.trim() || null,
        discussion_appeal: discussionAppeal.trim() || null,
        page_count: pageCount ? Number(pageCount) : null,
      })
      .eq("id", bookId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-ink-faint hover:text-accent-ink"
      >
        Edit book details
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-control border border-border bg-paper p-3 text-left">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Cover image URL
        <input
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="Paste an image URL…"
          className="rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-soft">
          Genre
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g. Literary Fiction / Mystery"
            className="rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Page count
          <input
            type="number"
            min={1}
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
            placeholder="e.g. 320"
            className="w-24 rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="A short synopsis…"
          className="rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Discussion appeal
        <textarea
          value={discussionAppeal}
          onChange={(e) => setDiscussionAppeal(e.target.value)}
          rows={3}
          placeholder="Why this makes for good book club discussion…"
          className="rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={generateWithClaude}
        disabled={generating}
        className="self-start rounded-pill border border-border px-3 py-1.5 text-xs text-ink-soft hover:border-accent hover:text-accent-ink disabled:opacity-50"
      >
        {generating ? "Generating…" : "Generate new description"}
      </button>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-pill bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={resetAndClose}
          disabled={saving}
          className="rounded-pill border border-border px-3 py-1.5 text-xs text-ink-soft hover:border-accent hover:text-accent-ink"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-accent-ink">{error}</p>}
    </div>
  );
}
