"use client";

import { useState } from "react";
import CommentThread from "./CommentThread";
import type { Comment, DiscussionQuestion } from "@/lib/types";

export default function SectionBoard({
  sectionId,
  title,
  questions,
  comments,
  currentUserId,
}: {
  sectionId: string;
  title: string;
  questions: DiscussionQuestion[];
  comments: Comment[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-base font-semibold text-stone-800">{title}</h3>
        <span className="text-stone-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <>
          {questions.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {questions.map((q, i) => (
                <li key={q.id} className="flex gap-2 text-sm text-stone-600">
                  <span className="font-medium text-amber-700">{i + 1}.</span>
                  <span>{q.question}</span>
                </li>
              ))}
            </ul>
          )}
          {questions.length === 0 && (
            <p className="mt-3 text-sm text-stone-400">
              No discussion questions yet for this section.
            </p>
          )}
          <CommentThread
            sectionId={sectionId}
            initialComments={comments}
            currentUserId={currentUserId}
          />
        </>
      )}
    </div>
  );
}
