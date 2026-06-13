# Dữ liệu thật cho tab "Chi tiết trận đấu"

Trước đây tab này dùng dữ liệu **giả hard-code** (FIFA rank bịa, phong độ/sân/thời tiết/H2H cố định).
Giờ thay bằng dữ liệu **thật**:

| Mục | Nguồn | Cần key? |
|---|---|---|
| **Hạng bảng** (thay "BXH FIFA") | Tự tính từ BXH bảng World Cup (kết quả thật) | ❌ |
| **Phong độ** | API-Football (5 trận gần nhất); fallback: tính từ trận đã đá trong giải | ✅ (fallback không cần) |
| **Lịch sử đối đầu (H2H)** | API-Football `/fixtures/headtohead` | ✅ |
| **Sân đấu / Trọng tài** | Trường `venue` / `referees` từ football-data | ❌ |
| **Thời tiết** | Open-Meteo theo toạ độ sân + ngày trận | ❌ (miễn phí) |
| **Tỉ lệ lựa chọn cộng đồng** | Tính thật từ kèo trong phòng | ❌ |

> Ghi chú: **API-Football không có "FIFA world ranking" chính thức**, nên ô xếp hạng dùng **hạng
> trong bảng World Cup** (thật & phù hợp ngữ cảnh giải) thay vì rank thế giới.

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `RAPIDAPI_KEY` | cho phong độ + H2H | Key API-Football qua RapidAPI. Nếu thiếu, phong độ tự fallback sang dữ liệu giải, và H2H hiện "chưa cấu hình". |

Thời tiết (Open-Meteo) không cần key.

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
