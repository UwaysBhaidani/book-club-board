import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SectionBoard from "@/components/SectionBoard";
import type { Comment, DiscussionQuestion } from "@/lib/types";

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

  const { data: book } = await supabase.from("books").select("*").eq("id", bookId).single();
  if (!book) notFound();

  const { data: sections } = await supabase
    .from("chapter_sections")
    .select("*")
    .eq("book_id", bookId)
    .order("sort_order", { ascending: true });

  const sectionIds = (sections ?? []).map((s) => s.id);
  let questionsBySection: Record<string, DiscussionQuestion[]> = {};
  let commentsBySection: Record<string, Comment[]> = {};

  if (sectionIds.length > 0) {
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/archive" className="text-sm text-amber-700 hover:underline">
        ← Previous Reads
      </Link>
      <div className="mb-6 mt-2 rounded-xl border border-stone-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-stone-800">{book.title}</h1>
        {book.author && <p className="text-sm text-stone-500">by {book.author}</p>}
        {book.finished_at && (
          <p className="mt-1 text-xs text-stone-400">Finished {book.finished_at}</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {(sections ?? []).map((s) => (
          <SectionBoard
            key={s.id}
            sectionId={s.id}
            title={s.title}
            questions={questionsBySection[s.id] ?? []}
            comments={commentsBySection[s.id] ?? []}
            currentUserId={user!.id}
          />
        ))}
        {(!sections || sections.length === 0) && (
          <p className="text-sm text-stone-400">No discussion sections were recorded for this book.</p>
        )}
      </div>
    </div>
  );
}
