"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditCoverButton({
  bookId,
  currentUrl,
}: {
  bookId: string;
  currentUrl: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(currentUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("books")
      .update({ cover_url: url.trim() || null })
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
        Change cover
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste an image URL…"
        className="rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-pill bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setUrl(currentUrl ?? "");
            setError(null);
          }}
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
