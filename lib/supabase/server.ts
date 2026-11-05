// Supabase client สำหรับใช้ใน Server Components / Route Handlers / Server Actions
// อ่าน/เขียน cookie session ของผู้ใช้ที่ล็อกอินอยู่ (ยังคงอยู่ภายใต้ RLS ตามสิทธิ์ของผู้ใช้นั้น)
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // เรียกจาก Server Component (read-only) — middleware จะ refresh session แทน
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // เช่นเดียวกับด้านบน
          }
        },
      },
    }
  );
}
