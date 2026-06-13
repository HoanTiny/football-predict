# Push Notifications — Hướng dẫn cấu hình

App gửi push trong 3 trường hợp:

1. **Nhắc giờ trận** — ~15 phút trước giờ bóng lăn, gửi cho người đã cược trận đó.
2. **Bàn thắng (live)** — khi tỉ số trận đang đá thay đổi, broadcast cho mọi người đã bật thông báo.
3. **Kết quả kèo** — khi trận kết thúc, báo từng người cược thắng/thua + số 💎.

> ⚠️ Lưu ý: thông báo "nhắc giờ" và "kết quả kèo" chỉ áp dụng cho kèo ở **chế độ phòng**
> (lưu trên Supabase). Kèo **chơi cá nhân** lưu ở localStorage trên máy nên server không
> biết để gửi. Thông báo "bàn thắng" thì broadcast cho tất cả nên ai cũng nhận.

## 1. Tạo VAPID keys

```bash
npx web-push generate-vapid-keys
```

Lấy `Public Key` và `Private Key` để điền vào env bên dưới.

## 2. Biến môi trường (Vercel → Settings → Environment Variables)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅ | VAPID public key (client dùng để subscribe). |
| `VAPID_PRIVATE_KEY` | ✅ | VAPID private key (chỉ server). |
| `VAPID_SUBJECT` | tuỳ | `mailto:email@cua-ban.com` (mặc định `mailto:admin@tinyfootball.app`). |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key của Supabase (Settings → API). Chỉ server, bỏ qua RLS. |
| `FOOTBALL_DATA_TOKEN` | ✅ | Token football-data.org để cron lấy kết quả trận server-side. |
| `CRON_SECRET` | nên có | Chuỗi ngẫu nhiên; Vercel tự gửi `Authorization: Bearer <CRON_SECRET>` khi chạy cron để chặn gọi trái phép. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ (đã có) | URL Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ (đã có) | Anon key Supabase. |

`NEXT_PUBLIC_*` phải set **lúc build** (client inline khi build).

## 3. Tạo bảng trong Supabase

Chạy lại `supabase/schema.sql` trong SQL Editor (đã thêm 2 bảng `push_subscriptions`
và `match_state`). Các lệnh đều `if not exists` nên chạy lại an toàn.

## 4. Vercel Cron

`vercel.json` đã khai báo cron chạy mỗi phút:

```json
{ "crons": [{ "path": "/api/cron", "schedule": "* * * * *" }] }
```

> 🔴 **Gói Vercel:** cron mỗi phút yêu cầu **Vercel Pro**. Gói **Hobby** chỉ cho cron
> **1 lần/ngày** — khi đó "bàn thắng" và "nhắc giờ" gần như vô dụng. Nếu dùng Hobby,
> có thể thay bằng dịch vụ cron ngoài (cron-job.org, GitHub Actions…) gọi định kỳ:
>
> ```
> GET https://<domain>/api/cron
> Header: Authorization: Bearer <CRON_SECRET>
> ```

## 5. Bật thông báo (người dùng)

Vào tab **Settings → THÔNG BÁO → Bật thông báo trận đấu**, cho phép quyền Notification.
Trên iOS phải **cài app vào màn hình chính** (PWA) trước rồi mới bật được push.

## 6. Test thủ công

Sau khi set env + deploy, gọi cron trực tiếp để kiểm tra:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron
# → { ok: true, kickoff, goals, finished }
```

Lần chạy đầu chỉ ghi nhận trạng thái hiện tại (không gửi), từ lần sau mới phát hiện
thay đổi để gửi.
