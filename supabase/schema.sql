-- Fresh install: run once in Supabase SQL Editor (SQL Editor → New query → Run).
-- For a project that already ran the original reviews schema, run
-- supabase/owner-updates.sql instead.
--
-- Visitors are identified by a random token kept in their browser. Only a
-- SHA-256 hash of that token is stored, and RLS lets a visitor read everything
-- but edit/delete only rows whose hash matches the token sent in the
-- `x-review-owner` request header.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.review_token_hash(token text)
returns text
language sql
stable
set search_path = extensions, public
as $$
  select encode(digest(coalesce(token, ''), 'sha256'), 'hex');
$$;

create or replace function public.review_request_token()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::json->>'x-review-owner', '');
$$;

create or replace function public.review_valid_token(token text)
returns boolean
language sql
immutable
as $$
  select coalesce(token, '') ~ '^[A-Za-z0-9_-]{16,128}$';
$$;

create or replace function public.review_is_owner(row_owner_token text)
returns boolean
language sql
stable
as $$
  select public.review_valid_token(public.review_request_token())
    and row_owner_token = public.review_token_hash(public.review_request_token());
$$;

grant execute on function public.review_token_hash(text) to anon;
grant execute on function public.review_request_token() to anon;
grant execute on function public.review_valid_token(text) to anon;
grant execute on function public.review_is_owner(text) to anon;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 500),
  owner_token text not null default public.review_token_hash(public.review_request_token()),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  comment text not null check (char_length(comment) between 10 and 500),
  owner_token text not null default public.review_token_hash(public.review_request_token()),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists review_replies_review_id_created_at_idx
  on public.review_replies (review_id, created_at);

alter table public.reviews enable row level security;
alter table public.review_replies enable row level security;

grant select, insert, update, delete on public.reviews to anon;
grant select, insert, update, delete on public.review_replies to anon;

-- Reviews ------------------------------------------------------------------
drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews"
  on public.reviews for select to anon
  using (true);

drop policy if exists "Anyone can submit a review" on public.reviews;
create policy "Anyone can submit a review"
  on public.reviews for insert to anon
  with check (
    public.review_is_owner(owner_token)
    and char_length(name) between 1 and 40
    and rating between 1 and 5
    and char_length(comment) between 10 and 500
  );

drop policy if exists "Owners can edit their review" on public.reviews;
create policy "Owners can edit their review"
  on public.reviews for update to anon
  using (public.review_is_owner(owner_token))
  with check (
    public.review_is_owner(owner_token)
    and char_length(name) between 1 and 40
    and rating between 1 and 5
    and char_length(comment) between 10 and 500
  );

drop policy if exists "Owners can delete their review" on public.reviews;
create policy "Owners can delete their review"
  on public.reviews for delete to anon
  using (public.review_is_owner(owner_token));

-- Replies ------------------------------------------------------------------
drop policy if exists "Anyone can read replies" on public.review_replies;
create policy "Anyone can read replies"
  on public.review_replies for select to anon
  using (true);

drop policy if exists "Anyone can reply" on public.review_replies;
create policy "Anyone can reply"
  on public.review_replies for insert to anon
  with check (
    public.review_is_owner(owner_token)
    and char_length(name) between 1 and 40
    and char_length(comment) between 10 and 500
  );

drop policy if exists "Owners can edit their reply" on public.review_replies;
create policy "Owners can edit their reply"
  on public.review_replies for update to anon
  using (public.review_is_owner(owner_token))
  with check (
    public.review_is_owner(owner_token)
    and char_length(name) between 1 and 40
    and char_length(comment) between 10 and 500
  );

drop policy if exists "Owners can delete their reply" on public.review_replies;
create policy "Owners can delete their reply"
  on public.review_replies for delete to anon
  using (public.review_is_owner(owner_token));
