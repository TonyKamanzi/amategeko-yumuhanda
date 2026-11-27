# Visitor reviews & ratings — setup

Reviews are stored in Supabase and served through the Next.js route handler at
`app/api/reviews/route.ts`. The UI lives in `components/ReviewsSection.tsx` and
appears on the start and results screens.

## 1. Create the table

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`,
   and run it. That creates the `reviews` table, enables Row Level Security,
   and allows anonymous visitors to read and insert reviews only.

## 2. Add environment variables

From **Project Settings → API**, copy:

- **Project URL** → `SUPABASE_URL`
- **anon public** key → `SUPABASE_ANON_KEY` (do **not** use the `service_role` key)

Add them to `.env.local` for development:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
```

And add the same two variables in **Vercel → Project → Settings → Environment
Variables** for production. Restart `npm run dev` after changing `.env.local`.

If the variables are missing, development uses a small in-memory demo list so
you can exercise the UI. Production fails closed: `/api/reviews` returns `503`
instead of pretending reviews work.

## 3. How abuse is limited

- Server-side validation: name 1–40 chars, rating 1–5, comment 10–500 chars.
- A hidden honeypot field that bots fill but people never see.
- Up to 3 submissions per minute per IP address (per serverless instance).
- A same-origin check on POSTs.
- SQL `CHECK` constraints plus RLS as a second line of defence.
- All text is rendered as plain text, so submitted HTML cannot run.

Reviews are public and auto-published. Visitors should not put personal
information in their name or comment. If moderation becomes necessary, add a
`status` column with a pending/approved value and an admin-only approval view.

## 4. Useful knobs

- `LIST_LIMIT` in `lib/reviews.ts` controls how many reviews are displayed.
- `RATE_LIMIT` / `RATE_WINDOW_MS` in the same file control throttling.
- Analytics events: `reviews_viewed` and `review_submitted`.
