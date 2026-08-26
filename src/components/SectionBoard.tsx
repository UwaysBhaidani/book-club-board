"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CommentThread from "./CommentThread";
import PadlockIcon from "./PadlockIcon";
import { withMinDuration } from "@/lib/timing";
import type { Comment, CommentReaction, DiscussionQuestion } from "@/lib/types";

function LockedSection({
  title,
  onUnlock,
  loading,
  questionCount,
  replyCount,
}: {
  title: string;
  onUnlock: () => void;
  loading: boolean;
  questionCount: number;
  replyCount: number;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-ink">{title}</h3>
          <p className="mt-0.5 text-xs text-ink-faint">
            {questionCount} Discussion Point{questionCount === 1 ? "" : "s"} ·{" "}
            {replyCount} Repl{replyCount === 1 ? "y" : "ies"}
          </p>
        </div>
        <button
          onClick={onUnlock}
          disabled={loading}
          aria-label="Unlock"
          title="Unlock"
          className={`flex flex-none appearance-none items-center justify-center rounded-full border-2 bg-accent p-2.5 text-accent-contrast hover:border-accent-ink active:border-accent-ink disabled:opacity-50 ${
            loading ? "border-accent-ink" : "border-transparent"
          }`}
        >
          <PadlockIcon unlocked={loading} />
        </button>
      </div>
    </div>
  );
}

function AddQuestionForm({
  sectionId,
  nextOrder,
  currentUserId,
}: {
  sectionId: string;
  nextOrder: number;
  currentUserId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    await supabase.from("discussion_questions").insert({
      section_id: sectionId,
      question: question.trim(),
      sort_order: nextOrder,
      created_by: currentUserId,
    });
    setLoading(false);
    setQuestion("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2 border-t border-border pt-3">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Start a new discussion…"
        className="flex-1 rounded-control border border-border bg-paper px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-control border border-border px-3 py-2 text-sm text-ink-soft hover:border-accent hover:text-accent-ink disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

function SuggestedQuestions({
  sectionId,
  suggestions,
  nextOrder,
  currentUserId,
}: {
  sectionId: string;
  suggestions: string[];
  nextOrder: number;
  currentUserId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [adding, setAdding] = useState<string | null>(null);

  async function addSuggestion(question: string) {
    setAdding(question);
    await supabase.from("discussion_questions").insert({
      section_id: sectionId,
      question,
      sort_order: nextOrder,
      created_by: currentUserId,
      is_suggested: true,
    });
    await supabase
      .from("chapter_sections")
      .update({ suggested_questions: suggestions.filter((s) => s !== question) })
      .eq("id", sectionId);
    setAdding(null);
    router.refresh();
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
        Suggested questions
      </p>
      <ul className="flex flex-col gap-2">
        {suggestions.map((q) => (
          <li key={q} className="flex items-start justify-between gap-3 text-sm text-ink-faint">
            <span>{q}</span>
            <button
              onClick={() => addSuggestion(q)}
              disabled={adding === q}
              className="flex-none text-xs text-accent-ink hover:underline disabled:opacity-50"
            >
              {adding === q ? "Adding…" : "Add"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SectionBoard({
  sectionId,
  title,
  unlocked,
  questions,
  commentsByQuestion,
  reactionsByComment,
  suggestedQuestions,
  currentUserId,
  showSuggestions = true,
  questionCount = 0,
  replyCount = 0,
}: {
  sectionId: string;
  title: string;
  unlocked: boolean;
  questions: DiscussionQuestion[];
  commentsByQuestion: Record<string, Comment[]>;
  reactionsByComment: Record<string, CommentReaction[]>;
  suggestedQuestions: string[];
  currentUserId: string;
  showSuggestions?: boolean;
  questionCount?: number;
  replyCount?: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function startEditQuestion(q: DiscussionQuestion) {
    setEditingQuestionId(q.id);
    setEditQuestionText(q.question);
  }

  function cancelEditQuestion() {
    setEditingQuestionId(null);
    setEditQuestionText("");
  }

  async function saveEditQuestion(questionId: string) {
    if (!editQuestionText.trim()) return;
    setEditSaving(true);
    await supabase
      .from("discussion_questions")
      .update({ question: editQuestionText.trim() })
      .eq("id", questionId);
    setEditSaving(false);
    setEditingQuestionId(null);
    setEditQuestionText("");
    router.refresh();
  }

  async function unlock() {
    setPending(true);
    // Hold the open-padlock pose visible for a moment even if the write
    // itself resolves almost instantly, so it doesn't flash by unseen.
    await withMinDuration(
      supabase.from("section_unlocks").insert({ section_id: sectionId, user_id: currentUserId }),
      350
    );
    setPending(false);
    router.refresh();
  }

  async function relock() {
    setPending(true);
    await withMinDuration(
      supabase
        .from("section_unlocks")
        .delete()
        .eq("section_id", sectionId)
        .eq("user_id", currentUserId),
      350
    );
    setPending(false);
    router.refresh();
  }

  async function deleteQuestion(questionId: string) {
    if (!confirm("Delete this discussion question? This also removes its comments.")) return;
    await supabase.from("discussion_questions").delete().eq("id", questionId);
    router.refresh();
  }

  if (!unlocked) {
    return (
      <LockedSection
        title={title}
        onUnlock={unlock}
        loading={pending}
        questionCount={questionCount}
        replyCount={replyCount}
      />
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <button
          onClick={relock}
          disabled={pending}
          aria-label="Hide section"
          title="Hide section"
          className="flex flex-none appearance-none items-center justify-center rounded-full p-2.5 text-ink-faint hover:bg-accent-soft hover:text-accent-ink disabled:opacity-50"
        >
          <PadlockIcon unlocked={!pending} />
        </button>
      </div>

      {questions.length > 0 && (
        <div className="mt-4 flex flex-col gap-5">
          {questions.map((q) => (
            <div key={q.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
              {editingQuestionId === q.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={editQuestionText}
                    onChange={(e) => setEditQuestionText(e.target.value)}
                    className="rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEditQuestion(q.id)}
                      disabled={editSaving}
                      className="rounded-pill bg-accent px-3 py-1 text-xs font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
                    >
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={cancelEditQuestion}
                      disabled={editSaving}
                      className="rounded-pill border border-border px-3 py-1 text-xs text-ink-soft hover:border-accent hover:text-accent-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="discussion-text text-sm font-medium text-ink">{q.question}</p>
                    {!q.is_suggested && q.profiles?.display_name && (
                      <p className="text-xs text-ink-faint">Added by {q.profiles.display_name}</p>
                    )}
                  </div>
                  {q.created_by === currentUserId && (
                    <div className="flex flex-none gap-3">
                      <button
                        onClick={() => startEditQuestion(q)}
                        className="text-xs text-ink-faint hover:text-accent-ink"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="text-xs text-ink-faint hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
              <CommentThread
                questionId={q.id}
                initialComments={commentsByQuestion[q.id] ?? []}
                reactionsByComment={reactionsByComment}
                currentUserId={currentUserId}
              />
            </div>
          ))}
        </div>
      )}

      <AddQuestionForm sectionId={sectionId} nextOrder={questions.length} currentUserId={currentUserId} />
      {showSuggestions && (
        <SuggestedQuestions
          sectionId={sectionId}
          suggestions={suggestedQuestions}
          nextOrder={questions.length}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
