import { createClient } from "@/lib/supabase/server";
import SectionBoard from "@/components/SectionBoard";
import FavoriteLinesBoard from "@/components/FavoriteLinesBoard";
import SetCurrentBookForm from "@/components/SetCurrentBookForm";
import BookCoverHero from "@/components/BookCoverHero";
import ReadingProgress from "@/components/ReadingProgress";
import type { Comment, CommentReaction, DiscussionQuestion, ChapterSection, FavoriteLine } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let currentUserName = "You";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, display_name")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;
    currentUserName = profile?.display_name ?? "You";
  }

  const { data: currentBook } = await supabase
    .from("books")
    .select("*")
    .eq("status", "current")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sections: ChapterSection[] = [];
  let unlockedSectionIds = new Set<string>();
  let questionsBySection: Record<string, DiscussionQuestion[]> = {};
  let commentsByQuestion: Record<string, Comment[]> = {};
  let reactionsByComment: Record<string, CommentReaction[]> = {};
  let favoriteLinesBySection: Record<string, FavoriteLine[]> = {};
  let progressEntries: { userId: string; name: string; label: string }[] = [];

  if (currentBook && user) {
    const { data: sectionRows } = await supabase
      .from("chapter_sections")
      .select("*")
      .eq("book_id", currentBook.id)
      .order("sort_order", { ascending: true });
    sections = sectionRows ?? [];

    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name", { ascending: true });

    const { data: progressRows } = await supabase
      .from("reading_progress")
      .select("user_id, label")
      .eq("book_id", currentBook.id);
    const labelByUser = new Map((progressRows ?? []).map((p) => [p.user_id, p.label]));
    progressEntries = (allProfiles ?? []).map((p) => ({
      userId: p.id,
      name: p.display_name,
      label: labelByUser.get(p.id) ?? "Not started",
    }));

    if (sections.length > 0) {
      const sectionIds = sections.map((s) => s.id);

      const { data: unlockRows } = await supabase
        .from("section_unlocks")
        .select("section_id")
        .eq("user_id", user.id)
        .in("section_id", sectionIds);
      unlockedSectionIds = new Set((unlockRows ?? []).map((u) => u.section_id));

      const unlockedIds = sectionIds.filter((id) => unlockedSectionIds.has(id));

      if (unlockedIds.length > 0) {
        const { data: questionRows } = await supabase
          .from("discussion_questions")
          .select("*, profiles(display_name)")
          .in("section_id", unlockedIds)
          .order("sort_order", { ascending: true });

        questionsBySection = (questionRows ?? []).reduce((acc, q) => {
          (acc[q.section_id] ??= []).push(q);
          return acc;
        }, {} as Record<string, DiscussionQuestion[]>);

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

        const { data: lineRows } = await supabase
          .from("favorite_lines")
          .select("*, profiles(display_name)")
          .in("section_id", unlockedIds)
          .order("created_at", { ascending: true });

        favoriteLinesBySection = ((lineRows ?? []) as unknown as FavoriteLine[]).reduce((acc, l) => {
          (acc[l.section_id] ??= []).push(l);
          return acc;
        }, {} as Record<string, FavoriteLine[]>);
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {!currentBook && user && isAdmin && <SetCurrentBookForm currentUserId={user.id} />}
      {!currentBook && user && !isAdmin && (
        <p className="text-sm text-ink-faint">
          No current read has been set yet — check back once the club picks one.
        </p>
      )}

      {currentBook && user && (
        <>
          <BookCoverHero
            bookId={currentBook.id}
            title={currentBook.title}
            author={currentBook.author}
            coverUrl={currentBook.cover_url}
            isAdmin={isAdmin}
          />

          <div className="mb-4">
            <ReadingProgress
              bookId={currentBook.id}
              totalChapters={currentBook.total_chapters}
              currentUserId={user.id}
              currentUserName={currentUserName}
              initialProgress={progressEntries}
            />
          </div>

          <div className="flex flex-col gap-4">
            {sections.map((s) =>
              s.kind === "favorite_lines" ? (
                <FavoriteLinesBoard
                  key={s.id}
                  sectionId={s.id}
                  title={s.title}
                  unlocked={unlockedSectionIds.has(s.id)}
                  initialLines={favoriteLinesBySection[s.id] ?? []}
                  currentUserId={user.id}
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
                  currentUserId={user.id}
                />
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
