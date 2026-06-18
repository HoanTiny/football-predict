/* ---------------- CÁC THAO TÁC SUPABASE CHO CHẾ ĐỘ PHÒNG ---------------- */

import { supabase } from "./supabase";

const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // bỏ ký tự dễ nhầm

export const genRoomCode = () =>
  "WC-" + Array.from({ length: 4 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join("");

const throwIf = (error) => {
  if (error) throw new Error(error.message);
};

/** Tạo phòng mới (kèm tên hiển thị tuỳ chọn), trả về mã phòng. */
export async function createRoom(name) {
  const code = genRoomCode();
  const { error } = await supabase.from("rooms").insert({ code, name: name?.trim() || null });
  throwIf(error);
  return code;
}

/** Đổi tên phòng (mọi thành viên đều thấy). */
export async function updateRoomName(code, name) {
  const { error } = await supabase
    .from("rooms")
    .update({ name: name?.trim() || null })
    .eq("code", code);
  throwIf(error);
}

/** Vào phòng: trả về row player (tạo mới nếu tên chưa có trong phòng). */
export async function joinRoom(code, name, userId) {
  if (!userId) throw new Error("Yêu cầu đăng nhập tài khoản trước khi vào phòng.");

  const { data: room, error: roomErr } = await supabase.from("rooms").select("code, name").eq("code", code).maybeSingle();
  throwIf(roomErr);
  if (!room) throw new Error("Không tìm thấy phòng " + code);

  const { data: existing, error: findErr } = await supabase
    .from("players").select("*").eq("room_code", code).eq("user_id", userId).maybeSingle();
  throwIf(findErr);

  if (existing) {
    // Vào lại phòng: xoá dấu "đã rời" + cập nhật tên (nếu đổi).
    const patch = {};
    if (existing.left_at) patch.left_at = null;
    if (existing.name !== name) patch.name = name;
    if (Object.keys(patch).length > 0) {
      const { data: updated, error: updErr } = await supabase
        .from("players").update(patch).eq("id", existing.id).select().single();
      if (updErr) {
        if (updErr.code === "23505") {
          throw new Error("Tên hiển thị này đã được sử dụng trong phòng. Vui lòng chọn tên khác!");
        }
        throwIf(updErr);
      }
      return { ...updated, room_name: room.name };
    }
    return { ...existing, room_name: room.name };
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
  return { ...created, room_name: room.name };
}

/** Tải toàn bộ trạng thái phòng: người chơi (chưa rời) + mọi kèo. */
export async function fetchRoomState(code) {
  const [{ data: players, error: e1 }, { data: predictions, error: e2 }] = await Promise.all([
    supabase.from("players").select("*").eq("room_code", code).is("left_at", null).order("created_at"),
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

/** Tải N tin MỚI NHẤT của phòng (trả về theo thứ tự cũ → mới để render). */
export async function fetchMessages(code, limit = 30) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_code", code)
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIf(error);
  return (data || []).reverse();
}

/** Tải thêm tin CŨ HƠN một mốc thời gian (để "xem lại tin cũ"). */
export async function fetchOlderMessages(code, before, limit = 30) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_code", code)
    .lt("created_at", before)
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIf(error);
  return (data || []).reverse();
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

/** Lấy các phòng user đang tham gia (đã loại phòng đã rời — left_at null). */
export async function fetchUserRooms(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("players")
    .select("room_code, id, name, rooms(name)")
    .eq("user_id", userId)
    .is("left_at", null);
  throwIf(error);
  return (data || []).map((p) => ({
    code: p.room_code,
    playerId: p.id,
    name: p.name,
    roomName: p.rooms?.name || null,
  }));
}

/** Rời phòng (soft-leave): đánh dấu left_at, GIỮ NGUYÊN chip + lịch sử trên server. */
export async function leaveRoomDb(playerId) {
  if (!playerId) return;
  const { error } = await supabase
    .from("players")
    .update({ left_at: new Date().toISOString() })
    .eq("id", playerId);
  throwIf(error);
}
