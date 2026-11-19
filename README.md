# ก.พ. E-EXAM 2569

Web App สำหรับฝึกและจำลองการสอบ ก.พ. พัฒนาด้วย Next.js, React และ Supabase

> สถานะ: กำลังปรับปรุงบน branch `codex/eexam-2569-stabilization`
> ยังไม่ deploy และยังไม่ apply migration ใด ๆ กับ Production

## Stack

- Next.js 15.5.28
- React 18.3.1
- TypeScript
- Supabase Auth, Postgres และ Row Level Security
- `@supabase/ssr` สำหรับ session แบบ cookie

## โครงสร้างฐานข้อมูลที่แอปชุดนี้คาดหวัง

แอปปัจจุบันอ้างอิง schema กลุ่มนี้:

- `profiles`, `subject_groups`, `subcategories`
- `questions`, `questions_public`
- `exam_sets`, `exam_set_sections`, `exam_set_questions`
- `user_attempts`, `user_answers`
- `ai_generation_logs`, `app_settings`

เส้นทางการสอบต้องใช้ `user_attempts.id` เป็น Attempt ID ตั้งแต่เริ่มสอบจนถึงหน้าผลสอบ ส่วนโจทย์ระหว่างสอบอ่านผ่าน `questions_public` ซึ่งไม่ส่ง `correct_index` หรือ `explanation` ไปยัง Browser

## สำคัญ: ตรวจสอบ Supabase ก่อน apply SQL

พบ Supabase สองโปรเจกต์ที่มี schema ต่างกัน:

- `kpor` ใช้ `subcategories`, `user_attempts`, `user_answers` ซึ่งตรงกับโค้ดแอปชุดนี้
- `kp-exam-v4` ใช้ `categories`, `exam_attempts`, `question_text` ซึ่งเป็นอีก schema หนึ่ง ไม่ใช่ drop-in replacement

อย่ารัน migration ของ schema หนึ่งกับอีกโปรเจกต์หนึ่ง และอย่ารันไฟล์ `supabase/04_adapt_existing_schema.sql` กับ schema แบบ `user_attempts` เพราะไฟล์ดังกล่าวออกแบบสำหรับตาราง `categories` / `exam_attempts` คนละชุด

ไฟล์ `supabase/_legacy_original_design/` เป็นไฟล์ออกแบบ/ฐานเดิมที่เก็บไว้เป็นข้อมูลอ้างอิง ไม่ใช่คำสั่งให้รันซ้ำกับฐานข้อมูลที่มีอยู่แล้ว

ก่อน apply `supabase/05_security_hardening_kpor.sql`:
1. ยืนยัน Project URL/ID ของ Production จาก Vercel และ Supabase ให้ตรงกัน
2. สำรองฐานข้อมูล
3. ตรวจสอบ SQL กับ schema ของ target project อีกครั้ง
4. apply ใน staging ก่อน แล้วทดสอบ Auth, เริ่มสอบ, บันทึกคำตอบ, เปิดเฉลยโหมดฝึก และส่งข้อสอบ

ไฟล์ migration ใหม่นี้ยังไม่ได้ถูกรันกับฐานข้อมูลใด

migration 05 มีการ harden `SECURITY DEFINER` ด้วย `search_path` ว่างและระบุ schema ชัดเจน, ปฏิเสธค่าลงทะเบียนที่เป็น `NULL`, จำกัดการเรียก RPC และป้องกันการแก้คำถาม/ชุดข้อสอบย้อนหลัง อย่างไรก็ตาม CI ปัจจุบันตรวจเฉพาะ TypeScript และ Next.js build; SQL ยังต้องผ่าน staging test ก่อน apply จริง

## Authentication และ Environment Variables

ตั้งค่าใน Vercel Environment Variables หรือไฟล์ local `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

ใช้ publishable/anon key สำหรับ browser และ SSR client เท่านั้น ห้ามใส่ Service Role Key ในตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` หรือส่งกลับไปยัง client

ต้องตั้งค่า Google OAuth Provider ใน Supabase Dashboard และตั้ง callback URL เป็น:

```
https://<your-domain>/auth/callback
```

รวมทั้งกำหนด Site URL และ Redirect URLs ให้ตรงกับโดเมน Production และ localhost ที่ใช้งานจริง

## สิ่งที่ปรับปรุงใน branch นี้

- เริ่มข้อสอบผ่าน RPC `start_attempt(p_exam_set_id)` เพื่อให้ฐานข้อมูลตรวจ Published Set และเงื่อนไขการยืนยันตัวตนก่อนสร้าง Attempt
- ใช้ Attempt ID เป็น dynamic route key; ไม่ใช้ Exam Set ID ปะปนกับ Attempt ID
- โหลดโจทย์จาก `questions_public` และเรียงตาม `exam_set_questions.position`
- โหลดคำตอบเดิมจาก `user_answers` เพื่อรองรับการกลับมาทำข้อสอบต่อ
- ส่งหน้าผลสอบโดยใช้ Attempt ID เดียวกัน
- คำนวณคะแนนแยกหมวดตาม `exam_set_questions.points` จริง
- จำกัดการเปิดเฉลยให้เป็นข้อที่อยู่ในชุดสอบของ Attempt เจ้าของเท่านั้น
- Admin Question CRUD รองรับเพิ่ม/แก้ไข/ลบ และป้องกันการแก้โจทย์ที่ถูกใช้ใน Attempt แล้วเพื่อคงความถูกต้องของประวัติ
- เพิ่ม Exam Set Builder: ค้นหา/กรองคำถาม เพิ่ม-นำออก จัดลำดับ และกำหนดคะแนนรายข้อ; ชุดใหม่เป็นฉบับร่างและตรวจจำนวนข้อ/คะแนนก่อนเผยแพร่
- ล็อกการเปลี่ยนคำถาม ลำดับ คะแนน เกณฑ์แยกหมวด metadata และการลบชุดข้อสอบเมื่อมี Attempt แล้ว ทั้งในหน้า Admin และ Database Trigger
- ตัวจัดชุดข้อสอบปิดการแก้ไขทันทีเมื่อยังตรวจประวัติ/Mapping ไม่สำเร็จ และใช้ request token กันคำตอบจากการโหลดเก่าทับชุดที่เปิดใหม่
- `start_attempt` ตรวจจำนวนคำถามที่ใช้งานได้และคะแนนรวมก่อนสร้าง Attempt พร้อมล็อกแถวชุดข้อสอบเพื่อป้องกันการแก้ชุดพร้อมกับเริ่มสอบ
- จำกัด RPC เฉพาะผู้ใช้ที่เข้าสู่ระบบตามลักษณะการใช้งาน และเอาสิทธิ์ PUBLIC/anon ออกจากฟังก์ชัน Admin ที่ไม่ควรเปิดให้บุคคลทั่วไป
- เพิ่มการตรวจ role ฝั่ง Server และตรวจ schema ของ JSON ที่ AI สร้างก่อนส่งกลับให้ Preview
- ปิดตัวเลือก Google Sheets ชั่วคราวจนกว่าจะมีการเชื่อมต่ออ่านข้อมูลจริง

## งานที่ยังต้องทำต่อ

- เชื่อม Vercel เพื่อตรวจว่า Deployment จริงใช้ Supabase Project ใด
- CI ตรวจ TypeScript และ production build แล้ว; ESLint ยังต้องเพิ่ม dependency/config ก่อนเปิดเป็น check
- ทำ Google Sheets ingestion ด้วย OAuth/การอนุญาตที่เหมาะสม
- ทำ Backup/Restore ให้ครอบคลุมทุกตาราง พร้อม validation และ rollback
- เพิ่ม UX สำหรับสร้างสำเนาข้อสอบใหม่แทนการแก้ข้อสอบที่มีประวัติการสอบ และตรวจสอบ Auth redirect, rate limiting และ audit logging
- ทดสอบ RLS และ RPC ทุกบทบาทด้วยบัญชีผู้ใช้จริงใน staging


## แผนย้ายข้อสอบจาก kp-exam-v4

รายงานตรวจสอบฉบับเต็ม: [docs/kp-exam-v4-migration-assessment.md](docs/kp-exam-v4-migration-assessment.md)

- Mapping ที่ตรวจสอบได้: GPA_MATH 24 ข้อ, GPA_THAI 26 ข้อ, GPA_ENG 25 ข้อ และ GPA_LAW 25 ข้อ
- โจทย์ 100 ข้อมีตัวเลือก 4 ตัวและดัชนีคำตอบถูกต้อง แต่คำอธิบายเฉลยทั้ง 100 ข้อยังเป็น placeholder จึงต้องนำเข้าเป็น `is_active=false`
- มี 4 แถวที่ใช้ข้อความโจทย์เดียวกัน แต่ตัวเลือกแตกต่างกัน; ไม่มี exact duplicate ของโจทย์+ตัวเลือก+คำตอบ
- ไม่ย้ายผู้ใช้หรือ Attempt เดิมจากต้นทาง เพราะ user/attempt schema คนละระบบ
- เพิ่ม `scripts/migrate-kp-exam-v4-questions.mjs` ให้ Dry Run เป็นค่าเริ่มต้น; `--apply-bank` จะเพิ่มเฉพาะคำถาม inactive และไม่ผูกเข้าชุดสอบหรือเผยแพร่
- ตั้งค่า `SUPABASE_SOURCE_URL`, `SUPABASE_SOURCE_SERVICE_ROLE_KEY`, `SUPABASE_TARGET_URL`, `SUPABASE_TARGET_SERVICE_ROLE_KEY` ในเครื่องเท่านั้น ห้าม commit secret และห้ามใช้ prefix `NEXT_PUBLIC_`

ตัวอย่างคำสั่ง:
```bash
node scripts/migrate-kp-exam-v4-questions.mjs
node scripts/migrate-kp-exam-v4-questions.mjs --apply-bank
```

หลังการนำเข้าคลังแบบ inactive ต้องตรวจคำอธิบายเฉลยใน Admin → Questions ให้ครบก่อนเปิดใช้ จากนั้นซ่อนชุด `GPA3001`, จัดคำถามผ่าน Exam Set Builder, ทดสอบ staging และค่อยเผยแพร่

## Local development

```bash
npm install
npm run dev
```

ก่อนเปิดให้ผู้สอบใช้งานจริง ต้องผ่าน `npx tsc --noEmit`, `npm run build` และชุดทดสอบการเริ่มสอบ/บันทึกคำตอบ/ส่งข้อสอบ/ตรวจผล โดยใช้ Supabase staging ที่มี schema และ seed data ตรงกับแอป ปัจจุบัน Repository ยังไม่มี ESLint dependency/config จึงยังไม่รวม ESLint ใน CI
