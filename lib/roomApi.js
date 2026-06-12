/* ---------------- CÁC THAO TÁC SUPABASE CHO CHẾ ĐỘ PHÒNG ---------------- */

import { supabase } from "./supabase";
import { START_CHIPS } from "./constants";

const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // bỏ ký tự dễ nhầm

export const genRoomCode = () =>
  "WC-" + Array.from({ length: 4 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join("");

const throwIf = (error) => {
  if (error) throw new Error(error.message);
};

/** Tạo phòng mới, trả về mã phòng. */
export async function createRoom() {
  const code = genRoomCode();
  const { error } = await supabase.from("rooms").insert({ code });
  throwIf(error);
  return code;
}

/** Vào phòng: trả về row player (tạo mới nếu tên chưa có trong phòng). */
export async function joinRoom(code, name, userId) {
  if (!userId) throw new Error("Yêu cầu đăng nhập tài khoản trước khi vào phòng.");

  const { data: room, error: roomErr } = await supabase.from("rooms").select("code").eq("code", code).maybeSingle();
  throwIf(roomErr);
  if (!room) throw new Error("Không tìm thấy phòng " + code);

  const { data: existing, error: findErr } = await supabase
    .from("players").select("*").eq("room_code", code).eq("user_id", userId).maybeSingle();
  throwIf(findErr);
  
  if (existing) {
    if (existing.name !== name) {
      const { data: updated, error: updErr } = await supabase
        .from("players").update({ name }).eq("id", existing.id).select().single();
      if (updErr) {
        if (updErr.code === "23505") {
          throw new Error("Tên hiển thị này đã được sử dụng trong phòng. Vui lòng chọn tên khác!");
        }
        throwIf(updErr);
      }
      return updated;
    }
    return existing;
  }

  const { data: created, error: insErr } = await supabase
    .from("players").insert({ room_code: code, name, user_id: userId, chips: START_CHIPS }).select().single();
  if (insErr) {
    if (insErr.code === "23505") {
      throw new Error("Tên hiển thị này đã được sử dụng trong phòng. Vui lòng chọn tên khác!");
    }
    throwIf(insErr);
  }
  return created;
}

/** Tải toàn bộ trạng thái phòng: người chơi + mọi kèo. */
export async function fetchRoomState(code) {
  const [{ data: players, error: e1 }, { data: predictions, error: e2 }] = await Promise.all([
    supabase.from("players").select("*").eq("room_code", code).order("created_at"),
    supabase.from("predictions").select("*").eq("room_code", code),
  ]);
  throwIf(e1);
  throwIf(e2);
  return { players: players || [], predictions: predictions || [] };
}

/** Đặt kèo một trận: ghi kèo + trừ chip. */
export async function insertPrediction(me, bet) {
  const { error: e1 } = await supabase.from("predictions").insert({
    player_id: me.id,
    room_code: me.room_code,
    match_id: bet.matchId,
    home_goals: bet.homeGoals,
    away_goals: bet.awayGoals,
    wager: bet.wager,
  });
  throwIf(e1);
  const { error: e2 } = await supabase.from("players").update({ chips: me.chips - bet.wager }).eq("id", me.id);
  throwIf(e2);
}

/** Ghi kết quả quyết toán kèo của tôi + cộng chip. */
export async function applySettlementToRoom(me, result) {
  for (const p of result.predictions) {
    if (!result.settledMatchIds.includes(p.matchId)) continue;
    const { error } = await supabase
      .from("predictions")
      .update({ status: p.status, payout: p.payout, final_score: p.finalScore })
      .eq("id", p.id);
    throwIf(error);
  }
  const patch = { chips: me.chips + result.chipsGain };
  if (result.championPicks) {
    patch.champion_picks = result.championPicks;
  }
  const { error } = await supabase.from("players").update(patch).eq("id", me.id);
  throwIf(error);
}

/** Thêm một cược vô địch cho vòng đấu (lưu vào champion_picks JSONB). */
export async function addChampionPick(me, stage, team, wager, multiplier) {
  const existing = me.champion_picks || [];
  const newPick = {
    id: Math.random().toString(36).substring(2, 11),
    stage,
    team,
    wager,
    multiplier,
    status: "pending",
    payout: 0,
    placedAt: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("players")
    .update({ chips: me.chips - wager, champion_picks: [...existing, newPick] })
    .eq("id", me.id);
  throwIf(error);
}

/** Reset hồ sơ của tôi trong phòng: xoá kèo, chip về 5.000. */
export async function resetMyData(me) {
  const { error: e1 } = await supabase.from("predictions").delete().eq("player_id", me.id);
  throwIf(e1);
  const { error: e2 } = await supabase
    .from("players")
    .update({ chips: START_CHIPS, champion_picks: [] })
    .eq("id", me.id);
  throwIf(e2);
}

/** Đăng ký realtime: gọi onChange mỗi khi players/predictions trong phòng thay đổi. */
export function subscribeRoom(code, onChange) {
  const channel = supabase
    .channel(`room-${code}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "predictions", filter: `room_code=eq.${code}` }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Lấy tất cả phòng chơi mà user đã tham gia. */
export async function fetchUserRooms(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("players")
    .select("room_code, id, name")
    .eq("user_id", userId);
  throwIf(error);
  return (data || []).map((p) => ({
    code: p.room_code,
    playerId: p.id,
    name: p.name,
  }));
}

/** Xoá người chơi khỏi phòng (rời phòng). */
export async function deletePlayerFromRoom(playerId) {
  if (!playerId) return;
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  throwIf(error);
}
