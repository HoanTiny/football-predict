# Nguồn danh sách trận (live)

`/api/matches` ưu tiên **API-Football** khi có `RAPIDAPI_KEY`, nếu không thì fallback
**football-data.org** (như cũ).

## Vì sao
football-data.org (free) cập nhật trạng thái trễ, không có nghỉ-giữa-hiệp / phút thi đấu.
API-Football cho status chuẩn (1H/**HT**/2H/ET/PEN/FT) + phút thi đấu + cập nhật ~15s.

## Env
| Biến | Mặc định | Ghi chú |
|---|---|---|
| `RAPIDAPI_KEY` | — | Có key ⇒ dùng API-Football. (Đã dùng cho tab Chi tiết trận.) |
| `APIFOOTBALL_WC_LEAGUE` | `1` | ID giải World Cup trên API-Football |
| `APIFOOTBALL_WC_SEASON` | `2026` | Mùa giải |

> Nếu league/season sai → trả rỗng → tự fallback football-data. Có thể chỉnh qua env mà không sửa code.

## Quota
Route **cache 30s** (mọi client dùng chung một lần gọi upstream) để tiết kiệm gói free
(100 req/ngày). Nếu lưu lượng cao, cân nhắc nâng gói API-Football.

## Lưu ý
- Tên đội được chuẩn hoá qua `normalizeTeamName` để khớp cờ/bảng đấu.
- Trận có thêm trường `minute` (phút thi đấu) — có thể dùng để hiện "TRỰC TIẾP 67'".
- CI chặn egress nên chỉ verify được trên Vercel.
