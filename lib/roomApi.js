/* ---------------- CÁC THAO TÁC SUPABASE CHO CHẾ ĐỘ PHÒNG ---------------- */

import { supabase } from "./supabase";

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

  // Không set chips ở client (chip dùng default phía DB = 5000) để tránh gian lận.
  const { data: created, error: insErr } = await supabase
    .from("players").insert({ room_code: code, name, user_id: userId }).select().single();
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

/** Đặt kèo một trận — NGUYÊN TỬ ở server (kiểm tra đủ chip → trừ → tạo kèo). */
export async function insertPrediction(me, bet) {
  const { error } = await supabase.rpc("place_bet", {
    p_room: me.room_code,
    p_match: bet.matchId,
    p_home: bet.homeGoals,
    p_away: bet.awayGoals,
    p_wager: bet.wager,
  });
  if (error) {
    if (/INSUFFICIENT_CHIPS/.test(error.message)) throw new Error("Không đủ chip");
    throwIf(error);
  }
}

/** Cược vô địch — NGUYÊN TỬ ở server. */
export async function addChampionPick(me, stage, team, wager, multiplier) {
  const { error } = await supabase.rpc("place_champion_bet", {
    p_room: me.room_code,
    p_stage: stage,
    p_team: team,
    p_wager: wager,
    p_mult: multiplier,
  });
  if (error) {
    if (/INSUFFICIENT_CHIPS/.test(error.message)) throw new Error("Không đủ chip");
    throwIf(error);
  }
}

/** Reset hồ sơ của tôi trong phòng (server). */
export async function resetMyData(me) {
  const { error } = await supabase.rpc("reset_my_data", { p_room: me.room_code });
  throwIf(error);
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

/* ---------------- CHAT THEO PHÒNG ---------------- */

/** Tải lịch sử tin nhắn của phòng (cũ → mới). */
export async function fetchMessages(code, limit = 100) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_code", code)
    .order("created_at", { ascending: true })
    .limit(limit);
  throwIf(error);
  return data || [];
}

/** Gửi một tin nhắn vào phòng. */
export async function sendMessage(code, userId, name, text) {
  const { error } = await supabase.from("messages").insert({
    room_code: code,
    user_id: userId,
    name,
    text,
  });
  throwIf(error);
}

/** Realtime: gọi onInsert với row mới mỗi khi có tin nhắn mới trong phòng. */
export function subscribeMessages(code, onInsert) {
  const channel = supabase
    .channel(`chat-${code}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `room_code=eq.${code}` },
      (payload) => onInsert(payload.new)
    )
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
