import { createClient } from "@/lib/supabase/server";
import WantToReadCard from "@/components/WantToReadCard";
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
    .order("created_at", { ascending: false });

  const bookIds = (books ?? []).map((b) => b.id);
  let votesByBook: Record<string, string[]> = {};

  if (bookIds.length > 0) {
    const { data: votes } = await supabase
      .from("want_to_read_votes")
      .select("book_id, user_id")
      .in("book_id", bookIds);
    votesByBook = (votes ?? []).reduce((acc, v) => {
      (acc[v.book_id] ??= []).push(v.user_id);
      return acc;
    }, {} as Record<string, string[]>);
  }

  const sorted = [...(books ?? [])].sort(
    (a, b) => (votesByBook[b.id]?.length ?? 0) - (votesByBook[a.id]?.length ?? 0)
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-stone-800">Want to Read</h1>
      <p className="mb-6 text-sm text-stone-500">
        Books the club is considering. Flag the ones you&apos;re interested in.
      </p>

      {user && <AddProposalForm currentUserId={user.id} />}

      <div className="flex flex-col gap-3">
        {sorted.map((b) => (
          <WantToReadCard
            key={b.id}
            book={b}
            voterIds={votesByBook[b.id] ?? []}
            currentUserId={user!.id}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-stone-400">No proposals yet — add the first one above.</p>
        )}
      </div>
    </div>
  );
}
