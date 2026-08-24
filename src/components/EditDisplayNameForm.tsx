"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditDisplayNameForm({
  userId,
  currentName,
}: {
  userId: string;
  currentName: string;
}) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Display name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={saving || !name.trim() || name.trim() === currentName}
        className="self-start rounded-pill bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {error && <p className="text-xs text-accent-ink">{error}</p>}
    </form>
  );
}
