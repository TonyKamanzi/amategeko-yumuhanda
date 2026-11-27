# Visitor reviews & ratings — setup

Reviews are stored in Supabase and served through the Next.js route handler at
`app/api/reviews/route.ts`. The UI lives in `components/ReviewsSection.tsx` and
appears on the start and results screens.

Supabase is a hosted PostgreSQL database with an auto-generated REST API. The
route handler calls `https://<project>.supabase.co/rest/v1/reviews`; Row Level
Security decides what each API key is allowed to do.

## 1. Create the table

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`,
   and run it. That creates the `reviews` table, enables Row Level Security,
   and allows anonymous visitors to read and insert reviews only.

## 2. Add environment variables

Open your project's **Connect** dialog (top-right of the Supabase dashboard),
or go to **Settings → API Keys**. Copy:

- **Project URL** (looks like `https://xxxx.supabase.co`) → `SUPABASE_URL`
- **Publishable key** (`sb_publishable_...`) → `SUPABASE_PUBLISHABLE_KEY`

Add them to `.env.local` (or `.env`) for development. Both the names below and
the ones Supabase's Connect dialog prints are accepted:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx

# Equally valid, straight from the Connect dialog:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

And add the same two variables in **Vercel → Project → Settings → Environment
Variables** for production. Restart `npm run dev` after changing the env file —
Next.js only reads it when the process starts.

Use the **publishable** key, not the **secret** (`sb_secret_...`) key. The
publishable key is safe because the table's Row Level Security policies only
allow reading and inserting reviews. Legacy `anon` keys still work via the
older `SUPABASE_ANON_KEY` name, but Supabase is deprecating them in 2027.
Never commit either key — `.env*` is already ignored by Git. If a key leaks,
rotate it in **Settings → API Keys**.

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
