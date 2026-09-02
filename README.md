<<<<<<< HEAD
# คลังข้อสอบจริง ก.พ. E-EXAM 2569 — Next.js Scaffold

สแคฟโฟลด์นี้ครอบคลุมครบทุกส่วนหลักแล้ว: **Auth**, **หน้า 1/หน้า 2**, **หน้าสอบจริง + คำนวณคะแนนฝั่ง server**,
**หน้าผลสอบ**, และ **Admin Panel ครบ 8 แท็บ**

## ลำดับการติดตั้งฐานข้อมูล (สำคัญมาก ต้องรันตามลำดับ)

รันใน Supabase SQL Editor ตามลำดับนี้:

1. `supabase/01_schema.sql` (ไฟล์ schema หลักจากขั้นตอนก่อนหน้า — คัดลอกมาไว้ในโฟลเดอร์ `supabase/`)
2. `supabase/02_scoring_functions.sql` — ฟังก์ชันคำนวณคะแนน + ล็อกไม่ให้ client อ่านเฉลยตรง ๆ
3. `supabase/03_admin_functions.sql` — ฟังก์ชันสำหรับ Admin Panel (รหัสผ่าน, AI settings, สถิติ, รีเซ็ตคลัง)

> ⚠️ `02_scoring_functions.sql` จะ **ลบ policy เดิม** ที่อนุญาตให้ผู้ใช้ทั่วไปอ่านตาราง `questions` ได้ตรง ๆ
> แล้วเปลี่ยนไปใช้ view `questions_public` (ไม่มีเฉลย) แทน — เพื่อป้องกันไม่ให้ผู้ใช้เปิด devtools แล้ว query
> ตาราง `questions` เพื่อดูเฉลยก่อนส่งข้อสอบ ต้องรันไฟล์นี้ต่อจาก schema หลักเสมอ

## โครงสร้างไฟล์ที่เพิ่มเข้ามาในรอบนี้

```
supabase/02_scoring_functions.sql     -- upsert_answer, submit_attempt, questions_public view,
                                          reveal_question_answer, get_attempt_review
supabase/03_admin_functions.sql       -- verify_admin_password, update_admin_password,
                                          get_ai_settings, update_ai_settings, get_ai_keys_internal,
                                          get_question_bank_stats, admin_reset_question_bank

app/(app)/exam/[setId]/page.tsx       -- โหลดคำถามแบบไม่มีเฉลย (questions_public) + สถานะ attempt เดิม
components/ExamRunner.tsx             -- หน้าจอทำข้อสอบจริง: จับเวลา, navigator, flag, practice-mode reveal
app/(app)/result/[attemptId]/page.tsx -- ดึงผลสอบ + get_attempt_review RPC
components/ResultView.tsx             -- คะแนนรวม, เกณฑ์แยกส่วน GPA3, รีวิวคำตอบพร้อมตัวกรอง

app/(admin)/admin/layout.tsx          -- guard ชั้นที่ 1: ต้องมี role='admin' ในฐานข้อมูล
components/AdminGate.tsx              -- guard ชั้นที่ 2: ต้องใส่รหัสผ่าน Admin (ปลดล็อกต่อ browser tab)
app/(admin)/admin/page.tsx            -- ประกอบ AdminGate + AdminDashboard
components/admin/AdminDashboard.tsx   -- shell แท็บทั้ง 8
components/admin/OverviewTab.tsx      -- สถิติคลังข้อสอบ + จำนวนผู้ใช้/ชุดข้อสอบ/การทำข้อสอบ
components/admin/QuestionsTab.tsx     -- ค้นหา/กรอง/เพิ่ม/ลบคำถาม
components/admin/AIGeneratorTab.tsx   -- ฟอร์มสร้างข้อสอบด้วย AI + พื้นที่พรีวิวก่อนบันทึก
components/admin/UsersTab.tsx         -- ตารางผู้ใช้ + XP/Level
components/admin/SettingsTab.tsx      -- AI provider, API keys, เปลี่ยนรหัสผ่าน Admin
components/admin/BlueprintTab.tsx     -- แสดงโครงสร้างเกณฑ์แยกส่วน GPA3
components/admin/ExamSetsTab.tsx      -- สร้าง/ลบ/ซ่อน-แสดงชุดข้อสอบ
components/admin/DbTab.tsx            -- export/import JSON, รีเซ็ตคลังข้อสอบ
app/api/admin/generate/route.ts       -- เรียก Gemini/Claude ฝั่ง server (คีย์ไม่ถูกส่งกลับ client)
```

## จุดออกแบบด้านความปลอดภัยที่สำคัญ

1. **เฉลยไม่รั่วระหว่างทำข้อสอบ** — ตาราง `questions` (มี `correct_index`/`explanation`) เปิดให้
   admin เท่านั้น (`is_admin()`); ผู้ใช้ทั่วไปเห็นได้แค่ผ่าน view `questions_public` (ไม่มีเฉลย)
   ยกเว้นโหมด `practice` ที่เปิดเฉลยได้ทันทีผ่านฟังก์ชัน `reveal_question_answer` (ตรวจสิทธิ์ในตัว)
2. **คะแนนคำนวณฝั่ง server เสมอ** — ฟังก์ชัน `submit_attempt` (`SECURITY DEFINER`) เป็นผู้เดียวที่เขียน
   `raw_score`/`passed`/`passed_sections` ป้องกันผู้ใช้ปลอมคะแนนจาก client
3. **Admin Panel มี 2 ชั้นการป้องกัน** — role=`admin` ในฐานข้อมูล (ชั้น 1, กันที่ layout) และรหัสผ่าน
   Admin แยกต่างหาก (ชั้น 2, `AdminGate` เรียก `verify_admin_password`) — ปลดล็อกแค่ในแท็บเบราว์เซอร์นั้น
   (เก็บใน `sessionStorage`) ไม่ persist ข้ามอุปกรณ์
4. **ไม่ต้องใช้ Service Role Key เลยในสแคฟโฟลด์นี้** — ทุกฟังก์ชัน admin (`update_ai_settings`,
   `get_ai_keys_internal`, `admin_reset_question_bank` ฯลฯ) เป็น `SECURITY DEFINER` ที่ตรวจ `is_admin()`
   ภายในตัวเอง จึงปลอดภัยพอที่จะ grant execute ให้ `authenticated` ได้ตรง ๆ (ไฟล์
   `lib/supabase/admin.ts` ยังคงไว้เผื่อพัฒนาฟีเจอร์ที่ต้อง bypass RLS จริง ๆ ในอนาคต)

## จุดที่ยังไม่ได้ทำ / ต่อยอดได้อีก

- **UI จัดลำดับคำถามในชุดข้อสอบ** (`exam_set_questions`) — ตอนนี้ต้อง insert ตรงผ่าน SQL/Supabase
  Table Editor เอง เมื่อสร้างชุดข้อสอบใหม่จากแท็บ "ชุดข้อสอบ"
- **โหมด workshop/category แบบสุ่มข้อสอบสด ๆ** — ตอนนี้ทุกโหมดอ้างอิงแถวใน `exam_sets` ที่มีอยู่แล้ว
  ยังไม่ได้ทำการ "ประกอบชุดข้อสอบชั่วคราว" จากหมวดที่ผู้ใช้เลือกเอง ณ runtime
- **แก้ไขคำถามที่มีอยู่แล้ว** — แท็บคำถามตอนนี้ทำได้แค่ค้นหา/เพิ่ม/ลบ ยังไม่มีฟอร์มแก้ไข
- **หน้า Login ของ Google OAuth ต้องตั้งค่า provider ใน Supabase Dashboard ก่อนใช้งานจริง**
  (ดู README เดิมส่วน "วิธีติดตั้งและรันในเครื่อง")

## วิธีติดตั้งและรันในเครื่อง

1. รันไฟล์ SQL ทั้ง 3 ไฟล์ตามลำดับด้านบนใน Supabase SQL Editor
2. ตั้งค่า Google OAuth provider ใน Supabase Dashboard → Authentication → Providers → Google
3. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าให้ครบ (รวม `GEMINI_API_KEY`/`CLAUDE_API_KEY`
   เป็น optional — ถ้าไม่ใส่ใน env ให้ไปตั้งค่าผ่านแท็บ "การตั้งค่า" ใน Admin Panel แทนได้)
4. `npm install && npm run dev`
5. ตั้ง `profiles.role = 'admin'` ให้ผู้ใช้ของคุณเองผ่าน Supabase SQL Editor เพื่อเข้าถึง Admin Panel:
   ```sql
   update profiles set role = 'admin' where id = '<your-user-uuid>';
   ```
6. เข้า `/admin` → กรอกรหัสผ่านเริ่มต้น `แอดมิน123` (เปลี่ยนทันทีในแท็บ "การตั้งค่า")
=======
# คลังข้อสอบจริง ก.พ. E-EXAM 2569 — Next.js Scaffold (ปรับให้ตรงกับฐานข้อมูลจริง)

⚠️ **สำคัญ**: โค้ดชุดนี้ถูกปรับให้ตรงกับ Supabase project **"KPOR"** ที่มีอยู่จริงแล้ว
(ตาราง `categories`, `exam_years`, `questions` ที่มีข้อมูลจริง 117+ ข้อ, `exam_attempts`,
`user_seen_questions`, `system_config`, `profiles`) **ไม่ใช่** schema ที่ออกแบบไว้ตอนแรกในแชท
(`exam_sets`/`subcategories` ในโฟลเดอร์ `supabase/_legacy_original_design/` — ห้ามใช้กับโปรเจกต์นี้)

## ✅ สถานะฐานข้อมูล: รันเรียบร้อยแล้ว

ไฟล์ `supabase/04_adapt_existing_schema.sql` **ถูกรันเข้า Supabase project จริงเรียบร้อยแล้ว**
ผ่าน MCP โดยตรงในระหว่างการสนทนานี้ ไม่ต้องรันซ้ำอีก ไฟล์นี้เก็บไว้เป็นเอกสารอ้างอิง/ประวัติเท่านั้น
สิ่งที่ถูกเพิ่ม/แก้ไขในฐานข้อมูลจริงมีดังนี้:

1. **ปิดช่องโหว่เฉลยรั่ว** — เดิม policy `questions_select` ให้ผู้ใช้ที่ล็อกอินอ่านทั้งแถวของ
   `questions` ได้ตรง ๆ (รวมเฉลย!) เปลี่ยนเป็น admin-only + สร้าง view `questions_public`
   (ไม่มีเฉลย) ให้แอปใช้ตอนทำข้อสอบแทน
2. **ล็อก `exam_attempts` หลังส่งข้อสอบ** — เพิ่มเงื่อนไข `finished_at is null` ใน update policy
   ป้องกันผู้ใช้แก้ไขคำตอบ/คะแนนหลังส่งไปแล้ว
3. **คอลัมน์ใหม่**: `exam_attempts.instant_reveal`, `exam_attempts.flagged_question_ids`,
   `system_config.admin_password_hash`, `system_config.ai_provider`
4. **ตารางใหม่**: `terms_versions`, `terms_acceptance` (ข้อกำหนดและเงื่อนไข), `ai_generation_logs`
5. **RPC functions ใหม่ทั้งหมด** (SECURITY DEFINER, เช็คสิทธิ์ในตัวเอง):
   `start_attempt`, `save_attempt_answer`, `toggle_attempt_flag`, `reveal_question_answer`,
   `submit_exam_attempt`, `get_attempt_review`, `verify_admin_password`, `update_admin_password`,
   `get_question_bank_stats`, `admin_reset_question_bank`
6. รหัสผ่าน Admin เริ่มต้นถูกตั้งเป็น `แอดมิน123` (เฉพาะกรณีที่ยังไม่เคยตั้งไว้ก่อน) — **เปลี่ยนทันที**
   ผ่านแท็บ "การตั้งค่า" ก่อนเปิดใช้งานจริง

รัน Security Advisor แล้วไม่พบช่องโหว่ระดับ ERROR คงเหลือ (มีแค่ WARN ที่เป็นการออกแบบตั้งใจ เพราะทุก
RPC ตรวจ `is_admin()`/`auth.uid()` เองอยู่แล้ว)

## โครงสร้างที่ตรงกับฐานข้อมูลจริง

```
หน้า 1 (/)              → การ์ด 3 โหมด: full100 (จำลองสนามจริง) / category (ติวเจาะรายหมวด) / year (คลังเก่า)
หน้า 2 (/exam-sets)     → เลือกหมวดวิชา/รอบสอบ + สวิตช์ "ฝึกพร้อมเฉลยทันที" + ยืนยันก่อนสอบ
หน้าสอบ (/exam/[id])    → โหลดจาก questions_public (ไม่มีเฉลย), จับเวลาเฉพาะโหมด full100
หน้าผลสอบ (/result/[id])→ get_attempt_review RPC, สรุปคะแนนแยกหมวดวิชา (คำนวณจาก review ไม่ใช่ pass/fail ตายตัว)
/admin                  → 8 แท็บ, ปิดล็อก 2 ชั้น (role=admin + รหัสผ่านแยก)
```

## ⚠️ ข้อจำกัดที่ควรทราบ (ต่างจากสเปคดั้งเดิมที่คุยกันตอนแรก)

- **ไม่มีเกณฑ์ผ่านแยกส่วน 3 หมวด (GPA3)** — ฐานข้อมูลจริงไม่มีแนวคิด pass_score/max_score ต่อหมวด
  หน้าผลสอบจึงแสดง "คะแนนรวม + สรุปแยกหมวด" แทน ไม่มี badge "ผ่าน/ไม่ผ่าน" อย่างเป็นทางการ
  (ถ้าต้องการฟีเจอร์นี้จริง ๆ ต้องออกแบบตารางเพิ่มและคุยรายละเอียดเกณฑ์กันใหม่)
- **โหมด category/year สุ่ม 20 ข้อคงที่** (กำหนดในฟังก์ชัน `start_attempt`) และไม่จับเวลา —
  จำกัดเวลาเฉพาะโหมด full100 ตาม `system_config.full_exam_time_minutes`
- **ยังไม่มี UI แก้ไขคำถามที่มีอยู่แล้ว** ในแท็บคำถาม (ทำได้แค่ค้นหา/เพิ่ม/ลบ)
- **ยังไม่มี UI แก้ไข `system_config.full_exam_question_count`/`full_exam_time_minutes`** ในแท็บแผนผัง
  ต้องแก้ผ่าน Supabase Table Editor โดยตรงไปก่อน

## วิธีติดตั้งและรันในเครื่อง

1. ฐานข้อมูลพร้อมใช้งานแล้ว (ดูหัวข้อด้านบน) — ไม่ต้องรัน SQL ใด ๆ เพิ่ม
2. ตั้งค่า Google OAuth provider ใน Supabase Dashboard → Authentication → Providers → Google (ถ้ายังไม่ได้ตั้ง)
3. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า:
   - `NEXT_PUBLIC_SUPABASE_URL=https://mivyilrytsoncvolhhev.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (legacy anon key จาก Supabase Dashboard → Settings → API)
4. `npm install && npm run dev`
5. เข้า `/admin` → กรอกรหัสผ่านเริ่มต้น `แอดมิน123` (เปลี่ยนทันทีในแท็บ "การตั้งค่า")

## Deploy บน Vercel

โปรเจกต์ Vercel ชื่อ `kpor` เชื่อมกับ GitHub repo `kridtayod-1988/Kpor` ไว้แล้ว (auto-deploy ทุกครั้งที่
push เข้า `main`) แต่ **ยังไม่เคย deploy สำเร็จเลยสักครั้ง เพราะยังไม่ได้ตั้งค่า Environment Variables**
ต้องเพิ่มตัวแปรตามข้อ 3 ด้านบนใน Vercel Dashboard → Project Settings → Environment Variables ก่อน
แล้วค่อย trigger deploy (push commit ใหม่ หรือกด Redeploy ใน Vercel Dashboard)
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
