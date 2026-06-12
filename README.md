# 🏟️ Tiny Football 2026™ — Predict & Win

Ứng dụng dự đoán tỉ số các trận đấu chính thức của giải vô địch bóng đá thế giới **Tiny Football 2026™** (FIFA World Cup 2026™). Tích lũy chips, đua top bảng xếp hạng cùng bạn bè và khẳng định vị thế "Nhà tiên tri bóng đá"!

---

## 🌟 Tính Năng Chính

Ứng dụng được thiết kế theo phong cách giao diện hiện đại kết hợp giữa Apple Sports, Apple VisionOS và các ứng dụng thể thao cao cấp như Sofascore, OneFootball.

### 1. Game Mode đa dạng
- **🙋 Chơi một mình (Solo Mode)**: Dành cho trải nghiệm cá nhân nhanh chóng, toàn bộ dữ liệu cược được lưu trữ an toàn trong LocalStorage trên trình duyệt của bạn (không cần đăng nhập).
- **🏟️ Chơi theo phòng (Room Mode)**: Cho phép tạo phòng hoặc tham gia phòng cùng nhóm bạn bè. Toàn bộ dữ liệu đồng bộ thời gian thực (Realtime) qua cơ sở dữ liệu Supabase.
  - *Chống spam*: Yêu cầu người dùng đăng nhập tài khoản (Supabase Auth qua Email hoặc Google) trước khi tham gia/tạo phòng để đảm bảo tính minh bạch.

### 2. Các Tab chức năng chính
- **📅 Lịch thi đấu (Schedule)**: Danh sách đầy đủ các trận đấu phân chia theo ngày, hiển thị thông tin bảng đấu, lượt đấu, địa điểm và thời gian theo giờ Việt Nam. Có tích hợp đếm ngược (Countdown) tới trận đấu tiếp theo.
- **📋 Bảng đấu & Xếp hạng (Groups)**: Hiển thị danh sách các bảng đấu và tự động tính toán bảng xếp hạng của từng bảng dựa trên tỉ số các trận đã kết thúc.
- **🗺️ Sơ đồ Knocout (Bracket)**: Trực quan hóa sơ đồ phân cặp và thi đấu của các vòng đấu loại trực tiếp từ vòng 32 đến trận Chung kết.
- **🎯 Dự đoán (Predictions)**: Nơi người chơi nhập tỉ số dự kiến và đặt số chips cược.
- **📊 Bảng xếp hạng (Leaderboard)**: Bục vinh quang (Podium) 3 vị trí đầu tiên Vàng, Bạc, Đồng thiết kế cột đứng thể thao cao cấp cùng biểu đồ tóm tắt (Bento) chỉ số cá nhân.
- **🏆 Dự đoán Vô địch (Champion Pick)**: Cho phép đặt cược đội bóng sẽ nâng cao cúp vàng thế giới trước khi các trận đấu khởi tranh.

### 3. Chế độ Streamer / OBS Overlay (`/stream`)
- Giao diện dành riêng cho streamer dùng để đưa vào OBS (Browser Source).
- Tích hợp tính năng tự động chuyển xoay vòng các bảng xếp hạng, đếm ngược và bật Webcam trực tiếp trên website dạng hình tròn di chuyển linh hoạt.

---

## 🎮 Hướng Dẫn Cách Chơi

### 1. Đăng ký & Nhận Chips
- Khi lần đầu truy cập, bạn nhập tên hiển thị và nhận ngay **5.000 💎 chips** ban đầu làm vốn.
- Ở chế độ phòng chơi chung, bạn cần đăng nhập tài khoản của mình bằng email hoặc tài khoản Google trước khi vào phòng.

### 2. Quy tắc đặt cược trận đấu
- Bạn chỉ có thể đặt cược cho các trận đấu ở trạng thái **Sắp diễn ra** (`SCHEDULED` hoặc `TIMED`). Khi trận đấu đã bắt đầu (Khóa cược - `Locked`), bạn không thể sửa đổi.
- Chọn trận đấu bất kỳ, dự đoán tỉ số của hai đội và chọn số chips muốn cược (Tối thiểu 10 💎, tối đa là số chips bạn đang có).
- Nhấp **Xác nhận** để chốt cược.

### 3. Quy tắc tính điểm & Quyết toán (Settlement)
Sau khi trận đấu kết thúc và có kết quả chính thức, hệ thống sẽ tự động tính toán và cộng/trừ chips của bạn:
- 🎯 **Đúng tỉ số chính xác**: Nhận lại chips cược và thưởng thêm **x3 lần** số chips đã cược (Ví dụ: cược 100 💎 và đoán đúng tỉ số -> nhận về tổng cộng 400 💎).
- ✅ **Đúng kết quả (Thắng/Hòa/Thua) nhưng sai tỉ số**: Nhận lại chips cược và thưởng thêm **x1 lần** số chips đã cược (Ví dụ: đoán thắng và đội đó thắng nhưng tỉ số khác -> nhận về tổng cộng 200 💎).
- ❌ **Đoán sai kết quả**: Bạn sẽ mất hoàn toàn số chips đã đặt cược cho trận đấu đó.

---

## 🛠️ Cài Đặt & Cấu Hình

### 1. Cấu hình biến môi trường
Tạo file `.env.local` ở thư mục gốc của dự án với các thông số sau:

```env
# Supabase (Bắt buộc cho chế độ chơi theo phòng)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Football Data API (Dùng để lấy lịch thi đấu thực tế)
NEXT_PUBLIC_FOOTBALL_DATA_TOKEN=<your-football-data-token>
```

### 2. Khởi tạo cơ sở dữ liệu
Chạy toàn bộ nội dung file [schema.sql](file:///c:/Users/ADMIN/wc2026/supabase/schema.sql) trong **Supabase SQL Editor** để khởi tạo các bảng `rooms`, `players`, `predictions` cùng các chính sách bảo mật RLS tương ứng.

### 3. Chạy ứng dụng locally
Cài đặt dependencies và chạy dev server:

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt để trải nghiệm game.
