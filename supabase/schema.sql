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
-- CỘNG/TRỪ CHIP NGUYÊN TỬ
-- Tránh lost-update: trước đây client ghi `chips = snapshot ± x`, nên khi đặt
-- kèo mới ngay sau lúc quyết toán có thể GHI ĐÈ làm mất tiền thắng.
-- Hàm này +delta trực tiếp trong DB. SECURITY INVOKER (mặc định) ⇒ RLS vẫn áp
-- dụng nên người chơi chỉ chỉnh được chip của chính mình.
-- CHẠY LẠI FILE NÀY TRONG SUPABASE SQL EDITOR ĐỂ TẠO HÀM.
-- ============================================================
create or replace function adjust_chips(p_id uuid, p_delta int)
returns int
language sql
as $$
  update players set chips = chips + p_delta where id = p_id returning chips;
$$;

-- ============================================================
-- QUYẾT TOÁN & CHIP PHÍA SERVER (chống gian lận)
-- Sau khi chạy phần này, CLIENT KHÔNG còn ghi trực tiếp chip/kết quả.
-- Mọi thay đổi chip đi qua hàm SECURITY DEFINER bên dưới; quyết toán do
-- cron (service role) thực hiện bằng TỈ SỐ THẬT.
-- ⚠️ PHẢI CHẠY SQL NÀY TRƯỚC KHI DEPLOY CODE MỚI (nếu không, đặt cược sẽ lỗi).
-- ============================================================

-- Chip khởi điểm khớp app (START_CHIPS = 5000) cho người chơi mới
alter table players alter column chips set default 5000;

-- Không cho client gọi hàm cộng/trừ chip tuỳ ý nữa
revoke execute on function adjust_chips(uuid, int) from public, anon, authenticated;

-- 1) Đặt kèo nguyên tử (xác định người chơi qua auth.uid())
create or replace function place_bet(
  p_room text, p_match bigint, p_home int, p_away int, p_wager int
) returns int
language plpgsql security definer set search_path = public as $$
declare v_player uuid; v_chips int;
begin
  if p_wager < 10 then raise exception 'WAGER_TOO_SMALL'; end if;
  if p_home < 0 or p_away < 0 then raise exception 'BAD_SCORE'; end if;
  select id into v_player from players where room_code = p_room and user_id = auth.uid();
  if v_player is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  update players set chips = chips - p_wager
    where id = v_player and chips >= p_wager returning chips into v_chips;
  if v_chips is null then raise exception 'INSUFFICIENT_CHIPS'; end if;
  insert into predictions (player_id, room_code, match_id, home_goals, away_goals, wager)
    values (v_player, p_room, p_match, p_home, p_away, p_wager);
  return v_chips;
end; $$;

-- 2) Cược vô địch nguyên tử
create or replace function place_champion_bet(
  p_room text, p_stage text, p_team text, p_wager int, p_mult numeric
) returns int
language plpgsql security definer set search_path = public as $$
declare v_player uuid; v_chips int; v_pick jsonb;
begin
  if p_wager < 10 then raise exception 'WAGER_TOO_SMALL'; end if;
  select id into v_player from players where room_code = p_room and user_id = auth.uid();
  if v_player is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  update players set chips = chips - p_wager
    where id = v_player and chips >= p_wager returning chips into v_chips;
  if v_chips is null then raise exception 'INSUFFICIENT_CHIPS'; end if;
  v_pick := jsonb_build_object(
    'id', substr(md5(random()::text), 1, 9),
    'stage', p_stage, 'team', p_team, 'wager', p_wager, 'multiplier', p_mult,
    'status', 'pending', 'payout', 0,
    'placedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
  update players set champion_picks = coalesce(champion_picks, '[]'::jsonb) || v_pick
    where id = v_player;
  return v_chips;
end; $$;

-- 3) Reset hồ sơ của tôi (xoá kèo + chip về mặc định)
create or replace function reset_my_data(p_room text)
returns void language plpgsql security definer set search_path = public as $$
declare v_player uuid;
begin
  select id into v_player from players where room_code = p_room and user_id = auth.uid();
  if v_player is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  delete from predictions where player_id = v_player;
  update players set chips = 5000, champion_picks = '[]'::jsonb where id = v_player;
end; $$;

grant execute on function place_bet(text, bigint, int, int, int) to authenticated;
grant execute on function place_champion_bet(text, text, text, int, numeric) to authenticated;
grant execute on function reset_my_data(text) to authenticated;

-- 4) KHOÁ ghi trực tiếp từ client (chỉ qua hàm DEFINER ở trên + cron service role)
--    Postgres RLS không giới hạn cột → dùng column GRANT.
revoke insert, update on players from authenticated;
grant insert (room_code, user_id, name) on players to authenticated; -- chip dùng default
grant update (name) on players to authenticated;                     -- chỉ đổi tên
revoke insert, update on predictions from authenticated;             -- chỉ tạo/sửa qua hàm
-- (select & delete predictions vẫn theo policy cũ; cron service role bỏ qua mọi grant)

-- Cron (service role) vẫn cần cộng chip nguyên tử khi quyết toán
grant execute on function adjust_chips(uuid, int) to service_role;

-- ============================================================
-- PUSH NOTIFICATIONS (Web Push) — chỉ truy cập từ server (service role)
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_user on push_subscriptions (user_id);

create table if not exists match_state (
  match_id bigint primary key,
  status text,
  home_score int,
  away_score int,
  kickoff_notified boolean not null default false,
  finished_notified boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Chỉ thao tác phía server (service role bỏ qua RLS); không tạo policy cho client.
alter table push_subscriptions enable row level security;
alter table match_state enable row level security;

-- ============================================================
-- CHAT THEO PHÒNG
-- Tin nhắn realtime trong từng phòng. Người đã đăng nhập đọc được mọi tin,
-- chỉ gửi được dưới danh nghĩa chính mình (user_id = auth.uid()).
-- ============================================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_room on messages (room_code, created_at);

alter table messages enable row level security;

drop policy if exists "auth read messages" on messages;
drop policy if exists "auth insert messages" on messages;
create policy "auth read messages" on messages
  for select using (auth.role() = 'authenticated');
create policy "auth insert messages" on messages
  for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

-- Realtime để tin nhắn hiện ngay cho cả phòng
alter publication supabase_realtime add table messages;
