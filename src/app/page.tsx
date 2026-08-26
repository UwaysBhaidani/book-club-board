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

  const [profileResult, { data: currentBook }] = await Promise.all([
    user
      ? supabase.from("profiles").select("is_admin, display_name, avatar_url").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("books")
      .select("*")
      .eq("status", "current")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const isAdmin = profileResult.data?.is_admin ?? false;
  const currentUserName = profileResult.data?.display_name ?? "You";
  const currentUserAvatarUrl = profileResult.data?.avatar_url ?? null;

  let sections: ChapterSection[] = [];
  let unlockedSectionIds = new Set<string>();
  let questionsBySection: Record<string, DiscussionQuestion[]> = {};
  let commentsByQuestion: Record<string, Comment[]> = {};
  let reactionsByComment: Record<string, CommentReaction[]> = {};
  let favoriteLinesBySection: Record<string, FavoriteLine[]> = {};
  let questionCountBySection: Record<string, number> = {};
  let replyCountBySection: Record<string, number> = {};
  let progressEntries: { userId: string; name: string; label: string; avatarUrl: string | null }[] = [];

  if (currentBook && user) {
    const [{ data: sectionRows }, { data: allProfiles }, { data: progressRows }] = await Promise.all([
      supabase
        .from("chapter_sections")
        .select("*")
        .eq("book_id", currentBook.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("hidden", false)
        .order("display_name", { ascending: true }),
      supabase.from("reading_progress").select("user_id, label").eq("book_id", currentBook.id),
    ]);
    sections = sectionRows ?? [];

    const labelByUser = new Map((progressRows ?? []).map((p) => [p.user_id, p.label]));
    progressEntries = (allProfiles ?? []).map((p) => ({
      userId: p.id,
      name: p.display_name,
      label: labelByUser.get(p.id) ?? "Not started",
      avatarUrl: p.avatar_url,
    }));

    if (sections.length > 0) {
      const sectionIds = sections.map((s) => s.id);

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

      const unlockedIds = sectionIds.filter((id) => unlockedSectionIds.has(id));

      if (unlockedIds.length > 0) {
        const [{ data: questionRows }, { data: lineRows }] = await Promise.all([
          supabase
            .from("discussion_questions")
            .select("*, profiles(display_name, avatar_url)")
            .in("section_id", unlockedIds)
            .order("sort_order", { ascending: true }),
          supabase
            .from("favorite_lines")
            .select("*, profiles(display_name, avatar_url)")
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
            .select("*, profiles!comments_user_id_fkey(display_name, avatar_url)")
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
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
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
              currentUserAvatarUrl={currentUserAvatarUrl}
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
                  questionCount={questionCountBySection[s.id] ?? 0}
                  replyCount={replyCountBySection[s.id] ?? 0}
                />
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
