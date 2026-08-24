import { createClient } from "@/lib/supabase/server";
import BookTile from "@/components/BookTile";
import AddProposalForm from "@/components/AddProposalForm";

export default async function WantToReadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("status", "want_to_read")
    .order("created_at", { ascending: true });

  const bookIds = (books ?? []).map((b) => b.id);
  let countByBook: Record<string, number> = {};

  if (bookIds.length > 0) {
    const { data: votes } = await supabase
      .from("want_to_read_votes")
      .select("book_id")
      .in("book_id", bookIds);
    countByBook = (votes ?? []).reduce((acc, v) => {
      acc[v.book_id] = (acc[v.book_id] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  const sorted = [...(books ?? [])].sort(
    (a, b) => (countByBook[b.id] ?? 0) - (countByBook[a.id] ?? 0)
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink">Potential Reads</h1>

      {user && <AddProposalForm currentUserId={user.id} />}

      {sorted.length === 0 && (
        <p className="text-sm text-ink-faint">No proposals yet — add the first one above.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {sorted.map((b) => {
          const count = countByBook[b.id] ?? 0;
          return (
            <BookTile
              key={b.id}
              href={`/want-to-read/${b.id}`}
              coverUrl={b.cover_url}
              title={b.title}
              author={b.author}
              meta={`${count} want${count === 1 ? "s" : ""} to read`}
            />
          );
        })}
      </div>
    </div>
  );
}
