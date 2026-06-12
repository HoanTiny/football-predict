-- ============================================================
-- WORLD CUP 2026 — Schema cho chế độ chơi chung theo phòng (Có Auth)
-- Chạy file này trong Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Phòng chơi
create table if not exists rooms (
  code text primary key,
  created_at timestamptz not null default now()
);

-- Người chơi trong phòng (kèm cược vô địch)
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  chips int not null default 1000,
  champion_team text,
  champion_wager int,
  champion_status text,
  champion_payout int,
  created_at timestamptz not null default now(),
  unique (room_code, name),
  unique (room_code, user_id)
);

-- Kèo từng trận
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  room_code text not null,
  match_id bigint not null,
  home_goals int not null,
  away_goals int not null,
  wager int not null,
  status text not null default 'pending',
  payout int not null default 0,
  final_score text,
  created_at timestamptz not null default now(),
  unique (player_id, match_id)
);

create index if not exists idx_players_room on players (room_code);
create index if not exists idx_predictions_room on predictions (room_code);
create index if not exists idx_players_user on players (user_id);

-- Bật Row Level Security (RLS)
alter table rooms enable row level security;
alter table players enable row level security;
alter table predictions enable row level security;

-- Policies cho rooms
drop policy if exists "anon all rooms" on rooms;
drop policy if exists "auth all rooms" on rooms;
create policy "auth all rooms" on rooms for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Policies cho players
drop policy if exists "anon all players" on players;
drop policy if exists "auth read players" on players;
drop policy if exists "auth modify players" on players;
create policy "auth read players" on players for select using (auth.role() = 'authenticated');
create policy "auth modify players" on players for all using (auth.role() = 'authenticated' and user_id = auth.uid()) with check (auth.role() = 'authenticated' and user_id = auth.uid());

-- Policies cho predictions
drop policy if exists "anon all predictions" on predictions;
drop policy if exists "auth read predictions" on predictions;
drop policy if exists "auth modify predictions" on predictions;
create policy "auth read predictions" on predictions for select using (auth.role() = 'authenticated');
create policy "auth modify predictions" on predictions for all using (
  auth.role() = 'authenticated' and exists (
    select 1 from players where players.id = predictions.player_id and players.user_id = auth.uid()
  )
) with check (
  auth.role() = 'authenticated' and exists (
    select 1 from players where players.id = predictions.player_id and players.user_id = auth.uid()
  )
);

-- Bật realtime để kèo/BXH của bạn bè cập nhật ngay lập tức
-- LƯU Ý: Nếu bảng đã được thêm vào realtime từ trước, lệnh dưới có thể bỏ qua hoặc chạy bình thường.
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table predictions;
