"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FavoriteLines from "./FavoriteLines";
import type { FavoriteLine } from "@/lib/types";

export default function FavoriteLinesBoard({
  sectionId,
  title,
  unlocked,
  initialLines,
  currentUserId,
}: {
  sectionId: string;
  title: string;
  unlocked: boolean;
  initialLines: FavoriteLine[];
  currentUserId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function unlock() {
    setPending(true);
    await supabase.from("section_unlocks").insert({ section_id: sectionId, user_id: currentUserId });
    setPending(false);
    router.refresh();
  }

  async function relock() {
    setPending(true);
    await supabase
      .from("section_unlocks")
      .delete()
      .eq("section_id", sectionId)
      .eq("user_id", currentUserId);
    setPending(false);
    router.refresh();
  }

  if (!unlocked) {
    return (
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg text-ink">{title}</h3>
          <button
            onClick={unlock}
            disabled={pending}
            className="flex-none rounded-pill bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Unlocking…" : "Unlock"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <button
          onClick={relock}
          disabled={pending}
          className="flex-none text-xs text-ink-faint hover:text-accent-ink disabled:opacity-50"
        >
          Hide section
        </button>
      </div>
      <FavoriteLines sectionId={sectionId} initialLines={initialLines} currentUserId={currentUserId} />
    </div>
  );
}
