# Visitor reviews & ratings — setup

Reviews are stored in Supabase and served through the Next.js route handler at
`app/api/reviews/route.ts`. The UI lives in `components/ReviewsSection.tsx` and
appears on the start and results screens.

Supabase is a hosted PostgreSQL database with an auto-generated REST API. The
route handler calls `https://<project>.supabase.co/rest/v1/reviews`; Row Level
Security decides what each API key is allowed to do.

## 1. Create or upgrade the tables

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**:
   - **Fresh project:** paste `supabase/schema.sql` and run it.
   - **Already ran the original reviews schema:** paste
     `supabase/owner-updates.sql` and run it instead.

Both scripts create the `reviews` and `review_replies` tables, enable Row Level
Security, and set up read/insert/update/delete policies. They are safe to re-run.

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
publishable key is safe because Row Level Security limits what it can do: anyone
may read, anyone may insert, and only the owner's token may edit or delete.
Legacy `anon` keys still work via the older `SUPABASE_ANON_KEY` name, but
Supabase is deprecating them in 2027.
Never commit either key — `.env*` is already ignored by Git. If a key leaks,
rotate it in **Settings → API Keys**.

If the variables are missing, development uses a small in-memory demo list so
you can exercise the UI. Production fails closed: `/api/reviews` returns `503`
instead of pretending reviews work.

## 3. Identity, editing, deleting, and replies

There is no login. On the first submit (or reply) the browser generates a random
token and stores it with the chosen name in `localStorage` under
`ikizami-review-identity`. The name is prefilled from then on, including in reply
forms. Only a SHA-256 hash of the token is stored in Supabase; the raw token is
never returned by `GET /api/reviews`.

- `PATCH` / `DELETE /api/reviews/:id` require the matching `x-review-owner`
  header, enforced again by RLS. Only the author sees the edit/delete buttons.
- Replies live in `review_replies` and are attached to a review. They do not
  affect the average rating. Anyone can reply; authors can edit/delete their own
  replies the same way.
- Every review and reply shows its creation date and time, plus an
  "yavuguruwe" (updated) marker after an edit.
- Clearing browser storage means losing the token, so old posts can no longer be
  edited or deleted. That is the trade-off for a login-free setup.

## 4. How abuse is limited

- Server-side validation: name 1–40 chars, rating 1–5, comment 10–500 chars.
- A hidden honeypot field that bots fill but people never see.
- Up to 3 submissions per minute per IP address (per serverless instance).
- A same-origin check on every write (POST, PATCH, DELETE).
- SQL `CHECK` constraints plus RLS as a second line of defence.
- All text is rendered as plain text, so submitted HTML cannot run.

Reviews are public and auto-published. Visitors should not put personal
information in their name or comment. If moderation becomes necessary, add a
`status` column with a pending/approved value and an admin-only approval view.

## 5. Useful knobs

- `LIST_LIMIT` / `REPLY_LIMIT` in `lib/reviews.ts` control how much is displayed.
- `RATE_LIMIT` / `RATE_WINDOW_MS` in the same file control throttling.
- Analytics events: `reviews_viewed`, `review_submitted`, `review_edited`,
  `review_deleted`, `reply_submitted`, `reply_edited`, `reply_deleted`.
