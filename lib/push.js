import webpush from "web-push";
import { supabaseAdmin } from "./supabaseAdmin";
import { sendFcmToUserIds, sendFcmToAll } from "./pushFcm";

// Cấu hình VAPID. Public key cũng được client dùng để subscribe.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@tinyfootball.app";

let configured = false;
function ensureConfigured() {
  if (!configured && PUBLIC_KEY && PRIVATE_KEY) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  }
  return configured;
}

/** Push đã sẵn sàng chưa (đủ VAPID keys + service role). */
export function pushReady() {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY && supabaseAdmin);
}

/** Gửi tới danh sách row {endpoint, subscription}; dọn các subscription đã chết (404/410). */
async function sendToRows(rows, payload) {
  if (!ensureConfigured() || !rows?.length) return;
  const data = JSON.stringify(payload);
  const dead = [];
  await Promise.all(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification(r.subscription, data);
      } catch (e) {
        if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(r.endpoint);
      }
    })
  );
  if (dead.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", dead);
  }
}

/** Gửi push tới các user cụ thể (theo user_id) — cả Web Push lẫn app native (FCM). */
export async function sendToUserIds(userIds, payload) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return;
  const tasks = [sendFcmToUserIds(ids, payload)];
  if (pushReady()) {
    tasks.push(
      supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, subscription")
        .in("user_id", ids)
        .then(({ data }) => sendToRows(data, payload))
    );
  }
  await Promise.all(tasks);
}

/** Gửi push broadcast tới TẤT CẢ subscription — cả Web Push lẫn app native (FCM). */
export async function sendToAll(payload) {
  const tasks = [sendFcmToAll(payload)];
  if (pushReady()) {
    tasks.push(
      supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, subscription")
        .then(({ data }) => sendToRows(data, payload))
    );
  }
  await Promise.all(tasks);
}
