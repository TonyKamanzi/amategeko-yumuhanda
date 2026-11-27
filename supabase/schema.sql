-- Run once in the Supabase SQL editor (Project → SQL Editor → New query).
-- The app only needs SELECT and INSERT for anonymous visitors; there is no
-- update/delete policy, so reviews cannot be edited or removed through the API.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 500),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews"
  on public.reviews for select to anon
  using (true);

drop policy if exists "Anyone can submit a review" on public.reviews;
create policy "Anyone can submit a review"
  on public.reviews for insert to anon
  with check (
    char_length(name) between 1 and 40
    and rating between 1 and 5
    and char_length(comment) between 10 and 500
  );
