-- Book Club Discussion Board — Supabase schema
-- Run this in your Supabase project's SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Profiles (one row per member, linked to Supabase Auth user)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Books (current read / previous reads / want-to-read pool)
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  status text not null check (status in ('current', 'previous', 'want_to_read')),
  cover_url text,
  description text,
  page_count int,
  total_chapters int,
  rating numeric(2,1),
  notes text,
  added_by uuid references profiles(id) on delete set null,
  started_at date,
  finished_at date,
  created_at timestamptz not null default now()
);

-- 3. Chapter sections (grouped chapters within a book, e.g. "Chapters 1-5").
-- This is the unit that spoiler-gating locks/unlocks — see section_unlocks below.
-- "kind" distinguishes normal chapter-grouping sections from the special
-- book-wide Favorite Lines board (no discussion questions) and the standing
-- Final Thoughts wrap-up (excluded from reading-progress options).
create table if not exists chapter_sections (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  kind text not null default 'chapters' check (kind in ('chapters', 'favorite_lines', 'final_thoughts')),
  -- AI-suggested discussion questions, shown as suggestions until a member adds one for real.
  suggested_questions text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 4. Discussion questions (auto-generated and/or manually added, per section)
create table if not exists discussion_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references chapter_sections(id) on delete cascade,
  question text not null,
  sort_order int not null default 0,
  created_by uuid references profiles(id) on delete set null,
  -- True when promoted from an AI suggestion — those are never attributed to
  -- whoever clicked "Add", only manually-authored questions are.
  is_suggested boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. Comments (flat thread per discussion question, attributed to a member)
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references discussion_questions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- 6. Want-to-read votes (flag interest in a proposed book).
-- A member can vote for as many proposals as they like, but only once per
-- book — the primary key enforces that.
create table if not exists want_to_read_votes (
  book_id uuid not null references books(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

-- 7. Section unlocks (per-user, per-section manual spoiler gate; reversible)
create table if not exists section_unlocks (
  section_id uuid not null references chapter_sections(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (section_id, user_id)
);

-- 8. Member ratings for finished books ("Dawg Rating" is the group average).
-- Half-star ratings allowed (1, 1.5, 2, ..., 5).
create table if not exists book_ratings (
  book_id uuid not null references books(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5 and rating * 2 = round(rating * 2)),
  created_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

-- 9. Self-reported reading progress per book (not spoiler-gated — it's just a label)
create table if not exists reading_progress (
  book_id uuid not null references books(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  updated_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

-- 10. Favorite lines — shared under the book's single dedicated Favorite Lines
-- section (chapter_sections.kind = 'favorite_lines'), spoiler-gated the same
-- way as any other section.
create table if not exists favorite_lines (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references chapter_sections(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  quote text not null,
  created_at timestamptz not null default now()
);

-- 11. Non-emoji reactions on comments: thumbs up, thumbs down, heart (one per user per comment)
create table if not exists comment_reactions (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  reaction text not null check (reaction in ('up', 'down', 'heart')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table profiles enable row level security;
alter table books enable row level security;
alter table chapter_sections enable row level security;
alter table discussion_questions enable row level security;
alter table comments enable row level security;
alter table want_to_read_votes enable row level security;
alter table section_unlocks enable row level security;
alter table book_ratings enable row level security;
alter table reading_progress enable row level security;
alter table favorite_lines enable row level security;
alter table comment_reactions enable row level security;

create policy "profiles are viewable by everyone signed in"
  on profiles for select to authenticated using (true);
create policy "users can insert their own profile"
  on profiles for insert to authenticated with check (auth.uid() = id);
create policy "users can update their own profile"
  on profiles for update to authenticated using (auth.uid() = id);

create policy "books are viewable by everyone signed in"
  on books for select to authenticated using (true);
-- Anyone can propose a want-to-read book; only admins can set the current read.
create policy "members can propose want-to-read books"
  on books for insert to authenticated
  with check (status = 'want_to_read' and auth.uid() = added_by);
create policy "admins can add current books"
  on books for insert to authenticated
  with check (
    status = 'current' and auth.uid() = added_by
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
create policy "admins can update books"
  on books for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "admins can delete books"
  on books for delete to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
-- Anyone can remove their own want-to-read proposal (admins can remove any book, above).
create policy "proposers can remove their own want-to-read book"
  on books for delete to authenticated
  using (status = 'want_to_read' and added_by = auth.uid());

create policy "sections are viewable by everyone signed in"
  on chapter_sections for select to authenticated using (true);
-- Only admins build out the discussion sections for a book.
create policy "admins can add sections"
  on chapter_sections for insert to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
-- Anyone can update a section's suggested_questions (e.g. promoting a suggestion to a real question).
create policy "members can update sections"
  on chapter_sections for update to authenticated
  using (true)
  with check (true);

create policy "questions are viewable by everyone signed in"
  on discussion_questions for select to authenticated using (true);
create policy "members can add questions"
  on discussion_questions for insert to authenticated with check (true);
create policy "creators can delete their own questions"
  on discussion_questions for delete to authenticated using (auth.uid() = created_by);

create policy "comments are viewable by everyone signed in"
  on comments for select to authenticated using (true);
create policy "members can add their own comments"
  on comments for insert to authenticated with check (auth.uid() = user_id);
create policy "members can delete their own comments"
  on comments for delete to authenticated using (auth.uid() = user_id);
create policy "members can edit their own comments"
  on comments for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "votes are viewable by everyone signed in"
  on want_to_read_votes for select to authenticated using (true);
create policy "members can cast their own vote"
  on want_to_read_votes for insert to authenticated with check (auth.uid() = user_id);
create policy "members can remove their own vote"
  on want_to_read_votes for delete to authenticated using (auth.uid() = user_id);

-- Unlock rows are private to the user who unlocked the section — otherwise
-- everyone's read progress would be inferable from the client.
create policy "users can view their own unlocks"
  on section_unlocks for select to authenticated using (auth.uid() = user_id);
create policy "users can unlock a section for themselves"
  on section_unlocks for insert to authenticated with check (auth.uid() = user_id);
create policy "users can re-lock a section for themselves"
  on section_unlocks for delete to authenticated using (auth.uid() = user_id);

create policy "ratings are viewable by everyone signed in"
  on book_ratings for select to authenticated using (true);
create policy "members can rate books"
  on book_ratings for insert to authenticated with check (auth.uid() = user_id);
create policy "members can update their own rating"
  on book_ratings for update to authenticated using (auth.uid() = user_id);
create policy "members can remove their own rating"
  on book_ratings for delete to authenticated using (auth.uid() = user_id);

create policy "progress is viewable by everyone signed in"
  on reading_progress for select to authenticated using (true);
create policy "members can set their own progress"
  on reading_progress for insert to authenticated with check (auth.uid() = user_id);
create policy "members can update their own progress"
  on reading_progress for update to authenticated using (auth.uid() = user_id);

create policy "favorite lines are viewable by everyone signed in"
  on favorite_lines for select to authenticated using (true);
create policy "members can add their own favorite line"
  on favorite_lines for insert to authenticated with check (auth.uid() = user_id);
create policy "members can delete their own favorite line"
  on favorite_lines for delete to authenticated using (auth.uid() = user_id);

create policy "reactions are viewable by everyone signed in"
  on comment_reactions for select to authenticated using (true);
create policy "members can react"
  on comment_reactions for insert to authenticated with check (auth.uid() = user_id);
create policy "members can change their reaction"
  on comment_reactions for update to authenticated using (auth.uid() = user_id);
create policy "members can remove their reaction"
  on comment_reactions for delete to authenticated using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
