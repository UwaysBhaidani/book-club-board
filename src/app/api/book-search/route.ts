import { NextResponse } from "next/server";
import type { BookSearchResult } from "@/lib/types";

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
};

type GoogleVolume = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

function cleanDescription(raw: string) {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .trim();
}

type SourceResult = { results: BookSearchResult[]; failed: boolean };

const RESULT_LIMIT = 5;

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

// Both providers occasionally throw a transient 5xx — retry a couple of
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

function dedupeKey(title: string, author: string | null) {
  return `${title.trim().toLowerCase()}::${(author ?? "").trim().toLowerCase()}`;
}

// Google's ranking tends to surface the right edition (e.g. the English
// translation of a foreign-language title) more reliably than Open Library,
// so its results are shown first — but it requires an API key, so it's
// skipped (not treated as a failure) when one isn't configured.
async function searchGoogleBooks(q: string): Promise<SourceResult> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return { results: [], failed: false };

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    q
  )}&maxResults=${RESULT_LIMIT}&key=${apiKey}`;

  // Google's Books API backend is noticeably flakier than Open Library's —
  // transient 503s happen often enough that the default 3 attempts aren't
  // always enough, so it gets more retries here.
  const res = await fetchWithRetry(url, 6000, 6);
  if (!res?.ok) return { results: [], failed: true };

  try {
    const data = await res.json();
    const items: GoogleVolume[] = data.items ?? [];
    const results = items
      .filter((item): item is GoogleVolume & { volumeInfo: { title: string } } => !!item.volumeInfo?.title)
      .map((item) => {
        const info = item.volumeInfo;
        const thumbnail = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
        return {
          title: info.title,
          author: info.authors?.join(", ") ?? null,
          cover_url: thumbnail ? thumbnail.replace(/^http:/, "https:") : null,
          page_count: info.pageCount ?? null,
          published_year: info.publishedDate ? info.publishedDate.slice(0, 4) : null,
          description: info.description ? cleanDescription(info.description) : null,
        };
      });
    return { results, failed: false };
  } catch {
    return { results: [], failed: true };
  }
}

async function searchOpenLibrary(q: string): Promise<SourceResult> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    q
  )}&limit=${RESULT_LIMIT}&fields=title,author_name,first_publish_year,cover_i,number_of_pages_median`;

  const res = await fetchWithRetry(url, 6000);
  if (!res?.ok) return { results: [], failed: true };

  try {
    const data = await res.json();
    const docs: OpenLibraryDoc[] = data.docs ?? [];
    const usable = docs.filter((d): d is OpenLibraryDoc & { title: string } => !!d.title);
    const results = usable.map((doc) => ({
      title: doc.title,
      author: doc.author_name?.join(", ") ?? null,
      cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
      page_count: doc.number_of_pages_median ?? null,
      published_year: doc.first_publish_year ? String(doc.first_publish_year) : null,
      description: null,
    }));
    return { results, failed: false };
  } catch {
    return { results: [], failed: true };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const [google, openLibrary] = await Promise.all([searchGoogleBooks(q), searchOpenLibrary(q)]);

  if (google.failed && openLibrary.failed) {
    return NextResponse.json({ error: "Book search failed" }, { status: 502 });
  }

  const seen = new Set<string>();
  const results: BookSearchResult[] = [];
  for (const r of [...google.results, ...openLibrary.results]) {
    const key = dedupeKey(r.title, r.author);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(r);
    if (results.length >= RESULT_LIMIT) break;
  }

  return NextResponse.json({ results });
}
