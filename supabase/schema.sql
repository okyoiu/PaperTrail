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

-- The map character each player picked (see src/features/map/characters.js);
-- null means the default one.
alter table profiles add column if not exists character_id text;

-- Who can see this player's character on the map (see the Profile tab and the
-- live_locations select policy below): every signed-in explorer, or only
-- accepted friends. Defaults to everyone so new players show up right away.
alter table profiles add column if not exists location_visibility text not null default 'everyone';
alter table profiles drop constraint if exists profiles_location_visibility_check;
alter table profiles add constraint profiles_location_visibility_check
  check (location_visibility in ('everyone', 'friends'));

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

-- Deleting a review from its visit receipt (see deleteReview in
-- src/features/backend/api.js).
drop policy if exists "users can delete their own reviews" on reviews;
create policy "users can delete their own reviews" on reviews for delete using (auth.uid() = user_id);

drop policy if exists "unlocks are viewable by everyone" on unlocks;
create policy "unlocks are viewable by everyone" on unlocks for select using (true);

drop policy if exists "users can insert their own unlocks" on unlocks;
create policy "users can insert their own unlocks" on unlocks for insert with check (auth.uid() = user_id);

drop policy if exists "users can update their own unlocks" on unlocks;
create policy "users can update their own unlocks" on unlocks for update using (auth.uid() = user_id);

-- --- Explored buildings ----------------------------------------------------
-- unlocks is the per-player state of each place: unlocked_at is when their
-- character first walked up to it (fog lifts, 3D pops up), explored_at is
-- when they first left a review there (the building gets the "explored"
-- color on the map, see features/map/buildingsLayer.js). explored_at is
-- written by the trigger below whenever a review is inserted, so it can
-- never drift from the reviews table and needs no extra client call.
alter table unlocks add column if not exists explored_at timestamptz;

create or replace function mark_location_explored()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into unlocks (user_id, location_id, unlocked_at, explored_at)
  values (new.user_id, new.location_id, new.created_at, new.created_at)
  on conflict (user_id, location_id) do update
    set explored_at = coalesce(unlocks.explored_at, excluded.explored_at);
  return new;
end;
$$;

drop trigger if exists reviews_mark_explored on reviews;
create trigger reviews_mark_explored
  after insert on reviews
  for each row execute function mark_location_explored();

-- And when a review is deleted: explored_at moves to the player's earliest
-- review still left at that place, or back to null when there are none, so the
-- building returns to the "walked past" color.
create or replace function unmark_location_explored()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update unlocks
  set explored_at = (
    select min(created_at) from reviews
    where user_id = old.user_id and location_id = old.location_id
  )
  where user_id = old.user_id and location_id = old.location_id;
  return old;
end;
$$;

drop trigger if exists reviews_unmark_explored on reviews;
create trigger reviews_unmark_explored
  after delete on reviews
  for each row execute function unmark_location_explored();

-- Backfill for reviews left before explored_at existed (no-op afterwards).
insert into unlocks (user_id, location_id, unlocked_at, explored_at)
select user_id, location_id, min(created_at), min(created_at)
from reviews
group by user_id, location_id
on conflict (user_id, location_id) do update
  set explored_at = coalesce(unlocks.explored_at, excluded.explored_at);

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

-- A deleted review takes its photo with it. Photos are uploaded under
-- <user id>/ (see uploadReviewPhoto), so players can only remove their own.
drop policy if exists "users can delete their own review photos" on storage.objects;
create policy "users can delete their own review photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

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

-- Who sees whose character on the map. A signed-in user can select their own
-- row, any row whose owner set location_visibility = 'everyone' (the default),
-- or a friends-only row when they have an accepted friend_requests row with
-- that person (in either direction). Nothing is visible to anonymous visitors.
drop policy if exists "see own location or an accepted friend's location" on live_locations;
drop policy if exists "see own, public, or an accepted friend's location" on live_locations;
create policy "see own, public, or an accepted friend's location" on live_locations
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = live_locations.user_id and p.location_visibility = 'everyone'
    )
    or exists (
      select 1 from friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.requester_id = auth.uid() and fr.addressee_id = live_locations.user_id)
          or (fr.addressee_id = auth.uid() and fr.requester_id = live_locations.user_id)
        )
    )
  );

-- The players map only asks for rows updated recently (see
-- hooks/usePlayersMap.js), so stale rows are cheap to skip.
create index if not exists live_locations_updated_at_idx on live_locations (updated_at desc);

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

-- The API supabase-js talks to (PostgREST) caches each table's columns. Without
-- this, a column added above (e.g. profiles.character_id) can keep failing with
-- "Could not find the '...' column of '...' in the schema cache".
notify pgrst, 'reload schema';
