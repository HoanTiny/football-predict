// Lớp ADAPTER nguồn dữ liệu thể thao.
//
// Mục tiêu: tách "nguồn dữ liệu" khỏi UI/route, để sau này có thể thay/bổ sung nhà cung cấp
// (vd dữ liệu có bản quyền khi thương mại hoá) mà KHÔNG sửa UI. Hiện chỉ có FotMob.
//
// Một provider là object hiện thực interface dưới đây (xem lib/sports/fotmobProvider.js):
//
//   getMatchesByDate(dateKey, leagueIds?) : Promise<Match[]>
//     - dateKey: "YYYYMMDD" (UTC). leagueIds: lọc theo giải (optional).
//   getLeagueTable(leagueId)   : Promise<{ leagueName, ccode, ongoing, groups }>
//   getLeagueFixtures(leagueId): Promise<{ leagueName, matches, firstUnplayedId }>
//   getMatchDetail(matchId)    : Promise<{ lineups, matchStats, form, h2h, events, liveMinute, liveScore, ... }>
//
// SHAPE chuẩn của Match (dùng chung cho list/For You):
//   { id, leagueId, leagueName, round, utcTime, finished, started, cancelled,
//     statusShort, liveTime, home:{id,name,score}, away:{id,name,score} }

import { fotmobProvider } from "./fotmobProvider";

// Provider mặc định hiện tại. Đổi ở đây khi có nguồn khác.
export const provider = fotmobProvider;
