"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Entry = { userId: string; name: string; label: string };

export default function ReadingProgress({
  bookId,
  totalChapters,
  currentUserId,
  currentUserName,
  initialProgress,
}: {
  bookId: string;
  totalChapters: number | null;
  currentUserId: string;
  currentUserName: string;
  initialProgress: Entry[];
}) {
  const [supabase] = useState(() => createClient());
  const [entries, setEntries] = useState(initialProgress);
  const [showOthers, setShowOthers] = useState(false);
  const [dragFrac, setDragFrac] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const others = entries.filter((e) => e.userId !== currentUserId);

  if (!totalChapters || totalChapters < 1) {
    return null;
  }

  const stages = [
    "Not started",
    ...Array.from({ length: totalChapters }, (_, i) => `Chapter ${i + 1}`),
    "Finished",
  ];
  const total = stages.length;
  const mine = entries.find((e) => e.userId === currentUserId);

  const committedIndex = Math.max(0, stages.indexOf(mine?.label ?? "Not started"));
  const committedFrac = total > 1 ? committedIndex / (total - 1) : 0;
  const displayFrac = dragFrac ?? committedFrac;
  const displayIndex = Math.round(displayFrac * (total - 1));

  function fracFromClientX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return committedFrac;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  function commit(index: number) {
    const label = stages[index];
    setEntries((prev) => [
      ...prev.filter((e) => e.userId !== currentUserId),
      { userId: currentUserId, name: currentUserName, label },
    ]);
    void supabase
      .from("reading_progress")
      .upsert(
        { book_id: bookId, user_id: currentUserId, label, updated_at: new Date().toISOString() },
        { onConflict: "book_id,user_id" }
      );
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragFrac(fracFromClientX(e.clientX));
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    setDragFrac(fracFromClientX(e.clientX));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const index = Math.round(fracFromClientX(e.clientX) * (total - 1));
    setDragFrac(null);
    commit(index);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-medium text-ink">My progress</p>
        <p className="font-mono text-xs uppercase tracking-widest text-accent-ink">
          {stages[displayIndex]}
        </p>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative h-8 cursor-grab touch-none select-none border-2 border-ink-faint/50 bg-paper active:cursor-grabbing"
        style={{
          boxShadow:
            "inset 2px 2px 0 rgba(0,0,0,0.5), inset -2px -2px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0"
          style={{
            width: `${displayFrac * 100}%`,
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--color-accent) 0px, var(--color-accent) 12px, transparent 12px, transparent 16px)",
            transition: dragFrac === null ? "width 200ms steps(12)" : "none",
          }}
        />
        <div
          className="pointer-events-none absolute top-[-3px] bottom-[-3px] w-1 bg-accent-ink"
          style={{
            left: `${displayFrac * 100}%`,
            transform: "translateX(-50%)",
            transition: dragFrac === null ? "left 200ms steps(12)" : "none",
            boxShadow: "0 0 6px var(--color-accent)",
          }}
        />
      </div>

      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-faint">
        <span>START</span>
        <span>
          CH {Math.max(0, Math.min(displayIndex, totalChapters))}/{totalChapters}
        </span>
        <span>FIN</span>
      </div>

      {others.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowOthers((o) => !o)}
            className="text-xs text-ink-faint hover:text-accent-ink"
          >
            {showOthers ? "Hide everyone's progress" : "See everyone's progress"}
          </button>
          {showOthers && (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {others.map((e) => (
                <li key={e.userId} className="flex items-center justify-between gap-2">
                  <span className="text-ink-soft">{e.name}</span>
                  <span className="text-ink-faint">{e.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
