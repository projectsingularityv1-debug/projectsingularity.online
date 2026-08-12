-- ============================================================
--  SINGULARITY — Supabase Database Schema
--  วิธีใช้: ไปที่ Supabase Dashboard → SQL Editor → วางโค้ดนี้ → กด Run
-- ============================================================

-- 1. Profiles (ข้อมูลผู้ใช้ เชื่อมกับ auth.users)
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade not null primary key,
  username   text unique not null,
  avatar_url text,
  country    text default 'ยังตรวจไม่พบ',
  language   text default 'ไทย',
  created_at timestamptz default now()
);

-- RLS for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Repositories
create table if not exists public.repositories (
  id             uuid default gen_random_uuid() primary key,
  name           text not null,
  description    text,
  is_private     boolean default true,
  owner_id       uuid references public.profiles(id) on delete cascade not null,
  owner_username text not null,
  created_at     timestamptz default now(),
  unique(owner_id, name)
);

alter table public.repositories enable row level security;

create policy "Owner can do everything with their repos"
  on public.repositories for all using (auth.uid() = owner_id);

create policy "Anyone can view public repos"
  on public.repositories for select using (is_private = false);
-- 3. Issues
create table if not exists public.issues (
  id              uuid default gen_random_uuid() primary key,
  repo_id         uuid references public.repositories(id) on delete cascade not null,
  title           text not null,
  body            text,
  status          text default 'open' check (status in ('open', 'closed')),
  author_id       uuid references public.profiles(id) not null,
  author_username text not null,
  created_at      timestamptz default now()
);

alter table public.issues enable row level security;

create policy "Repo owner can manage all issues"
  on public.issues for all
  using (
    exists (
      select 1 from public.repositories
      where id = issues.repo_id and owner_id = auth.uid()
    )
  );

create policy "Author can insert and update their own issues"
  on public.issues for insert with check (auth.uid() = author_id);

create policy "Author can update their own issues"
  on public.issues for update using (auth.uid() = author_id);

create policy "Anyone can view issues on public repos"
  on public.issues for select
  using (
    exists (
      select 1 from public.repositories
      where id = issues.repo_id and (is_private = false or owner_id = auth.uid())
    )
  );


-- ============================================================
-- Storage: ไปที่ Storage → Create bucket "repos" และ "avatars"
-- ตั้ง "repos" เป็น Private, "avatars" เป็น Public
-- ============================================================


-- 4. Notifications
create table if not exists public.notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  title      text not null,
  message    text,
  type       text default 'info' check (type in ('info','success','warning','error')),
  link       text,
  read       boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

-- Users can only see/update their own notifications
create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can mark own notifications read"
  on public.notifications for update using (auth.uid() = user_id);

-- Admins / system (service_role) can insert notifications for anyone
create policy "Service role can insert notifications"
  on public.notifications for insert with check (true);

-- Enable Realtime for this table (run in Supabase Dashboard → Database → Replication)
-- alter publication supabase_realtime add table public.notifications;


-- ============================================================
-- 5. Admin flag on profiles
-- ============================================================
alter table public.profiles add column if not exists is_admin boolean default false;

-- To make a user admin, run in SQL Editor:
-- UPDATE public.profiles SET is_admin = true WHERE username = 'your_username';


-- ============================================================
-- 6. Games (Supported Maps / Games on scripts page)
-- ============================================================
create table if not exists public.games (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  description text,
  image_url   text,
  status      text default 'Supported' check (status in ('Supported','Coming Soon','Discontinued')),
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

alter table public.games enable row level security;

-- Anyone (including visitors) can read games
create policy "Anyone can view games"
  on public.games for select using (true);

-- Only admins can insert/update/delete games
create policy "Admins can manage games"
  on public.games for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );


-- ============================================================
-- 7. Script Keys (ระบบ Key สำหรับใช้งาน Loader.lua)
-- ============================================================
create table if not exists public.script_keys (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  key_value   text unique not null,
  is_active   boolean default true,
  expires_at  timestamptz default null, -- null = ไม่มีวันหมดอายุ
  created_at  timestamptz default now()
);

alter table public.script_keys enable row level security;

-- Users เห็นแค่ key ของตัวเอง
create policy "Users can view own keys"
  on public.script_keys for select using (auth.uid() = user_id);

-- Users สร้าง key ของตัวเองได้
create policy "Users can insert own keys"
  on public.script_keys for insert with check (auth.uid() = user_id);

-- Users อัปเดต key ของตัวเองได้ (เช่น ปิดใช้งาน)
create policy "Users can update own keys"
  on public.script_keys for update using (auth.uid() = user_id);

-- Users ลบ key ของตัวเองได้
create policy "Users can delete own keys"
  on public.script_keys for delete using (auth.uid() = user_id);

-- Service role (Cloudflare Worker) ตรวจสอบ key ได้ทุกตัว
-- (ไม่ต้องมี policy เพราะ service_role bypass RLS อยู่แล้ว)

-- Admin policy: admin ดูและจัดการ key ของทุกคนได้
create policy "Admins can manage all keys"
  on public.script_keys for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

