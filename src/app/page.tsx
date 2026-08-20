import { createClient } from "@/lib/supabase/server";
import SectionBoard from "@/components/SectionBoard";
import AddSectionForm from "@/components/AddSectionForm";
import SetCurrentBookForm from "@/components/SetCurrentBookForm";
import FinishBookButton from "@/components/FinishBookButton";
import type { Comment, DiscussionQuestion, ChapterSection } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentBook } = await supabase
    .from("books")
    .select("*")
    .eq("status", "current")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sections: ChapterSection[] = [];
  let questionsBySection: Record<string, DiscussionQuestion[]> = {};
  let commentsBySection: Record<string, Comment[]> = {};

  if (currentBook) {
    const { data: sectionRows } = await supabase
      .from("chapter_sections")
      .select("*")
      .eq("book_id", currentBook.id)
      .order("sort_order", { ascending: true });
    sections = sectionRows ?? [];

    if (sections.length > 0) {
      const sectionIds = sections.map((s) => s.id);

      const { data: questionRows } = await supabase
        .from("discussion_questions")
        .select("*")
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true });

      questionsBySection = (questionRows ?? []).reduce((acc, q) => {
        (acc[q.section_id] ??= []).push(q);
        return acc;
      }, {} as Record<string, DiscussionQuestion[]>);

      const { data: commentRows } = await supabase
        .from("comments")
        .select("*, profiles(display_name)")
        .in("section_id", sectionIds)
        .order("created_at", { ascending: true });

      commentsBySection = (commentRows ?? []).reduce((acc, c) => {
        (acc[c.section_id] ??= []).push(c as unknown as Comment);
        return acc;
      }, {} as Record<string, Comment[]>);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {!currentBook && user && <SetCurrentBookForm currentUserId={user.id} />}

      {currentBook && (
        <>
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                Currently Reading
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-stone-800">{currentBook.title}</h1>
              {currentBook.author && (
                <p className="text-sm text-stone-500">by {currentBook.author}</p>
              )}
            </div>
            <FinishBookButton bookId={currentBook.id} />
          </div>

          <div className="flex flex-col gap-4">
            {sections.map((s) => (
              <SectionBoard
                key={s.id}
                sectionId={s.id}
                title={s.title}
                questions={questionsBySection[s.id] ?? []}
                comments={commentsBySection[s.id] ?? []}
                currentUserId={user!.id}
              />
            ))}
          </div>

          <div className="mt-4">
            <AddSectionForm
              bookId={currentBook.id}
              bookTitle={currentBook.title}
              nextOrder={sections.length}
            />
          </div>
        </>
      )}
    </div>
  );
}
