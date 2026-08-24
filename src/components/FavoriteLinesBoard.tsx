"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FavoriteLines from "./FavoriteLines";
import PadlockIcon from "./PadlockIcon";
import { withMinDuration } from "@/lib/timing";
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
    await withMinDuration(
      supabase.from("section_unlocks").insert({ section_id: sectionId, user_id: currentUserId }),
      350
    );
    setPending(false);
    router.refresh();
  }

  async function relock() {
    setPending(true);
    await withMinDuration(
      supabase
        .from("section_unlocks")
        .delete()
        .eq("section_id", sectionId)
        .eq("user_id", currentUserId),
      350
    );
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
            aria-label="Unlock"
            title="Unlock"
            className={`flex flex-none appearance-none items-center justify-center rounded-full border-2 bg-accent p-2.5 text-accent-contrast hover:border-accent-ink active:border-accent-ink disabled:opacity-50 ${
              pending ? "border-accent-ink" : "border-transparent"
            }`}
          >
            <PadlockIcon unlocked={pending} />
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
          aria-label="Hide section"
          title="Hide section"
          className="flex flex-none appearance-none items-center justify-center rounded-full p-2.5 text-ink-faint hover:bg-accent-soft hover:text-accent-ink disabled:opacity-50"
        >
          <PadlockIcon unlocked={!pending} />
        </button>
      </div>
      <FavoriteLines sectionId={sectionId} initialLines={initialLines} currentUserId={currentUserId} />
    </div>
  );
}
