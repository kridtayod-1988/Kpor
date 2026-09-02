// Supabase client สำหรับใช้ใน Client Components (ฝั่ง browser)
// ใช้ anon key เท่านั้น — ปลอดภัยเพราะทุกตารางมี RLS คุ้มครองอยู่แล้ว (ดู schema.sql)
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
