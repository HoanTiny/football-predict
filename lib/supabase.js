import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** null nếu chưa cấu hình env → app tự ẩn chế độ chơi theo phòng. */
export const supabase = url && key ? createClient(url, key) : null;

export const supabaseReady = Boolean(url && key);
