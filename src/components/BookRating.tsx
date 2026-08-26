"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRating } from "@/lib/format";
import Avatar from "./Avatar";

type Entry = { userId: string; name: string; rating: number | null; avatarUrl: string | null };

function Star({ fill }: { fill: number }) {
  return (
    <span className="relative inline-block h-5 w-5 leading-none">
      <span className="absolute inset-0 text-lg text-ink-faint">★</span>
      <span
        className="absolute inset-0 overflow-hidden text-lg text-accent-ink"
        style={{ width: `${fill * 100}%` }}
      >
        ★
      </span>
    </span>
  );
}

export default function BookRating({
  bookId,
  currentUserId,
  initialEntries,
}: {
  bookId: string;
  currentUserId: string;
  initialEntries: Entry[];
}) {
  const supabase = createClient();
  const [entries, setEntries] = useState(initialEntries);
  const [saving, setSaving] = useState(false);

  const mine = entries.find((e) => e.userId === currentUserId);
  const rated = entries.filter((e) => e.rating != null);
  const average =
    rated.length > 0 ? rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length : null;

  async function rate(stars: number) {
    setSaving(true);
    setEntries((prev) =>
      prev.map((e) => (e.userId === currentUserId ? { ...e, rating: stars } : e))
    );
    await supabase
      .from("book_ratings")
      .upsert({ book_id: bookId, user_id: currentUserId, rating: stars }, { onConflict: "book_id,user_id" });
    setSaving(false);
  }

  const myRating = mine?.rating ?? 0;

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="font-display text-base text-ink">
        Dawg Rating: {average != null ? `${formatRating(average)} / 5` : "No Rating"}
      </p>
      <div className="mt-2 flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = Math.min(Math.max(myRating - (n - 1), 0), 1);
          return (
            <span key={n} className="relative">
              <Star fill={fill} />
              <button
                aria-label={`Rate ${n - 0.5} stars`}
                onClick={() => rate(n - 0.5)}
                disabled={saving}
                className="absolute inset-y-0 left-0 w-1/2"
              />
              <button
                aria-label={`Rate ${n} stars`}
                onClick={() => rate(n)}
                disabled={saving}
                className="absolute inset-y-0 right-0 w-1/2"
              />
            </span>
          );
        })}
        <span className="ml-1 text-xs text-ink-faint">
          {mine?.rating ? `Your rating: ${formatRating(mine.rating)} / 5` : "Rate this book"}
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {entries.map((e) => (
          <li key={e.userId} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <Avatar avatarUrl={e.avatarUrl} seed={e.userId} size={18} />
              {e.userId === currentUserId ? "You" : e.name}
            </span>
            <span className="text-ink-faint">
              {e.rating != null ? `${formatRating(e.rating)} / 5` : "No Rating"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
