import { createClient } from "@supabase/supabase-js";

// Client phía SERVER dùng service role key — bỏ qua RLS để đọc/ghi
// push_subscriptions & match_state. TUYỆT ĐỐI không import vào code client.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
