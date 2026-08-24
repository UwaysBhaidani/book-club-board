import { createClient } from "@/lib/supabase/server";
import BookTile from "@/components/BookTile";

export default async function ArchivePage() {
  const supabase = await createClient();

  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("status", "previous")
    .order("finished_at", { ascending: false });

  const bookIds = (books ?? []).map((b) => b.id);
  let avgRatingByBook: Record<string, number> = {};

  if (bookIds.length > 0) {
    const { data: ratingRows } = await supabase
      .from("book_ratings")
      .select("book_id, rating")
      .in("book_id", bookIds);
    const sums: Record<string, { total: number; count: number }> = {};
    for (const r of ratingRows ?? []) {
      const entry = (sums[r.book_id] ??= { total: 0, count: 0 });
      entry.total += r.rating;
      entry.count += 1;
    }
    avgRatingByBook = Object.fromEntries(
      Object.entries(sums).map(([id, { total, count }]) => [id, total / count])
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Previous Reads</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Every book the club has finished, with its discussion board preserved.
      </p>

      {(!books || books.length === 0) && (
        <p className="text-sm text-ink-faint">No finished books yet.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {books?.map((b) => {
          const avg = avgRatingByBook[b.id];
          return (
            <BookTile
              key={b.id}
              href={`/archive/${b.id}`}
              coverUrl={b.cover_url}
              title={b.title}
              author={b.author}
              meta={avg != null ? `Dawg Rating: ${avg.toFixed(1)}` : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
