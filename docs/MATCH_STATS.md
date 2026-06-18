# Dữ liệu thật cho tab "Chi tiết trận đấu"

Trước đây tab này dùng dữ liệu **giả hard-code** (FIFA rank bịa, phong độ/sân/thời tiết/H2H cố định).
Giờ thay bằng dữ liệu **thật**:

| Mục | Nguồn | Cần key? |
|---|---|---|
| **BXH FIFA** | Bảng tĩnh `lib/fifaRankings.js` (ảnh chụp 6/2026, cập nhật tay) | ❌ |
| **Hạng bảng** | Tự tính từ BXH bảng World Cup (kết quả thật) | ❌ |
| **Phong độ** | API-Football (5 trận gần nhất); fallback: tính từ trận đã đá trong giải | ✅ (fallback không cần) |
| **Lịch sử đối đầu (H2H)** | API-Football `/fixtures/headtohead` | ✅ |
| **Đội hình ra sân** | API-Football `/fixtures/lineups`; **fallback FotMob** (không key) | ⚠️ free không có WC2026 → FotMob bù |
| **Thống kê trận (sút, kiểm soát bóng…)** | API-Football `/fixtures/statistics`; **fallback FotMob** (không key) | ⚠️ như trên |
| **Sân đấu / Trọng tài** | Trường `venue` / `referees` từ football-data | ❌ |
| **Thời tiết** | Open-Meteo theo toạ độ sân + ngày trận | ❌ (miễn phí) |
| **Tỉ lệ lựa chọn cộng đồng** | Tính thật từ kèo trong phòng | ❌ |

> Ghi chú: **API-Football không có "FIFA world ranking" chính thức**, nên rank thế giới được lưu
> trong **bảng tĩnh `lib/fifaRankings.js`** (ảnh chụp 6/2026: Argentina #1, Switzerland #19,
> Qatar #56…). Khi FIFA ra bảng mới chỉ cần sửa số trong file này. Ngoài ra vẫn hiển thị thêm
> **hạng trong bảng World Cup** (tự tính từ kết quả thật).

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `RAPIDAPI_KEY` | cho phong độ + H2H | Key API-Football qua RapidAPI. Nếu thiếu, phong độ tự fallback sang dữ liệu giải, và H2H hiện "chưa cấu hình". |

Thời tiết (Open-Meteo) không cần key.

> 🆓 **Đội hình + thống kê (FotMob fallback)** — `lib/fotmob.js`. Gói free của API-Football &
> football-data **không** có lineup/stats cho World Cup 2026, nên route tự lấy từ **API nội bộ
> FotMob** (không cần key) khi 2 thứ này còn trống. ⚠️ Đây là API **không chính thức** — có thể
> đổi/chặn bất cứ lúc nào; mọi lỗi được nuốt gọn (trả null → UI tự ẩn khối). Chỉ gọi server-side
> (Cloudflare chặn client). Chỉ nên dùng cho mục đích phi thương mại.

### Lấy key API-Football (RapidAPI)
1. Đăng ký https://rapidapi.com → subscribe **API-Football** (api-football-v1) — có gói **Free** (~100 req/ngày).
2. Copy `X-RapidAPI-Key`.
3. Vercel → Settings → Environment Variables → thêm `RAPIDAPI_KEY = <key>` → Redeploy.

> ⚠️ Gói free chỉ 100 request/ngày. Mỗi lần mở chi tiết 1 trận tốn vài request (tìm id 2 đội +
> phong độ + H2H). Server đã **cache 6 giờ** theo từng truy vấn để tiết kiệm. Vẫn nên cân nhắc
> nâng gói nếu nhiều người dùng.

## Lưu ý kiểm thử
Môi trường dev/CI có thể chặn gọi mạng ra ngoài → chỉ verify được trên bản deploy Vercel
(nơi gọi được API-Football + Open-Meteo). Khi thiếu mạng/key, UI tự hiển thị "Đang cập nhật"
hoặc fallback, không vỡ giao diện.
