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

alter table profiles enable row level security;
alter table reviews enable row level security;
alter table unlocks enable row level security;

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

-- Storage: the "public" toggle on a bucket only allows reads, not writes,
-- so authenticated uploads need an explicit policy too.
drop policy if exists "authenticated users can upload review photos" on storage.objects;
create policy "authenticated users can upload review photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'review-photos');
