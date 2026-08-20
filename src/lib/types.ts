export type Profile = {
  id: string;
  display_name: string;
  created_at: string;
};

export type Book = {
  id: string;
  title: string;
  author: string | null;
  status: "current" | "previous" | "want_to_read";
  cover_url: string | null;
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
  created_at: string;
};

export type DiscussionQuestion = {
  id: string;
  section_id: string;
  question: string;
  sort_order: number;
  created_at: string;
};

export type Comment = {
  id: string;
  section_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: Profile | null;
};

export type WantToReadVote = {
  book_id: string;
  user_id: string;
  created_at: string;
};
