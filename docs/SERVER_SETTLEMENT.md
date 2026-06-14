# Quyết toán & chip phía server (chống gian lận)

Trước đây client tự tính & ghi `chips`/`payout`, mà RLS cho phép user sửa chip của
chính mình → **tự đặt chip tuỳ ý**. Bản này khoá lại:

- Client **không** ghi trực tiếp `chips`/`status`/`payout` nữa (column GRANT thu hồi).
- Đặt kèo / cược vô địch / reset đi qua **hàm SECURITY DEFINER** (`place_bet`,
  `place_champion_bet`, `reset_my_data`) — kiểm tra & trừ chip nguyên tử ở server.
- **Quyết toán** do **cron** (`/api/cron/settle`, service role) thực hiện bằng
  **tỉ số THẬT** lấy từ nguồn trận → không thể khai gian tỉ số.

## ⚠️ THỨ TỰ TRIỂN KHAI (BẮT BUỘC)
> Nếu deploy code mới TRƯỚC khi chạy SQL → **đặt cược sẽ lỗi** (chưa có hàm `place_bet`).

1. **Chạy `supabase/schema.sql`** trong Supabase SQL Editor (tạo hàm + đặt quyền). An toàn chạy lại.
2. Set env trên Vercel (xem dưới).
3. **Rồi mới** merge PR / deploy code.

## Env (Vercel)
| Env | Mô tả |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Supabase → Settings → API). Chỉ server, để cron quyết toán. |
| `FOOTBALL_DATA_TOKEN` | Token lấy tỉ số thật (nếu chưa có api-sports). |
| `RAPIDAPI_KEY` | (tuỳ) nếu dùng api-sports làm nguồn trận. |
| `CRON_SECRET` | Chuỗi ngẫu nhiên — Vercel gửi `Authorization: Bearer <CRON_SECRET>` khi chạy cron. |

## Cron
`vercel.json` chạy `/api/cron/settle` mỗi phút.
> 🔴 Cron mỗi phút cần **Vercel Pro**. Gói Hobby chỉ cron 1 lần/ngày → dùng dịch vụ
> ngoài (cron-job.org) gọi `GET /api/cron/settle` kèm header `Authorization: Bearer <CRON_SECRET>`.

Cron sẽ: lấy trận đã FINISHED → quyết toán mọi kèo `pending` (đúng tỉ số ×3 / đúng kết
quả ×1 / thua) + cược vô địch khi Chung kết xong. Idempotent (chỉ xử lý `pending`).

## Sau khi bật
- BXH phòng đáng tin: không ai tự sửa chip được.
- Toast thắng/thua hiện ở client khi cron quyết toán xong (đọc realtime, không ghi).
- Solo mode (chơi cá nhân) vẫn quyết toán ở client (localStorage) — không ảnh hưởng vì là dữ liệu riêng của máy.

## Kiểm thử
Chạy thử thủ công: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/settle`
→ `{ ok, settledPreds, settledChampions }`. Nên test trên 1 phòng nháp trước.
