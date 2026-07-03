// Đội bóng yêu thích ("Đội của tôi") — đồng bộ theo TÀI KHOẢN qua Supabase (bảng
// favorite_teams), CHUNG đăng nhập với game Dự đoán (lib/supabase.js) để xem được trên nhiều
// thiết bị. Mỗi đội: { id, name, leagueId } — leagueId để biết tra lịch thi đấu của đội ở đâu
// (dữ liệu tổ chức theo giải, xem lib/fotmobLeagues.js).

import { supabase } from "./supabase";

const throwIf = (error) => {
  if (error) throw new Error(error.message);
};

export async function fetchFavTeams(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("favorite_teams")
    .select("team_id, team_name, league_id")
    .eq("user_id", userId)
    .order("created_at");
  throwIf(error);
  return (data || []).map((r) => ({ id: r.team_id, name: r.team_name, leagueId: r.league_id }));
}

export async function addFavTeam(userId, team) {
  const { error } = await supabase.from("favorite_teams").upsert(
    {
      user_id: userId,
      team_id: String(team.id),
      team_name: team.name,
      league_id: team.leagueId,
    },
    { onConflict: "user_id,team_id" }
  );
  throwIf(error);
}

export async function removeFavTeam(userId, teamId) {
  const { error } = await supabase
    .from("favorite_teams")
    .delete()
    .eq("user_id", userId)
    .eq("team_id", String(teamId));
  throwIf(error);
}
