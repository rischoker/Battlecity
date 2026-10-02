-- Battle City 3D · global leaderboard
-- Run this once in Supabase → SQL Editor (same free project as Chicken Horde is fine).
-- Then paste your Project URL and anon/publishable key into SUPABASE_URL / SUPABASE_ANON_KEY
-- at the top of the game's <script> (search for "CONFIG").

create table if not exists public.battlecity_scores (
  id         bigint generated always as identity primary key,
  squad      text        not null check (char_length(squad) between 1 and 60),
  players    int         not null default 1 check (players between 1 and 7),
  score      int         not null check (score >= 0 and score < 10000000),
  wave       int         not null default 1 check (wave between 1 and 999),
  kills      int         not null default 0 check (kills between 0 and 100000),
  time_s     int         not null default 0 check (time_s between 0 and 86400),
  created_at timestamptz not null default now()
);

create index if not exists battlecity_scores_score_idx on public.battlecity_scores (score desc);

alter table public.battlecity_scores enable row level security;

-- Anyone can read the board and add a score; nobody can edit or delete from the browser.
drop policy if exists "battlecity read"   on public.battlecity_scores;
drop policy if exists "battlecity insert" on public.battlecity_scores;
create policy "battlecity read"   on public.battlecity_scores for select using (true);
create policy "battlecity insert" on public.battlecity_scores for insert with check (true);
