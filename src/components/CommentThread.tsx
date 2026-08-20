"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Comment } from "@/lib/types";

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

export default function CommentThread({
  sectionId,
  initialComments,
  currentUserId,
}: {
  sectionId: string;
  initialComments: Comment[];
  currentUserId: string;
}) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ section_id: sectionId, user_id: currentUserId, body: body.trim() })
      .select("*, profiles(display_name)")
      .single();
    setPosting(false);
    if (!error && data) {
      setComments((prev) => [...prev, data as unknown as Comment]);
      setBody("");
    }
  }

  return (
    <div className="mt-4 border-t border-stone-100 pt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
        Discussion ({comments.length})
      </p>
      <div className="flex flex-col gap-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-stone-50 px-3 py-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-stone-700">
                {c.profiles?.display_name ?? "Member"}
              </span>
              <span className="text-xs text-stone-400">{timeAgo(c.created_at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-stone-400">No comments yet — start the discussion.</p>
        )}
      </div>
      <form onSubmit={handlePost} className="mt-3 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={posting}
          className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  );
}
