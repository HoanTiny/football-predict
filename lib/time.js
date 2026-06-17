/* ---------------- HELPER GIỜ VIỆT NAM (UTC+7) ---------------- */

const WEEKDAYS_VN = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

// dịch sang giờ VN rồi đọc bằng các hàm getUTC*
const toVN = (utcDate) => {
  const d = new Date(utcDate);
  return new Date(d.getTime() + 7 * 3600 * 1000);
};

export const pad = (n) => String(n).padStart(2, "0");

export const vnTime = (utcDate) => {
  const d = toVN(utcDate);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

export const vnDateKey = (utcDate) => {
  const d = toVN(utcDate);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

export const vnDateHeader = (utcDate) => {
  const d = toVN(utcDate);
  return `${WEEKDAYS_VN[d.getUTCDay()]}, ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

export const vnNowKey = () => vnDateKey(new Date().toISOString());

/** Khóa ngày VN của "ngày mai" (so với hiện tại). */
export const vnTomorrowKey = () =>
  vnDateKey(new Date(Date.now() + 24 * 3600 * 1000).toISOString());

/** Ngày + giờ VN ngắn gọn cho timestamp cược: "13/06 02:00" */
export const vnShortDateTime = (utcDate) => {
  const d = toVN(utcDate);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
