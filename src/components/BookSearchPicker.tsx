"use client";

import { useEffect, useRef, useState } from "react";
import type { BookSearchResult } from "@/lib/types";

export function CoverThumb({
  url,
  fit = "cover",
}: {
  url: string | null;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return <span className="text-[10px] text-accent-ink">No cover</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function BookSearchPicker({
  onSelect,
}: {
  onSelect: (book: BookSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/book-search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Search failed");
        setResults(data.results ?? []);
      } catch {
        setError("Couldn't search books right now.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          if (!value.trim()) {
            setResults([]);
            setError(null);
          }
        }}
        placeholder="Search for a book by title or author…"
        className="w-full rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
      />

      {loading && <p className="mt-2 text-xs text-ink-faint">Searching…</p>}
      {error && <p className="mt-2 text-xs text-accent-ink">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center gap-3 rounded-control border border-border bg-paper p-2 text-left hover:border-accent"
              >
                <div className="flex h-16 w-11 flex-none items-center justify-center overflow-hidden rounded bg-accent-soft">
                  <CoverThumb url={r.cover_url} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{r.title}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {r.author ?? "Unknown author"}
                    {r.published_year ? ` · ${r.published_year}` : ""}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
