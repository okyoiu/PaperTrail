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
create policy "users can update own profile" on profiles for update using (auth.uid() = id);

create policy "reviews are viewable by everyone" on reviews for select using (true);
create policy "users can insert their own reviews" on reviews for insert with check (auth.uid() = user_id);

create policy "unlocks are viewable by everyone" on unlocks for select using (true);
create policy "users can insert their own unlocks" on unlocks for insert with check (auth.uid() = user_id);
