"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";
import type { Comment, CommentReaction, CommentReactionType } from "@/lib/types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ThumbsUpIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbsDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
      <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ReactionBar({
  commentId,
  reactions,
  currentUserId,
  onToggle,
}: {
  commentId: string;
  reactions: CommentReaction[];
  currentUserId: string;
  onToggle: (commentId: string, reaction: CommentReactionType) => void;
}) {
  const mine = reactions.find((r) => r.user_id === currentUserId)?.reaction ?? null;
  const countOf = (r: CommentReactionType) => reactions.filter((x) => x.reaction === r).length;

  return (
    <div className="mt-2 flex items-center gap-3">
      <button
        onClick={() => onToggle(commentId, "up")}
        className={
          mine === "up"
            ? "flex items-center gap-1 text-accent-ink"
            : "flex items-center gap-1 text-ink-faint hover:text-accent-ink"
        }
        aria-label="Thumbs up"
      >
        <ThumbsUpIcon />
        {countOf("up") > 0 && countOf("up")}
      </button>
      <button
        onClick={() => onToggle(commentId, "down")}
        className={
          mine === "down"
            ? "flex items-center gap-1 text-thumb-down"
            : "flex items-center gap-1 text-ink-faint hover:text-thumb-down"
        }
        aria-label="Thumbs down"
      >
        <ThumbsDownIcon />
        {countOf("down") > 0 && countOf("down")}
      </button>
      <button
        onClick={() => onToggle(commentId, "heart")}
        className={
          mine === "heart"
            ? "flex items-center gap-1 text-heart"
            : "flex items-center gap-1 text-ink-faint hover:text-heart"
        }
        aria-label="Heart"
      >
        <HeartIcon filled={mine === "heart"} />
        {countOf("heart") > 0 && countOf("heart")}
      </button>
    </div>
  );
}

export default function CommentThread({
  questionId,
  initialComments,
  reactionsByComment,
  currentUserId,
}: {
  questionId: string;
  initialComments: Comment[];
  reactionsByComment: Record<string, CommentReaction[]>;
  currentUserId: string;
}) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [reactions, setReactions] = useState(reactionsByComment);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    setError(null);
    const { data, error } = await supabase
      .from("comments")
      .insert({ question_id: questionId, user_id: currentUserId, body: body.trim() })
      .select("*, profiles!comments_user_id_fkey(display_name, avatar_url)")
      .single();
    setPosting(false);
    if (error || !data) {
      setError(error?.message ?? "Could not post your comment");
      return;
    }
    setComments((prev) => [...prev, data as unknown as Comment]);
    setBody("");
  }

  async function toggleReaction(commentId: string, reaction: CommentReactionType) {
    const current = reactions[commentId] ?? [];
    const mine = current.find((r) => r.user_id === currentUserId);

    if (mine?.reaction === reaction) {
      setReactions((prev) => ({
        ...prev,
        [commentId]: current.filter((r) => r.user_id !== currentUserId),
      }));
      await supabase
        .from("comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId);
    } else {
      setReactions((prev) => ({
        ...prev,
        [commentId]: [
          ...current.filter((r) => r.user_id !== currentUserId),
          { comment_id: commentId, user_id: currentUserId, reaction, created_at: new Date().toISOString() },
        ],
      }));
      await supabase
        .from("comment_reactions")
        .upsert({ comment_id: commentId, user_id: currentUserId, reaction }, { onConflict: "comment_id,user_id" });
    }
  }

  function startReply(commentId: string) {
    setReplyingTo((prev) => (prev === commentId ? null : commentId));
    setReplyBody("");
  }

  async function handleReplySubmit(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setReplyPosting(true);
    setError(null);
    const { data, error } = await supabase
      .from("comments")
      .insert({
        question_id: questionId,
        user_id: currentUserId,
        body: replyBody.trim(),
        parent_comment_id: parentId,
      })
      .select("*, profiles!comments_user_id_fkey(display_name, avatar_url)")
      .single();
    setReplyPosting(false);
    if (error || !data) {
      setError(error?.message ?? "Could not post your reply");
      return;
    }
    setComments((prev) => [...prev, data as unknown as Comment]);
    setReplyingTo(null);
    setReplyBody("");
  }

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setEditBody(c.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  async function saveEdit(id: string) {
    if (!editBody.trim()) return;
    setEditSaving(true);
    setError(null);
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("comments")
      .update({ body: editBody.trim(), updated_at: updatedAt })
      .eq("id", id);
    setEditSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, body: editBody.trim(), updated_at: updatedAt } : c))
    );
    setEditingId(null);
    setEditBody("");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this comment?")) return;
    setError(null);
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== id && c.parent_comment_id !== id));
  }

  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parent_comment_id) (acc[c.parent_comment_id] ??= []).push(c);
    return acc;
  }, {} as Record<string, Comment[]>);

  function renderComment(c: Comment, isReply: boolean) {
    const isMine = c.user_id === currentUserId;
    const isEditing = editingId === c.id;

    return (
      <div key={c.id} className={isReply ? "ml-6 rounded-control bg-paper/60 px-3 py-2" : "rounded-control bg-paper px-3 py-2"}>
        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <Avatar avatarUrl={c.profiles?.avatar_url} seed={c.user_id} size={20} />
            {c.profiles?.display_name ?? "Member"}
          </span>
          <span className="text-xs text-ink-faint">
            {timeAgo(c.created_at)}
            {c.updated_at ? " · edited" : ""}
          </span>
        </div>

        {isEditing ? (
          <div className="mt-1 flex flex-col gap-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={2}
              className="w-full rounded-control border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => saveEdit(c.id)}
                disabled={editSaving}
                className="rounded-pill bg-accent px-3 py-1 text-xs font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                disabled={editSaving}
                className="rounded-pill border border-border px-3 py-1 text-xs text-ink-soft hover:border-accent hover:text-accent-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="discussion-text mt-1 whitespace-pre-wrap text-sm text-ink-soft">{c.body}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <ReactionBar
            commentId={c.id}
            reactions={reactions[c.id] ?? []}
            currentUserId={currentUserId}
            onToggle={toggleReaction}
          />
          {!isReply && (
            <button
              onClick={() => startReply(c.id)}
              className="text-xs text-ink-faint hover:text-accent-ink"
            >
              Reply
            </button>
          )}
          {isMine && !isEditing && (
            <>
              <button
                onClick={() => startEdit(c)}
                className="text-xs text-ink-faint hover:text-accent-ink"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-xs text-ink-faint hover:text-accent-ink"
              >
                Delete
              </button>
            </>
          )}
        </div>

        {replyingTo === c.id && (
          <form onSubmit={(e) => handleReplySubmit(e, c.id)} className="mt-2 flex gap-2">
            <input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              className="flex-1 rounded-control border border-border bg-paper px-3 py-2 text-sm focus:border-accent focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={replyPosting}
              className="rounded-control bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
            >
              Reply
            </button>
          </form>
        )}

        {!isReply && (repliesByParent[c.id] ?? []).length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {repliesByParent[c.id].map((r) => renderComment(r, true))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-col gap-2">
        {topLevel.map((c) => renderComment(c, false))}
      </div>
      <form onSubmit={handlePost} className="mt-2 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts on this…"
          className="flex-1 rounded-control border border-border bg-paper px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={posting}
          className="rounded-control bg-accent px-3 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
        >
          Post
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-accent-ink">{error}</p>}
    </div>
  );
}
