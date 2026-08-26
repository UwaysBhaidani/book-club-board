import { NextResponse } from "next/server";
import type { BookSearchResult } from "@/lib/types";

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
};

const RESULT_LIMIT = 8;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Open Library occasionally throws a transient error — retry a couple of
// times with a short backoff before giving up.
async function fetchWithRetry(url: string, ms: number, attempts = 3): Promise<Response | null> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const res = await fetchWithTimeout(url, ms);
    if (res?.ok) return res;
    last = res;
    if (res?.status && res.status < 500) return res;
    if (i < attempts - 1) await sleep(300 * (i + 1));
  }
  return last;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    q
  )}&limit=${RESULT_LIMIT}&fields=title,author_name,first_publish_year,cover_i,number_of_pages_median`;

  let docs: OpenLibraryDoc[];
  try {
    const res = await fetchWithRetry(url, 6000);
    if (!res?.ok) {
      return NextResponse.json({ error: "Book search failed" }, { status: 502 });
    }
    const data = await res.json();
    docs = data.docs ?? [];
  } catch {
    return NextResponse.json({ error: "Book search failed" }, { status: 502 });
  }

  const usable = docs.filter((d): d is OpenLibraryDoc & { title: string } => !!d.title);

  const results: BookSearchResult[] = usable.map((doc) => ({
    title: doc.title,
    author: doc.author_name?.join(", ") ?? null,
    cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    page_count: doc.number_of_pages_median ?? null,
    published_year: doc.first_publish_year ? String(doc.first_publish_year) : null,
  }));

  return NextResponse.json({ results });
}
