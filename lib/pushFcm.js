import crypto from "crypto";
import { supabaseAdmin } from "./supabaseAdmin";

// Gửi push tới app Android/iOS đóng gói (Capacitor) qua FCM HTTP v1 API.
// Google đã khai tử "Server Key" (Legacy API) — HTTP v1 API bắt buộc OAuth2 access token
// ký từ Service Account. Tự ký JWT bằng `crypto` built-in (RS256), không cần thêm thư viện
// google-auth-library cho một việc đơn giản.
//
// ENV cần: FCM_SERVICE_ACCOUNT_JSON = nội dung file service-account.json (dán nguyên chuỗi JSON).

let cachedAccount = null;
function serviceAccount() {
  if (cachedAccount !== null) return cachedAccount || null;
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    cachedAccount = false;
    return null;
  }
  try {
    cachedAccount = JSON.parse(raw);
    return cachedAccount;
  } catch {
    cachedAccount = false;
    return null;
  }
}

/** FCM đã sẵn sàng chưa (đủ service account + service role Supabase). */
export function fcmReady() {
  return Boolean(serviceAccount() && supabaseAdmin);
}

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let tokenCache = { token: null, exp: 0 };

/** Đổi Service Account -> OAuth2 access token (cache tới gần hết hạn). */
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.exp - 60 > now) return tokenCache.token;

  const sa = serviceAccount();
  if (!sa) throw new Error("Thiếu FCM_SERVICE_ACCOUNT_JSON");

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const unsigned = `${header}.${claim}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(sa.private_key)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM OAuth lỗi: HTTP ${res.status}`);
  const data = await res.json();
  tokenCache = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return data.access_token;
}

/**
 * Gửi 1 message tới 1 token; trả true nếu thành công, ném lỗi kèm mã nếu thất bại.
 * dataOnly=true → KHÔNG có field `notification` → Android không tự hiện alert/âm thanh,
 * toàn quyền hiển thị do code native (LiveMatchMessagingService) tự build. Dùng cho
 * live-update tỉ số (tick mỗi phút, không nên làm phiền như một thông báo mới mỗi lần).
 */
async function sendOne(token, payload, accessToken, projectId, dataOnly = false) {
  // Payload dùng chung với Web Push: {title, body, url?, tag?, data?}. FCM data-fields đều
  // phải là string, nên gộp url/tag vào `data` và ép kiểu.
  const dataFields = { ...(payload.data || {}) };
  if (payload.url) dataFields.url = payload.url;
  if (payload.tag) dataFields.tag = payload.tag;

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; UTF-8",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: dataOnly ? undefined : { title: payload.title, body: payload.body },
          data: Object.keys(dataFields).length
            ? Object.fromEntries(Object.entries(dataFields).map(([k, v]) => [k, String(v)]))
            : undefined,
          android: { priority: "high" },
        },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message || `FCM HTTP ${res.status}`);
    err.status = res.status;
    err.fcmCode = body?.error?.details?.[0]?.errorCode;
    throw err;
  }
}

/** Gửi payload {title, body, data?} tới danh sách row {token}; dọn token đã chết (unregistered). */
async function sendToRows(rows, payload, dataOnly = false) {
  if (!fcmReady() || !rows?.length) return;
  const sa = serviceAccount();
  const accessToken = await getAccessToken();
  const dead = [];
  await Promise.all(
    rows.map(async (r) => {
      try {
        await sendOne(r.token, payload, accessToken, sa.project_id, dataOnly);
      } catch (e) {
        if (e.status === 404 || e.fcmCode === "UNREGISTERED") dead.push(r.token);
      }
    })
  );
  if (dead.length) {
    await supabaseAdmin.from("fcm_tokens").delete().in("token", dead);
  }
}

/** Gửi push FCM tới các user cụ thể (theo user_id). */
export async function sendFcmToUserIds(userIds, payload) {
  if (!fcmReady()) return;
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return;
  const { data } = await supabaseAdmin.from("fcm_tokens").select("token").in("user_id", ids);
  await sendToRows(data, payload);
}

/** Gửi push FCM broadcast tới TẤT CẢ token đã đăng ký. */
export async function sendFcmToAll(payload) {
  if (!fcmReady()) return;
  const { data } = await supabaseAdmin.from("fcm_tokens").select("token");
  await sendToRows(data, payload);
}

/**
 * Gửi DATA-ONLY tới các user cụ thể — dùng cho live-update tỉ số/phút (kiểu iOS Live
 * Activity). Không hiện alert mặc định; native (LiveMatchMessagingService) tự vẽ/cập nhật
 * notification kiểu ProgressStyle. `data` nên có `liveMatch: "1"` để native nhận diện.
 */
export async function sendFcmDataToUserIds(userIds, data) {
  if (!fcmReady()) return;
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return;
  const { data: rows } = await supabaseAdmin.from("fcm_tokens").select("token").in("user_id", ids);
  await sendToRows(rows, { data }, true);
}
