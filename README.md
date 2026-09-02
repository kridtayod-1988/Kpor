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
