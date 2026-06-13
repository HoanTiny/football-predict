-- ============================================================
-- WORLD CUP 2026 — Schema cho chế độ chơi chung theo phòng (Có Auth)
-- Chạy file này trong Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Phòng chơi
create table if not exists rooms (
  code text primary key,
  created_at timestamptz not null default now()
);

-- Người chơi trong phòng (kèm cược vô địch theo vòng)
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  chips int not null default 1000,
  champion_picks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (room_code, name),
  unique (room_code, user_id)
);

-- Migration: thêm cột champion_picks nếu DB đã tồn tại
alter table players add column if not exists champion_picks jsonb not null default '[]'::jsonb;

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
  created_at timestamptz not null default now()
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

-- ============================================================
-- PUSH NOTIFICATIONS (Web Push) — chỉ truy cập từ server (service role)
-- ============================================================

-- Đăng ký nhận push của từng trình duyệt/thiết bị.
-- user_id có thể null (khách chưa đăng nhập vẫn nhận được thông báo broadcast).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_user on push_subscriptions (user_id);

-- Ảnh chụp trạng thái trận để cron phát hiện sự kiện (bóng lăn / bàn thắng / kết thúc).
create table if not exists match_state (
  match_id bigint primary key,
  status text,
  home_score int,
  away_score int,
  kickoff_notified boolean not null default false,
  finished_notified boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Bật RLS và KHÔNG tạo policy cho client: hai bảng này chỉ thao tác phía server
-- bằng service role key (tự động bỏ qua RLS). Client không đọc/ghi trực tiếp.
alter table push_subscriptions enable row level security;
alter table match_state enable row level security;
