/* ---------------- HELPER GIỜ (theo múi giờ THIẾT BỊ) ----------------
 * Trước đây hard-code UTC+7 (Việt Nam). Giờ dùng giờ địa phương của máy/điện thoại
 * để ai ở đâu cũng thấy đúng giờ địa phương đó (vd UTC+9 ở Nhật, UTC+8 ở TQ…).
 * Tên hàm giữ tiền tố "vn" để khỏi sửa khắp app — hàm chỉ đổi semantic, không đổi chữ ký.
 */

const WEEKDAYS_VN = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export const pad = (n) => String(n).padStart(2, "0");

export const vnTime = (utcDate) => {
  const d = new Date(utcDate);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const vnDateKey = (utcDate) => {
  const d = new Date(utcDate);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const vnDateHeader = (utcDate) => {
  const d = new Date(utcDate);
  return `${WEEKDAYS_VN[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const vnNowKey = () => vnDateKey(new Date());

/** Khóa ngày địa phương của "ngày mai" (so với hiện tại). */
export const vnTomorrowKey = () =>
  vnDateKey(new Date(Date.now() + 24 * 3600 * 1000));

/** Ngày + giờ địa phương ngắn gọn cho timestamp cược: "13/06 02:00" */
export const vnShortDateTime = (utcDate) => {
  const d = new Date(utcDate);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
