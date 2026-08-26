export type Profile = {
  id: string;
  display_name: string;
  is_admin: boolean;
  avatar_url: string | null;
  created_at: string;
};

export type Book = {
  id: string;
  title: string;
  author: string | null;
  status: "current" | "previous" | "want_to_read";
  cover_url: string | null;
  description: string | null;
  genre: string | null;
  page_count: number | null;
  total_chapters: number | null;
  notes: string | null;
  added_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type ChapterSection = {
  id: string;
  book_id: string;
  title: string;
  sort_order: number;
  kind: "chapters" | "favorite_lines" | "final_thoughts";
  suggested_questions: string[];
  created_at: string;
};

export type DiscussionQuestion = {
  id: string;
  section_id: string;
  question: string;
  sort_order: number;
  created_by: string | null;
  is_suggested: boolean;
  created_at: string;
  profiles?: Profile | null;
};

export type Comment = {
  id: string;
  question_id: string;
  user_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  updated_at: string | null;
  profiles?: Profile | null;
};

export type WantToReadVote = {
  book_id: string;
  user_id: string;
  created_at: string;
};

export type SectionUnlock = {
  section_id: string;
  user_id: string;
  unlocked_at: string;
};

export type BookRating = {
  book_id: string;
  user_id: string;
  rating: number;
  created_at: string;
};

export type ReadingProgress = {
  book_id: string;
  user_id: string;
  label: string;
  updated_at: string;
};

export type FavoriteLine = {
  id: string;
  section_id: string;
  user_id: string;
  quote: string;
  created_at: string;
  profiles?: Profile | null;
};

export const COMMENT_REACTIONS = ["up", "down", "heart"] as const;
export type CommentReactionType = (typeof COMMENT_REACTIONS)[number];

export type CommentReaction = {
  comment_id: string;
  user_id: string;
  reaction: CommentReactionType;
  created_at: string;
};

export type BookSearchResult = {
  title: string;
  author: string | null;
  cover_url: string | null;
  page_count: number | null;
  published_year: string | null;
  description: string | null;
};
