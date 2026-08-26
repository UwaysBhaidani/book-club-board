"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";

type Entry = { userId: string; name: string; label: string; avatarUrl: string | null };

const CONFETTI_COLORS = ["#1c3f66", "#aedaf3", "#f3b6c9", "#e2a37a", "#f0e6dc"];

function makeConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.6 + Math.random() * 0.9,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    drift: (Math.random() - 0.5) * 60,
  }));
}

export default function ReadingProgress({
  bookId,
  totalChapters,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  initialProgress,
}: {
  bookId: string;
  totalChapters: number | null;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl: string | null;
  initialProgress: Entry[];
}) {
  const [supabase] = useState(() => createClient());
  const [entries, setEntries] = useState(initialProgress);
  const [showOthers, setShowOthers] = useState(false);
  const [dragFrac, setDragFrac] = useState<number | null>(null);
  const [confetti, setConfetti] = useState<ReturnType<typeof makeConfetti> | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  function fracForLabel(label: string) {
    const index = Math.max(0, stages.indexOf(label));
    return total > 1 ? index / (total - 1) : 0;
  }

  // Group everyone sharing the same stage into one bubble cluster with a
  // single combined label.
  const groupsByLabel = new Map<string, Entry[]>();
  for (const e of entries) {
    (groupsByLabel.get(e.label) ?? groupsByLabel.set(e.label, []).get(e.label)!).push(e);
  }
  const progressGroups = Array.from(groupsByLabel.entries())
    .map(([label, es]) => ({ label, frac: fracForLabel(label), members: es }))
    .sort((a, b) => a.frac - b.frac);

  function fracFromClientX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return committedFrac;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  function commit(index: number) {
    const label = stages[index];
    const previousEntry = mine;
    const wasFinished = mine?.label === "Finished";
    setError(null);
    setEntries((prev) => [
      ...prev.filter((e) => e.userId !== currentUserId),
      { userId: currentUserId, name: currentUserName, label, avatarUrl: currentUserAvatarUrl },
    ]);
    supabase
      .from("reading_progress")
      .upsert(
        { book_id: bookId, user_id: currentUserId, label, updated_at: new Date().toISOString() },
        { onConflict: "book_id,user_id" }
      )
      .then(({ error }) => {
        if (error) {
          setEntries((prev) => [
            ...prev.filter((e) => e.userId !== currentUserId),
            ...(previousEntry ? [previousEntry] : []),
          ]);
          setError("Couldn't save your progress — try again.");
          return;
        }
        if (label === "Finished" && !wasFinished) {
          setConfetti(makeConfetti(90));
          setTimeout(() => setConfetti(null), 2600);
        }
      });
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
    <div className="relative rounded-card border border-border bg-surface p-4">
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {confetti.map((c) => (
            <span
              key={c.id}
              className="absolute top-0 h-3.5 w-2"
              style={
                {
                  left: `${c.left}%`,
                  backgroundColor: c.color,
                  animation: `confetti-fall ${c.duration}s ease-in both`,
                  animationDelay: `${c.delay}s`,
                  "--drift": `${c.drift}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-medium text-ink">My progress</p>
        <p className="font-mono text-xs uppercase tracking-widest text-accent-ink">
          {stages[displayIndex]}
        </p>
      </div>

      {progressGroups.length > 0 && (
        <div className="relative mb-1 h-6">
          {progressGroups.map((g) => (
            <div
              key={g.label}
              className="absolute top-0"
              style={{
                left: `${g.frac * 100}%`,
                transform: "translateX(-50%)",
              }}
              title={`${g.members
                .map((e) => (e.userId === currentUserId ? "You" : e.name))
                .join(", ")} — ${g.label}`}
            >
              <div className="flex -space-x-2">
                <Avatar
                  avatarUrl={g.members[0].avatarUrl}
                  seed={g.members[0].userId}
                  size={22}
                  className="border-2 border-surface"
                />
                {g.members.length > 1 && (
                  <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-2 border-surface bg-paper text-[10px] text-ink-faint">
                    +{g.members.length - 1}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

      {error && <p className="mt-2 text-xs text-accent-ink">{error}</p>}

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
                  <span className="flex items-center gap-1.5 text-ink-soft">
                    <Avatar avatarUrl={e.avatarUrl} seed={e.userId} size={18} />
                    {e.name}
                  </span>
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
