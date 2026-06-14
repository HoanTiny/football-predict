# Token football-data — đặt ở SERVER (không lộ client)

Trước đây token được lưu ở `localStorage` client và có cả fallback
`NEXT_PUBLIC_FOOTBALL_DATA_TOKEN` (bị nhúng vào bundle → **lộ key**, ai cũng đọc được).

Giờ:
- Bỏ hoàn toàn `NEXT_PUBLIC_FOOTBALL_DATA_TOKEN`.
- Route `/api/matches` dùng **`FOOTBALL_DATA_TOKEN`** (env server, không lộ ra client).
- Client **không cần dán token** nữa nếu server đã có token.

## Cấu hình trên Vercel
| Env | Mô tả |
|---|---|
| `FOOTBALL_DATA_TOKEN` | Token football-data.org (server-only). |
| `NEXT_PUBLIC_HAS_SERVER_TOKEN` | Đặt `true` để app biết server đã có token → bỏ qua màn nhập token, vào thẳng app. |

Sau khi set 2 biến này + Redeploy: người dùng vào là chơi được ngay, không thấy ô nhập token.

## Ghi chú
- Vẫn cho phép người dùng **tự dán token cá nhân** (lưu cục bộ, gửi qua header) nếu muốn — route ưu tiên header, fallback env. Token cá nhân là của họ nên không phải vấn đề bảo mật chung.
- Token api-sports (RAPIDAPI_KEY) đã ở server từ trước.
