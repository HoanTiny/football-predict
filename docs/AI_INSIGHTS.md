# Nhận định AI (Claude)

Tích hợp Claude để đưa ra **nhận định tham khảo** (không phải số liệu chính thức):

| Tính năng | Ở đâu | Endpoint |
|---|---|---|
| Nhận định + gợi ý tỉ số trận | Tab "Chi tiết trận đấu" → nút **🤖 Phân tích trận này** | `POST /api/ai/match` |
| Nhận định bảng đấu + dự đoán đội đi tiếp | Tab **Bảng** → nút **🤖 Nhận định** mỗi bảng | `POST /api/ai/group` |

AI dùng dữ liệu sẵn có (hạng FIFA, hạng bảng, phong độ) + kiến thức bóng đá → **không cần** gói thể thao trả phí, lấp được chỗ trống mà api-sports free thiếu.

## Cấu hình

| Env | Bắt buộc | Mô tả |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | API key Anthropic (console.anthropic.com). Chỉ server dùng. |
| `ANTHROPIC_MODEL` | tuỳ | Mặc định `claude-opus-4-8`. Đổi `claude-haiku-4-5` để rẻ/nhanh hơn. |

Thêm trên Vercel → Settings → Environment Variables → Redeploy.

## Chi phí
- Gọi **theo lượt bấm nút** (không tự động) để tiết kiệm.
- `claude-opus-4-8`: ~$5/1M input, $25/1M output. Mỗi nhận định ngắn (~vài trăm token) rất rẻ.
- Cần tối ưu chi phí: đặt `ANTHROPIC_MODEL=claude-haiku-4-5` (~$1/$5 per 1M).

## Kỹ thuật
- `lib/ai.js`: client Anthropic + structured outputs (`output_config.format` json_schema) → JSON ổn định.
- Model mặc định `claude-opus-4-8`, `effort: "low"` cho phản hồi nhanh.
- Suy giảm: thiếu key → route trả 503, UI hiện lỗi gọn.
- CI chặn egress → chỉ verify trên Vercel.
