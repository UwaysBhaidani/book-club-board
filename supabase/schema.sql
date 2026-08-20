-- Book Club Discussion Board — Supabase schema
-- Run this in your Supabase project's SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Profiles (one row per member, linked to Supabase Auth user)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
      created_at timestamptz not null default now()
      );

      -- 2. Books (current read / previous reads / want-to-read pool)
      create table if not exists books (
        id uuid primary key default gen_random_uuid(),
          title text not null,
            author text,
              status text not null check (status in ('current', 'previous', 'want_to_read')),
                cover_url text,
                  notes text,
                    added_by uuid references profiles(id) on delete set null,
                      started_at date,
                        finished_at date,
                          created_at timestamptz not null default now()
                          );

                          -- 3. Chapter sections (grouped chapters within a book, e.g. "Chapters 1-5")
                          create table if not exists chapter_sections (
                            id uuid primary key default gen_random_uuid(),
                              book_id uuid not null references books(id) on delete cascade,
                                title text not null,
                                  sort_order int not null default 0,
                                    created_at timestamptz not null default now()
                                    );

                                    -- 4. Discussion questions (pre-generated per section)
                                    create table if not exists discussion_questions (
                                      id uuid primary key default gen_random_uuid(),
                                        section_id uuid not null references chapter_sections(id) on delete cascade,
                                          question text not null,
                                            sort_order int not null default 0,
                                              created_at timestamptz not null default now()
                                              );

                                              -- 5. Comments (threaded by section, attributed to a member)
                                              create table if not exists comments (
                                                id uuid primary key default gen_random_uuid(),
                                                  section_id uuid not null references chapter_sections(id) on delete cascade,
                                                    user_id uuid not null references profiles(id) on delete cascade,
                                                      body text not null,
                                                        created_at timestamptz not null default now()
                                                        );

                                                        -- 6. Want-to-read votes (flag interest in a proposed book)
                                                        create table if not exists want_to_read_votes (
                                                          book_id uuid not null references books(id) on delete cascade,
                                                            user_id uuid not null references profiles(id) on delete cascade,
                                                              created_at timestamptz not null default now(),
                                                                primary key (book_id, user_id)
                                                                );

                                                                alter table profiles enable row level security;
                                                                alter table books enable row level security;
                                                                alter table chapter_sections enable row level security;
                                                                alter table discussion_questions enable row level security;
                                                                alter table comments enable row level security;
                                                                alter table want_to_read_votes enable row level security;

                                                                create policy "profiles are viewable by everyone signed in"
                                                                  on profiles for select to authenticated using (true);
                                                                  create policy "users can insert their own profile"
                                                                    on profiles for insert to authenticated with check (auth.uid() = id);
                                                                    create policy "users can update their own profile"
                                                                      on profiles for update to authenticated using (auth.uid() = id);

                                                                      create policy "books are viewable by everyone signed in"
                                                                        on books for select to authenticated using (true);
                                                                        create policy "members can add books"
                                                                          on books for insert to authenticated with check (auth.uid() = added_by);
                                                                          create policy "members can update books"
                                                                            on books for update to authenticated using (true);

                                                                            create policy "sections are viewable by everyone signed in"
                                                                              on chapter_sections for select to authenticated using (true);
                                                                              create policy "members can add sections"
                                                                                on chapter_sections for insert to authenticated with check (true);

                                                                                create policy "questions are viewable by everyone signed in"
                                                                                  on discussion_questions for select to authenticated using (true);
                                                                                  create policy "members can add questions"
                                                                                    on discussion_questions for insert to authenticated with check (true);

                                                                                    create policy "comments are viewable by everyone signed in"
                                                                                      on comments for select to authenticated using (true);
                                                                                      create policy "members can add their own comments"
                                                                                        on comments for insert to authenticated with check (auth.uid() = user_id);
                                                                                        create policy "members can delete their own comments"
                                                                                          on comments for delete to authenticated using (auth.uid() = user_id);

                                                                                          create policy "votes are viewable by everyone signed in"
                                                                                            on want_to_read_votes for select to authenticated using (true);
                                                                                            create policy "members can cast their own vote"
                                                                                              on want_to_read_votes for insert to authenticated with check (auth.uid() = user_id);
                                                                                              create policy "members can remove their own vote"
                                                                                                on want_to_read_votes for delete to authenticated using (auth.uid() = user_id);

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
                                                                                                          
