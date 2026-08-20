# The Book Club — Discussion Board

A private, invite-only discussion board for your book club: a current-read
page with per-chapter discussion questions and comment threads, an archive
of previous reads (with their discussion boards preserved), and a
"want to read" page where members flag books they're interested in.
Works on both mobile and desktop.

Built with Next.js (App Router) + Tailwind CSS, using Supabase for
accounts (login) and the database. New accounts require an invite code,
so only people you share it with can join.

## Connect this repo to Vercel

1. Go to https://vercel.com/new and import this GitHub repo.
2. Add these Environment Variables before/after deploying:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (server-only secret)
   - INVITE_CODE (server-only secret)
   - ANTHROPIC_API_KEY (optional, for auto-generated discussion questions)
3. Deploy. From then on, every push to main auto-deploys.

See supabase/schema.sql for the database schema.
