import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookHero from "@/components/BookHero";
import PotentialReadActions from "@/components/PotentialReadActions";
import EditCoverButton from "@/components/EditCoverButton";
import PromoteToCurrentButton from "@/components/PromoteToCurrentButton";

type VoteRow = { user_id: string; profiles: { display_name: string } | null };

export default async function PotentialReadPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;
  }

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("status", "want_to_read")
    .single();
  if (!book) notFound();

  const { data: voteRows } = await supabase
    .from("want_to_read_votes")
    .select("user_id, profiles(display_name)")
    .eq("book_id", bookId);
  const voterNames = ((voteRows ?? []) as unknown as VoteRow[]).map(
    (v) => v.profiles?.display_name ?? "Member"
  );

  let isVotedByMe = false;
  if (user) {
    const { data: myVote } = await supabase
      .from("want_to_read_votes")
      .select("book_id")
      .eq("user_id", user.id)
      .maybeSingle();
    isVotedByMe = myVote?.book_id === bookId;
  }

  const canRemove = isAdmin || (!!user && book.added_by === user.id);

  let hasCurrentBook = false;
  if (isAdmin) {
    const { data: currentBook } = await supabase
      .from("books")
      .select("id")
      .eq("status", "current")
      .maybeSingle();
    hasCurrentBook = !!currentBook;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/want-to-read" className="text-sm text-accent-ink hover:underline">
        ← Potential Reads
      </Link>

      <BookHero title={book.title} author={book.author} coverUrl={book.cover_url}>
        {voterNames.length > 0 && (
          <div className="mt-1">
            <p className="text-sm text-ink-faint">Wants to read:</p>
            <ul className="mt-1 flex flex-col items-center gap-0.5 sm:items-start">
              {voterNames.map((name, i) => (
                <li key={i} className="text-sm text-ink-soft">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {user && (
          <div className="mt-3">
            <PotentialReadActions
              bookId={book.id}
              bookTitle={book.title}
              isVotedByMe={isVotedByMe}
              voterCount={voterNames.length}
              currentUserId={user.id}
              canRemove={canRemove}
            />
          </div>
        )}

        {isAdmin && (
          <div className="mt-3 flex flex-col items-center gap-2 sm:items-start">
            <EditCoverButton bookId={book.id} currentUrl={book.cover_url} />
            <PromoteToCurrentButton
              bookId={book.id}
              bookTitle={book.title}
              author={book.author}
              pageCount={book.page_count}
              hasCurrentBook={hasCurrentBook}
            />
          </div>
        )}
      </BookHero>
    </div>
  );
}
