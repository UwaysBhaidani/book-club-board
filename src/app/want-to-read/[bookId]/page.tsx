import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookHero from "@/components/BookHero";
import PotentialReadActions from "@/components/PotentialReadActions";
import EditCoverButton from "@/components/EditCoverButton";
import PromoteToCurrentButton from "@/components/PromoteToCurrentButton";
import Avatar from "@/components/Avatar";

type VoteRow = {
  user_id: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

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

  let addedByName: string | null = null;
  if (book.added_by) {
    const { data: adder } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", book.added_by)
      .maybeSingle();
    addedByName = adder?.display_name ?? null;
  }

  const { data: voteRows } = await supabase
    .from("want_to_read_votes")
    .select("user_id, profiles(display_name, avatar_url)")
    .eq("book_id", bookId);
  const voters = ((voteRows ?? []) as unknown as VoteRow[]).map((v) => ({
    userId: v.user_id,
    name: v.profiles?.display_name ?? "Member",
    avatarUrl: v.profiles?.avatar_url ?? null,
  }));

  let isVotedByMe = false;
  if (user) {
    const { data: myVote } = await supabase
      .from("want_to_read_votes")
      .select("book_id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle();
    isVotedByMe = !!myVote;
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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/want-to-read" className="text-sm text-accent-ink hover:underline">
        ← Potential Reads
      </Link>

      <BookHero title={book.title} author={book.author} coverUrl={book.cover_url}>
        {book.page_count && <p className="text-sm text-ink-soft">{book.page_count} pages</p>}

        {addedByName && <p className="text-xs text-ink-faint">Added by {addedByName}</p>}

        {voters.length > 0 && (
          <div className="mt-1">
            <p className="text-sm text-ink-faint">Wants to read:</p>
            <ul className="mt-1 flex flex-col items-center gap-0.5 sm:items-start">
              {voters.map((v) => (
                <li key={v.userId} className="flex items-center gap-1.5 text-sm text-ink-soft">
                  <Avatar avatarUrl={v.avatarUrl} seed={v.userId} size={16} />
                  {v.name}
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
              voterCount={voters.length}
              currentUserId={user.id}
              canRemove={canRemove}
            />
          </div>
        )}

        {(isAdmin || canRemove) && (
          <div className="mt-3 flex flex-col items-center gap-2 sm:items-start">
            <EditCoverButton bookId={book.id} currentUrl={book.cover_url} />
            {isAdmin && (
              <PromoteToCurrentButton
                bookId={book.id}
                bookTitle={book.title}
                author={book.author}
                pageCount={book.page_count}
                hasCurrentBook={hasCurrentBook}
              />
            )}
          </div>
        )}
      </BookHero>

      {book.description && (
        <div className="mt-2 border-t border-border pt-4">
          <p className="text-sm leading-relaxed text-ink-soft">{book.description}</p>
        </div>
      )}
    </div>
  );
}
