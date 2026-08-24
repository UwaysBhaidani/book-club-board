"use client";

import { useState } from "react";

export default function BookHero({
  title,
  author,
  coverUrl,
  eyebrow,
  children,
}: {
  title: string;
  author: string | null;
  coverUrl: string | null;
  eyebrow?: string | null;
  children?: React.ReactNode;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = coverUrl && !coverFailed;

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
      <div className="aspect-[2/3] w-40 flex-none overflow-hidden rounded-card border border-border bg-accent-soft shadow-sm sm:w-48">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`Cover of ${title}`}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
            <span className="font-display text-3xl text-accent-ink">
              {title.charAt(0).toUpperCase()}
            </span>
            <span className="text-center text-xs text-accent-ink/70">No cover found</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 sm:items-start">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wide text-accent-ink">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
        {author && <p className="text-ink-soft">by {author}</p>}
        {children}
      </div>
    </div>
  );
}
