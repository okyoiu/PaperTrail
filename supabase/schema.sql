-- Run this in the Supabase SQL editor for your project.
-- Safe to re-run: tables use IF NOT EXISTS, policies are dropped before recreation.

create table if not exists profiles (
  id uuid references auth.users primary key,
  username text unique,
  persona_id text, -- placeholder: wire up persona-identity track here once specced
  xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists unlocks (
  user_id uuid references profiles(id) not null,
  location_id uuid references locations(id) not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, location_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  location_id uuid references locations(id) not null,
  rating integer check (rating between 1 and 5),
  body text,
  photo_url text,
  xp_awarded integer not null default 25,
  created_at timestamptz not null default now()
);

-- Re-running this file against a database created before the rating column
-- existed still adds it, without touching any other data.
alter table reviews add column if not exists rating integer check (rating between 1 and 5);

-- Atomic XP increment so concurrent review submissions can't race each other.
create or replace function increment_xp(p_user_id uuid, p_amount integer)
returns void as $$
begin
  update profiles
  set xp = xp + p_amount,
      level = floor((xp + p_amount) / 100) + 1
  where id = p_user_id;
end;
$$ language plpgsql;

-- Row Level Security: readable by everyone, writable only by the owning user.
alter table profiles enable row level security;
alter table locations enable row level security;
alter table reviews enable row level security;
alter table unlocks enable row level security;

-- locations has no "owner" - it's a shared row any signed-in user can create
-- (upsertLocation, on first visit/review/photo of a place) or update (e.g.
-- attaching a photo_url later), so policies are keyed on auth state, not
-- auth.uid() matching a column. Missing this was a real bug: without it,
-- every insert/update on locations was silently rejected by RLS.
drop policy if exists "locations are viewable by everyone" on locations;
create policy "locations are viewable by everyone" on locations for select using (true);

drop policy if exists "authenticated users can create locations" on locations;
create policy "authenticated users can create locations" on locations
  for insert to authenticated with check (true);

drop policy if exists "authenticated users can update locations" on locations;
create policy "authenticated users can update locations" on locations
  for update to authenticated using (true);

drop policy if exists "profiles are viewable by everyone" on profiles;
create policy "profiles are viewable by everyone" on profiles for select using (true);

drop policy if exists "users can insert own profile" on profiles;
create policy "users can insert own profile" on profiles for insert with check (auth.uid() = id);

drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile" on profiles for update using (auth.uid() = id);

drop policy if exists "reviews are viewable by everyone" on reviews;
create policy "reviews are viewable by everyone" on reviews for select using (true);

drop policy if exists "users can insert their own reviews" on reviews;
create policy "users can insert their own reviews" on reviews for insert with check (auth.uid() = user_id);

drop policy if exists "unlocks are viewable by everyone" on unlocks;
create policy "unlocks are viewable by everyone" on unlocks for select using (true);

drop policy if exists "users can insert their own unlocks" on unlocks;
create policy "users can insert their own unlocks" on unlocks for insert with check (auth.uid() = user_id);

-- Storage: run this after creating the "review-photos" bucket in the dashboard.
-- A "public" bucket only makes files publicly readable by URL; writes still
-- need an explicit policy on storage.objects, which is what this adds.
drop policy if exists "review photos are viewable by everyone" on storage.objects;
create policy "review photos are viewable by everyone" on storage.objects
  for select using (bucket_id = 'review-photos');

drop policy if exists "authenticated users can upload review photos" on storage.objects;
create policy "authenticated users can upload review photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'review-photos');

-- --- Friends + live location sharing (Life360-style) ---------------------

create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles(id) not null,
  addressee_id uuid references profiles(id) not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- One row per user: their most recent known position. Overwritten on every
-- update rather than logged, since only "where are they right now" matters.
create table if not exists live_locations (
  user_id uuid references profiles(id) primary key,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

alter table friend_requests enable row level security;
alter table live_locations enable row level security;

drop policy if exists "users see requests they sent or received" on friend_requests;
create policy "users see requests they sent or received" on friend_requests
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "users can send a friend request" on friend_requests;
create policy "users can send a friend request" on friend_requests
  for insert with check (auth.uid() = requester_id);

drop policy if exists "addressee can accept or decline, requester can cancel" on friend_requests;
create policy "addressee can accept or decline, requester can cancel" on friend_requests
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "requester or addressee can delete a request" on friend_requests;
create policy "requester or addressee can delete a request" on friend_requests
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- The core of the "only friends can see your dot" rule: a user can select
-- their own row, or a row belonging to someone they have an accepted
-- friend_requests row with (in either direction).
drop policy if exists "see own location or an accepted friend's location" on live_locations;
create policy "see own location or an accepted friend's location" on live_locations
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.requester_id = auth.uid() and fr.addressee_id = live_locations.user_id)
          or (fr.addressee_id = auth.uid() and fr.requester_id = live_locations.user_id)
        )
    )
  );

drop policy if exists "users can upsert their own location" on live_locations;
create policy "users can upsert their own location" on live_locations
  for insert with check (user_id = auth.uid());

drop policy if exists "users can update their own location" on live_locations;
create policy "users can update their own location" on live_locations
  for update using (user_id = auth.uid());

-- Lets the frontend subscribe to live_locations changes over Realtime instead
-- of polling; RLS above still applies to what each connected client receives.
-- Guarded because adding an already-published table is an error, which
-- would abort a re-run of this whole file.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_locations'
  ) then
    alter publication supabase_realtime add table live_locations;
  end if;
end $$;
