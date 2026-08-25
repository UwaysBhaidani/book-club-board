import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SectionBoard from "@/components/SectionBoard";
import FavoriteLinesBoard from "@/components/FavoriteLinesBoard";
import BookRating from "@/components/BookRating";
import BookHero from "@/components/BookHero";
import DeleteBookButton from "@/components/DeleteBookButton";
import { formatMonthYear } from "@/lib/format";
import type { Comment, CommentReaction, DiscussionQuestion, FavoriteLine } from "@/lib/types";

export default async function ArchiveBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, { data: book }, { data: profiles }, { data: ratingRows }, { data: sections }] =
    await Promise.all([
      user
        ? supabase.from("profiles").select("is_admin").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      supabase.from("books").select("*").eq("id", bookId).single(),
      supabase.from("profiles").select("id, display_name").order("display_name", { ascending: true }),
      supabase.from("book_ratings").select("user_id, rating").eq("book_id", bookId),
      supabase
        .from("chapter_sections")
        .select("*")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true }),
    ]);
  const isAdmin = profileResult.data?.is_admin ?? false;
  if (!book) notFound();

  const ratingByUser = new Map((ratingRows ?? []).map((r) => [r.user_id, r.rating]));
  const ratingEntries = (profiles ?? []).map((p) => ({
    userId: p.id,
    name: p.display_name,
    rating: ratingByUser.get(p.id) ?? null,
  }));

  const sectionIds = (sections ?? []).map((s) => s.id);
  let unlockedSectionIds = new Set<string>();
  let questionsBySection: Record<string, DiscussionQuestion[]> = {};
  let commentsByQuestion: Record<string, Comment[]> = {};
  let reactionsByComment: Record<string, CommentReaction[]> = {};
  let favoriteLinesBySection: Record<string, FavoriteLine[]> = {};
  let questionCountBySection: Record<string, number> = {};
  let replyCountBySection: Record<string, number> = {};

  if (sectionIds.length > 0 && user) {
    const [{ data: unlockRows }, { data: allQuestionRows }] = await Promise.all([
      supabase
        .from("section_unlocks")
        .select("section_id")
        .eq("user_id", user.id)
        .in("section_id", sectionIds),
      supabase.from("discussion_questions").select("id, section_id").in("section_id", sectionIds),
    ]);
    unlockedSectionIds = new Set((unlockRows ?? []).map((u) => u.section_id));

    questionCountBySection = (allQuestionRows ?? []).reduce((acc, q) => {
      acc[q.section_id] = (acc[q.section_id] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sectionByQuestionId = new Map((allQuestionRows ?? []).map((q) => [q.id, q.section_id]));
    const allQuestionIds = (allQuestionRows ?? []).map((q) => q.id);

    if (allQuestionIds.length > 0) {
      const { data: allCommentRows } = await supabase
        .from("comments")
        .select("id, question_id")
        .in("question_id", allQuestionIds);
      replyCountBySection = (allCommentRows ?? []).reduce((acc, c) => {
        const sectionId = sectionByQuestionId.get(c.question_id);
        if (sectionId) acc[sectionId] = (acc[sectionId] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  const unlockedIds = sectionIds.filter((id) => unlockedSectionIds.has(id));

  if (unlockedIds.length > 0) {
    const [{ data: questionRows }, { data: lineRows }] = await Promise.all([
      supabase
        .from("discussion_questions")
        .select("*, profiles(display_name)")
        .in("section_id", unlockedIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("favorite_lines")
        .select("*, profiles(display_name)")
        .in("section_id", unlockedIds)
        .order("created_at", { ascending: true }),
    ]);
    questionsBySection = (questionRows ?? []).reduce((acc, q) => {
      (acc[q.section_id] ??= []).push(q);
      return acc;
    }, {} as Record<string, DiscussionQuestion[]>);

    favoriteLinesBySection = ((lineRows ?? []) as unknown as FavoriteLine[]).reduce((acc, l) => {
      (acc[l.section_id] ??= []).push(l);
      return acc;
    }, {} as Record<string, FavoriteLine[]>);

    const questionIds = (questionRows ?? []).map((q) => q.id);

    if (questionIds.length > 0) {
      const { data: commentRows } = await supabase
        .from("comments")
        .select("*, profiles!comments_user_id_fkey(display_name)")
        .in("question_id", questionIds)
        .order("created_at", { ascending: true });
      commentsByQuestion = (commentRows ?? []).reduce((acc, c) => {
        (acc[c.question_id] ??= []).push(c as unknown as Comment);
        return acc;
      }, {} as Record<string, Comment[]>);

      const commentIds = (commentRows ?? []).map((c) => c.id);

      if (commentIds.length > 0) {
        const { data: reactionRows } = await supabase
          .from("comment_reactions")
          .select("*")
          .in("comment_id", commentIds);
        reactionsByComment = (reactionRows ?? []).reduce((acc, r) => {
          (acc[r.comment_id] ??= []).push(r);
          return acc;
        }, {} as Record<string, CommentReaction[]>);
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/archive" className="text-sm text-accent-ink hover:underline">
        ← Previous Reads
      </Link>
      <BookHero
        title={book.title}
        author={book.author}
        coverUrl={book.cover_url}
        eyebrow={formatMonthYear(book.finished_at) ? `Read ${formatMonthYear(book.finished_at)}` : null}
      >
        {isAdmin && (
          <div className="mt-2 flex flex-col items-center gap-2 sm:items-start">
            <DeleteBookButton bookId={book.id} title={book.title} />
          </div>
        )}
      </BookHero>

      {user && (
        <div className="mb-4">
          <BookRating bookId={book.id} currentUserId={user.id} initialEntries={ratingEntries} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {(sections ?? []).map((s) =>
          s.kind === "favorite_lines" ? (
            <FavoriteLinesBoard
              key={s.id}
              sectionId={s.id}
              title={s.title}
              unlocked={unlockedSectionIds.has(s.id)}
              initialLines={favoriteLinesBySection[s.id] ?? []}
              currentUserId={user!.id}
            />
          ) : (
            <SectionBoard
              key={s.id}
              sectionId={s.id}
              title={s.title}
              unlocked={unlockedSectionIds.has(s.id)}
              questions={questionsBySection[s.id] ?? []}
              commentsByQuestion={commentsByQuestion}
              reactionsByComment={reactionsByComment}
              suggestedQuestions={s.suggested_questions ?? []}
              currentUserId={user!.id}
              showSuggestions={false}
              questionCount={questionCountBySection[s.id] ?? 0}
              replyCount={replyCountBySection[s.id] ?? 0}
            />
          )
        )}
        {(!sections || sections.length === 0) && (
          <p className="text-sm text-ink-faint">No discussion sections were recorded for this book.</p>
        )}
      </div>
    </div>
  );
}
