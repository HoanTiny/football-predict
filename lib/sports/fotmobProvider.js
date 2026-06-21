// Provider FotMob — hiện thực interface trong lib/sports/provider.js bằng các hàm sẵn có.
// Chỉ là lớp bọc mỏng; mọi logic gọi/parse FotMob nằm ở lib/fotmob.js & lib/fotmobLeagues.js.
import {
  fotmobLeagueTable,
  fotmobLeagueFixtures,
  fotmobMatchesByDate,
} from "@/lib/fotmobLeagues";
import { fotmobMatchDetailById } from "@/lib/fotmob";

export const fotmobProvider = {
  id: "fotmob",
  getMatchesByDate: (dateKey, leagueIds) => fotmobMatchesByDate(dateKey, leagueIds),
  getLeagueTable: (leagueId) => fotmobLeagueTable(leagueId),
  getLeagueFixtures: (leagueId) => fotmobLeagueFixtures(leagueId),
  getMatchDetail: (matchId) => fotmobMatchDetailById(matchId),
};
