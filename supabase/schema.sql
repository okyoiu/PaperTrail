-- Run this in the Supabase SQL editor for your project.

create table profiles (
  id uuid references auth.users primary key,
  username text unique,
  persona_id text, -- placeholder: wire up persona-identity track here once specced
  xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create table unlocks (
  user_id uuid references profiles(id) not null,
  location_id uuid references locations(id) not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, location_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  location_id uuid references locations(id) not null,
  body text,
  photo_url text,
  xp_awarded integer not null default 25,
  created_at timestamptz not null default now()
);

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
alter table reviews enable row level security;
alter table unlocks enable row level security;

create policy "profiles are viewable by everyone" on profiles for select using (true);
create policy "users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "users can update own profile" on profiles for update using (auth.uid() = id);

create policy "reviews are viewable by everyone" on reviews for select using (true);
create policy "users can insert their own reviews" on reviews for insert with check (auth.uid() = user_id);

create policy "unlocks are viewable by everyone" on unlocks for select using (true);
create policy "users can insert their own unlocks" on unlocks for insert with check (auth.uid() = user_id);

-- Storage: run this after creating the "review-photos" bucket in the dashboard.
-- A "public" bucket only makes files publicly readable by URL; writes still
-- need an explicit policy on storage.objects, which is what this adds.
create policy "review photos are viewable by everyone" on storage.objects
  for select using (bucket_id = 'review-photos');
create policy "authenticated users can upload review photos" on storage.objects
  for insert with check (bucket_id = 'review-photos' and auth.role() = 'authenticated');

-- --- Friends + live location sharing (Life360-style) ---------------------

create table friend_requests (
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
create table live_locations (
  user_id uuid references profiles(id) primary key,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

alter table friend_requests enable row level security;
alter table live_locations enable row level security;

create policy "users see requests they sent or received" on friend_requests
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "users can send a friend request" on friend_requests
  for insert with check (auth.uid() = requester_id);
create policy "addressee can accept or decline, requester can cancel" on friend_requests
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "requester or addressee can delete a request" on friend_requests
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- The core of the "only friends can see your dot" rule: a user can select
-- their own row, or a row belonging to someone they have an accepted
-- friend_requests row with (in either direction).
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
create policy "users can upsert their own location" on live_locations
  for insert with check (user_id = auth.uid());
create policy "users can update their own location" on live_locations
  for update using (user_id = auth.uid());

-- Lets the frontend subscribe to live_locations changes over Realtime instead
-- of polling; RLS above still applies to what each connected client receives.
alter publication supabase_realtime add table live_locations;
