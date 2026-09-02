-- ============================================================================
-- คลังข้อสอบจริง ก.พ. E-EXAM 2569 — Supabase Schema
-- ============================================================================
-- วิธีใช้: รันไฟล์นี้ทั้งหมดใน Supabase SQL Editor (Project > SQL Editor > New query)
-- ลำดับ: extensions -> enums -> tables -> indexes -> functions/triggers -> RLS
-- ============================================================================

-- ── EXTENSIONS ───────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── ENUM TYPES ───────────────────────────────────────────────────────────
create type user_role as enum ('user', 'admin');
create type exam_mode as enum ('simulation', 'practice', 'archive', 'workshop', 'category');
create type ai_provider as enum ('auto', 'gemini', 'claude');
create type ai_source_mode as enum ('article', 'topic', 'google_sheet');
create type generation_status as enum ('pending', 'generating', 'preview', 'saved', 'discarded', 'failed');
create type exam_round as enum ('r2026_04_26', 'r2026_05_22', 'r2026_05_23', 'r2026_05_24', 'r2026_07_05_am', 'r2026_07_05_pm', 'manual', 'ai_generated');

-- ============================================================================
-- 1. PROFILES  (extends auth.users)
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role user_role not null default 'user',
  xp integer not null default 0,
  level integer not null default 1,
  exam_number text,          -- เลขประจำตัวสอบ (optional, ผู้ใช้กรอกเอง)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table profiles is 'โปรไฟล์ผู้ใช้ ต่อยอดจาก auth.users, เก็บ XP/Level และ role';

-- ============================================================================
-- 2. TERMS OF SERVICE ACCEPTANCE
-- ============================================================================
create table terms_versions (
  id uuid primary key default uuid_generate_v4(),
  version text not null unique,        -- e.g. 'v1.0-2569'
  content text not null,               -- markdown/text ของข้อกำหนดและเงื่อนไข
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table terms_acceptance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  terms_version_id uuid not null references terms_versions(id),
  accepted_at timestamptz not null default now(),
  unique (user_id, terms_version_id)
);

-- ============================================================================
-- 3. SUBCATEGORIES  (13+ หมวดวิชา ก.พ.)
-- ============================================================================
create table subject_groups (
  id text primary key,          -- e.g. 'MATH', 'REASON', 'THAI', 'ENGLISH', 'LAW'
  name text not null,           -- e.g. 'คณิตศาสตร์'
  icon text,                    -- emoji
  sort_order integer not null default 0
);

create table subcategories (
  id text primary key,          -- e.g. 'SC_M1', 'GPA_MATH'
  group_id text not null references subject_groups(id) on delete restrict,
  name text not null,           -- e.g. 'อนุกรม'
  icon text,
  is_gpa3 boolean not null default false,  -- ใช้เฉพาะโครงสร้าง ก.พ. ระดับ 3 หรือไม่
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. QUESTIONS  (คลังข้อสอบ)
-- ============================================================================
create table questions (
  id uuid primary key default uuid_generate_v4(),
  subcategory_id text not null references subcategories(id) on delete restrict,
  text text not null,
  passage text,                          -- โจทย์/เงื่อนไขประกอบ (ถ้ามี)
  choices jsonb not null,                -- ["ตัวเลือก ก","ข","ค","ง"]
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text not null,             -- คำอธิบายแบบ step-by-step
  difficulty smallint not null default 2 check (difficulty between 1 and 5),
  source_round exam_round not null default 'manual',
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  ai_generation_log_id uuid,             -- FK เพิ่มด้านล่างหลังสร้างตาราง ai_generation_logs
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table questions is 'คลังข้อสอบหลัก ก.พ. รวมข้อสอบจริงตามรอบสอบ + ข้อสอบที่สร้างด้วย AI';

-- ============================================================================
-- 5. EXAM SETS  (ชุดข้อสอบ)
-- ============================================================================
create table exam_sets (
  id uuid primary key default uuid_generate_v4(),
  slug text unique,                     -- e.g. 'SIM001', 'GPA3001'
  name text not null,
  description text,
  mode exam_mode not null default 'archive',
  question_count integer not null default 0,
  max_score integer not null default 0,
  pass_score integer not null default 0,
  pass_pct_label text,                  -- e.g. '60%'
  time_limit_minutes integer not null default 0,   -- 0 = ไม่จำกัดเวลา
  is_gpa3 boolean not null default false,
  source_round exam_round,
  is_published boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- เกณฑ์ผ่านแยกส่วน สำหรับชุด ก.พ. ระดับ 3 (200 คะแนน / 3 หมวดวิชา)
create table exam_set_sections (
  id uuid primary key default uuid_generate_v4(),
  exam_set_id uuid not null references exam_sets(id) on delete cascade,
  label text not null,                  -- e.g. 'วิชาความสามารถทั่วไป + ภาษาไทย'
  icon text,
  subcategory_ids text[] not null,      -- array ของ subcategories.id ที่รวมอยู่ในหมวดนี้
  question_count integer not null,
  max_score integer not null,
  pass_score integer not null,
  description text,
  fail_message text,                    -- คำแนะนำเมื่อสอบตกหมวดนี้
  sort_order integer not null default 0
);

-- ลำดับข้อสอบภายในชุด
create table exam_set_questions (
  id uuid primary key default uuid_generate_v4(),
  exam_set_id uuid not null references exam_sets(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  position integer not null,
  points numeric(6,2) not null default 2,
  unique (exam_set_id, question_id),
  unique (exam_set_id, position)
);

-- ============================================================================
-- 6. USER ATTEMPTS & ANSWERS  (ผลการทำข้อสอบ)
-- ============================================================================
create table user_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  exam_set_id uuid references exam_sets(id) on delete set null,
  mode exam_mode not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  elapsed_seconds integer,
  raw_score numeric(6,2),
  max_score numeric(6,2),
  passed boolean,
  passed_sections jsonb,          -- { section_id: true/false } สำหรับ GPA3
  created_at timestamptz not null default now()
);

create table user_answers (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references user_attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  selected_index smallint,        -- null = ไม่ตอบ
  is_flagged boolean not null default false,
  is_correct boolean,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ============================================================================
-- 7. AI GENERATION  (เครื่องกำเนิดข้อสอบ AI)
-- ============================================================================
create table ai_generation_logs (
  id uuid primary key default uuid_generate_v4(),
  requested_by uuid not null references profiles(id),
  subcategory_id text not null references subcategories(id),
  source_mode ai_source_mode not null,
  source_input text,               -- เนื้อหาบทความ / หัวข้อ / Google Sheet URL หรือ ID
  provider ai_provider not null default 'auto',
  provider_used text,              -- ผลลัพธ์จริงที่ใช้ ('gemini' | 'claude')
  prompt_used text,
  raw_response jsonb,
  generated_questions jsonb,       -- preview ก่อนบันทึก [{text,choices,correct_index,explanation}, ...]
  status generation_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table questions
  add constraint fk_questions_ai_log
  foreign key (ai_generation_log_id) references ai_generation_logs(id) on delete set null;

-- ============================================================================
-- 8. APP SETTINGS  (AI provider, API keys, admin password)
-- ============================================================================
-- หมายเหตุความปลอดภัย: ตารางนี้เข้าถึงได้เฉพาะผ่าน service_role (server-side)
-- ห้าม expose ผ่าน anon/authenticated key เด็ดขาด — ดู RLS ด้านล่าง (ปิดการเข้าถึงทั้งหมดสำหรับ client)
create table app_settings (
  id boolean primary key default true check (id),   -- บังคับให้มีแถวเดียว (singleton)
  ai_provider ai_provider not null default 'auto',
  gemini_api_key_encrypted text,     -- เข้ารหัสด้วย pgsodium หรือเก็บผ่าน Vercel env แทน (แนะนำ)
  claude_api_key_encrypted text,
  admin_password_hash text not null, -- ใช้ crypt() / bcrypt เก็บ hash เท่านั้น ห้ามเก็บ plaintext
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- ============================================================================
-- 9. AUDIT LOG  (สำหรับ DB export/import/reset ในแอดมิน)
-- ============================================================================
create table admin_audit_log (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references profiles(id),
  action text not null,             -- 'export_json' | 'import_json' | 'reset_bank' | 'delete_question' | ...
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
create index idx_questions_subcategory on questions(subcategory_id);
create index idx_questions_active on questions(is_active) where is_active = true;
create index idx_questions_source_round on questions(source_round);
create index idx_subcategories_group on subcategories(group_id);
create index idx_exam_set_questions_set on exam_set_questions(exam_set_id);
create index idx_exam_set_sections_set on exam_set_sections(exam_set_id);
create index idx_user_attempts_user on user_attempts(user_id);
create index idx_user_attempts_examset on user_attempts(exam_set_id);
create index idx_user_answers_attempt on user_answers(attempt_id);
create index idx_ai_logs_status on ai_generation_logs(status);
create index idx_exam_sets_slug on exam_sets(slug);
create index idx_exam_sets_mode on exam_sets(mode);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- updated_at auto-touch
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_questions_updated before update on questions
  for each row execute function set_updated_at();
create trigger trg_examsets_updated before update on exam_sets
  for each row execute function set_updated_at();

-- สร้าง profile อัตโนมัติเมื่อมี auth.users ใหม่ (เช่น สมัครด้วย Google)
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- XP & Level: เพิ่ม XP หลังส่งข้อสอบเสร็จ (finished_at ถูกตั้งค่า) และคำนวณ level แบบขั้นบันได
create or replace function award_xp_on_finish()
returns trigger language plpgsql security definer as $$
declare
  xp_gain integer;
  new_xp integer;
  new_level integer;
begin
  if new.finished_at is not null and old.finished_at is null then
    xp_gain := 20 + coalesce(round(new.raw_score)::integer, 0);
    update profiles set xp = xp + xp_gain where id = new.user_id
      returning xp into new_xp;
    -- ขั้นบันได level: level = floor(sqrt(xp / 50)) + 1
    new_level := floor(sqrt(new_xp::numeric / 50)) + 1;
    update profiles set level = new_level where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger trg_award_xp
  after update on user_attempts
  for each row execute function award_xp_on_finish();

-- helper: เช็คว่าเป็น admin หรือไม่ (ใช้ใน RLS)
create or replace function is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table profiles enable row level security;
alter table terms_versions enable row level security;
alter table terms_acceptance enable row level security;
alter table subject_groups enable row level security;
alter table subcategories enable row level security;
alter table questions enable row level security;
alter table exam_sets enable row level security;
alter table exam_set_sections enable row level security;
alter table exam_set_questions enable row level security;
alter table user_attempts enable row level security;
alter table user_answers enable row level security;
alter table ai_generation_logs enable row level security;
alter table app_settings enable row level security;
alter table admin_audit_log enable row level security;

-- ── profiles ──
create policy "profiles: self read" on profiles for select
  using (auth.uid() = id or is_admin());
create policy "profiles: self update" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: admin manage" on profiles for all
  using (is_admin()) with check (is_admin());

-- ── terms ──
create policy "terms: public read active" on terms_versions for select
  using (is_active = true or is_admin());
create policy "terms: admin write" on terms_versions for insert with check (is_admin());
create policy "terms: admin update" on terms_versions for update using (is_admin());

create policy "terms_acceptance: self insert" on terms_acceptance for insert
  with check (auth.uid() = user_id);
create policy "terms_acceptance: self read" on terms_acceptance for select
  using (auth.uid() = user_id or is_admin());

-- ── subject_groups / subcategories: อ่านได้ทุกคน, เขียนได้เฉพาะ admin ──
create policy "subject_groups: read all" on subject_groups for select using (true);
create policy "subject_groups: admin write" on subject_groups for insert with check (is_admin());
create policy "subject_groups: admin update" on subject_groups for update using (is_admin());
create policy "subject_groups: admin delete" on subject_groups for delete using (is_admin());

create policy "subcategories: read all" on subcategories for select using (true);
create policy "subcategories: admin write" on subcategories for insert with check (is_admin());
create policy "subcategories: admin update" on subcategories for update using (is_admin());
create policy "subcategories: admin delete" on subcategories for delete using (is_admin());

-- ── questions: ผู้ใช้ทั่วไปอ่านได้เฉพาะข้อ active, admin ทำได้ทุกอย่าง ──
create policy "questions: read active" on questions for select
  using (is_active = true or is_admin());
create policy "questions: admin insert" on questions for insert with check (is_admin());
create policy "questions: admin update" on questions for update using (is_admin());
create policy "questions: admin delete" on questions for delete using (is_admin());

-- ── exam_sets / sections / mapping: อ่านได้ทุกคนถ้า published, เขียนเฉพาะ admin ──
create policy "exam_sets: read published" on exam_sets for select
  using (is_published = true or is_admin());
create policy "exam_sets: admin insert" on exam_sets for insert with check (is_admin());
create policy "exam_sets: admin update" on exam_sets for update using (is_admin());
create policy "exam_sets: admin delete" on exam_sets for delete using (is_admin());

create policy "exam_set_sections: read all" on exam_set_sections for select using (true);
create policy "exam_set_sections: admin write" on exam_set_sections for insert with check (is_admin());
create policy "exam_set_sections: admin update" on exam_set_sections for update using (is_admin());
create policy "exam_set_sections: admin delete" on exam_set_sections for delete using (is_admin());

create policy "exam_set_questions: read all" on exam_set_questions for select using (true);
create policy "exam_set_questions: admin write" on exam_set_questions for insert with check (is_admin());
create policy "exam_set_questions: admin update" on exam_set_questions for update using (is_admin());
create policy "exam_set_questions: admin delete" on exam_set_questions for delete using (is_admin());

-- ── user_attempts / user_answers: เฉพาะเจ้าของ (+ admin อ่านได้เพื่อดูสถิติ) ──
create policy "attempts: self read" on user_attempts for select
  using (auth.uid() = user_id or is_admin());
create policy "attempts: self insert" on user_attempts for insert
  with check (auth.uid() = user_id);
create policy "attempts: self update" on user_attempts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "answers: self read" on user_answers for select
  using (
    exists (select 1 from user_attempts a where a.id = attempt_id and a.user_id = auth.uid())
    or is_admin()
  );
create policy "answers: self insert" on user_answers for insert
  with check (
    exists (select 1 from user_attempts a where a.id = attempt_id and a.user_id = auth.uid())
  );
create policy "answers: self update" on user_answers for update
  using (
    exists (select 1 from user_attempts a where a.id = attempt_id and a.user_id = auth.uid())
  );

-- ── ai_generation_logs: ผู้ใช้ทั่วไปเห็นของตัวเอง, admin เห็นหมด ──
create policy "ai_logs: self or admin read" on ai_generation_logs for select
  using (auth.uid() = requested_by or is_admin());
create policy "ai_logs: admin insert" on ai_generation_logs for insert
  with check (is_admin());
create policy "ai_logs: admin update" on ai_generation_logs for update
  using (is_admin());

-- ── app_settings: ปิดการเข้าถึงทั้งหมดผ่าน client keys ──
-- ไม่สร้าง policy ใด ๆ ที่อนุญาต anon/authenticated -> เข้าถึงได้เฉพาะผ่าน service_role
-- (service_role bypass RLS โดยธรรมชาติของ Supabase)
-- หากต้องการให้ admin UI อ่าน "provider ปัจจุบัน" ได้ ให้ทำผ่าน API route (Next.js server) ที่ใช้ service_role เท่านั้น

-- ── admin_audit_log: เฉพาะ admin ──
create policy "audit: admin read" on admin_audit_log for select using (is_admin());
create policy "audit: admin insert" on admin_audit_log for insert with check (is_admin());

-- ============================================================================
-- SEED DATA: 13 หมวดวิชา ก.พ. + subject_groups
-- ============================================================================
insert into subject_groups (id, name, icon, sort_order) values
  ('MATH',   'คณิตศาสตร์', '🧮', 1),
  ('REASON', 'เหตุผล',     '🧠', 2),
  ('THAI',   'ภาษาไทย',    '📝', 3),
  ('ENGLISH','ภาษาอังกฤษ', '🇬🇧', 4),
  ('LAW',    'กฎหมายและระเบียบราชการ', '⚖️', 5),
  ('GPA3',   'ก.พ. ระดับ 3', '🏅', 6);

insert into subcategories (id, group_id, name, icon, is_gpa3, sort_order) values
  ('SC_M1','MATH','คณิตศาสตร์พื้นฐาน','🔢',false,1),
  ('SC_M2','MATH','อนุกรม','📊',false,2),
  ('SC_M3','MATH','โจทย์ปัญหา','📐',false,3),
  ('SC_M4','MATH','สมการและอสมการ','✏️',false,4),
  ('SC_M5','MATH','ตารางและกราฟ','📈',false,5),
  ('SC_R1','REASON','เงื่อนไขสัญลักษณ์','🔣',false,1),
  ('SC_R2','REASON','เงื่อนไขภาษา','💬',false,2),
  ('SC_R3','REASON','ตรรกศาสตร์','🔍',false,3),
  ('SC_T1','THAI','การเรียงลำดับข้อความ','📝',false,1),
  ('SC_T2','THAI','การจับใจความสำคัญ','📖',false,2),
  ('SC_T3','THAI','อุปมาอุปไมย','🌿',false,3),
  ('SC_T4','THAI','การใช้คำและกลุ่มคำ','🗣️',false,4),
  ('SC_E1','ENGLISH','Conversation','💭',false,1),
  ('SC_E2','ENGLISH','Vocabulary','📚',false,2),
  ('SC_E3','ENGLISH','Grammar','✍️',false,3),
  ('SC_E4','ENGLISH','Reading Comprehension','📰',false,4),
  ('SC_L1','LAW','ความรู้การเป็นข้าราชการที่ดี','⚖️',false,1),
  ('SC_L2','LAW','พ.ร.บ.ระเบียบข้าราชการพลเรือน','📜',false,2),
  ('GPA_MATH','GPA3','การคิดวิเคราะห์เชิงนามธรรม+ปริมาณ','🧮',true,1),
  ('GPA_THAI','GPA3','ทักษะภาษาไทย','📝',true,2),
  ('GPA_ENG','GPA3','วิชาภาษาอังกฤษ','🇬🇧',true,3),
  ('GPA_LAW','GPA3','ความรู้และลักษณะการเป็นข้าราชการที่ดี','⚖️',true,4);

-- ============================================================================
-- SEED DATA: ชุดข้อสอบตัวอย่าง (โครงสร้าง ก.พ. ระดับ 3 + คลังรอบสอบ)
-- ============================================================================
insert into exam_sets (slug, name, mode, question_count, max_score, pass_score, pass_pct_label, time_limit_minutes, is_gpa3, source_round) values
  ('SIM001','วิชาความสามารถในการคิดวิเคราะห์','simulation',50,100,60,'60%',120,false,'manual'),
  ('SIM002','วิชาภาษาอังกฤษ','simulation',25,50,26,'50%',60,false,'manual'),
  ('SIM003','วิชาความรู้การเป็นข้าราชการที่ดี','simulation',25,50,30,'60%',60,false,'manual'),
  ('GPA3001','🏅 จำลองสนามจริง ก.พ. ระดับ 3 (200 คะแนน)','simulation',100,200,120,'60%',180,true,'manual'),
  ('EEXAM_20260426','E-EXAM 26 เม.ย. 2569','archive',15,30,18,'60%',30,false,'r2026_04_26'),
  ('EEXAM_20260522','E-EXAM 22 พ.ค. 2569','archive',15,30,18,'60%',30,false,'r2026_05_22'),
  ('EEXAM_20260523','E-EXAM 23 พ.ค. 2569','archive',15,30,18,'60%',30,false,'r2026_05_23'),
  ('EEXAM_20260524','E-EXAM 24 พ.ค. 2569','archive',15,30,18,'60%',30,false,'r2026_05_24');

-- เกณฑ์ผ่านแยกส่วน 3 หมวดวิชา สำหรับ GPA3001
insert into exam_set_sections (exam_set_id, label, icon, subcategory_ids, question_count, max_score, pass_score, description, fail_message, sort_order)
select id, 'วิชาความสามารถทั่วไป + ภาษาไทย', '🧮📝', array['GPA_MATH','GPA_THAI'], 50, 100, 60,
  '35 ข้อ (คณิตศาสตร์/เหตุผล/อุปมา) + 15 ข้อ (ภาษาไทย)',
  'แนะนำ: ทบทวนอนุกรม โจทย์ปัญหา การเรียงประโยค และการเลือกใช้คำ', 1
from exam_sets where slug = 'GPA3001';

insert into exam_set_sections (exam_set_id, label, icon, subcategory_ids, question_count, max_score, pass_score, description, fail_message, sort_order)
select id, 'วิชาภาษาอังกฤษ', '🇬🇧', array['GPA_ENG'], 25, 50, 25,
  'Conversation · Vocabulary · Grammar · Reading (25 ข้อ = 50 คะแนน)',
  'แนะนำ: เน้น Reading Comprehension + Grammar ให้ผ่านเกณฑ์ 50%', 2
from exam_sets where slug = 'GPA3001';

insert into exam_set_sections (exam_set_id, label, icon, subcategory_ids, question_count, max_score, pass_score, description, fail_message, sort_order)
select id, 'ความรู้และลักษณะการเป็นข้าราชการที่ดี', '⚖️', array['GPA_LAW'], 25, 50, 30,
  'กฎหมาย 6 ฉบับหลัก (25 ข้อ = 50 คะแนน) เกณฑ์ผ่าน 60%',
  'แนะนำ: ใช้ AI Explanation เพื่ออ่านสรุปมาตราที่มักออกสอบ', 3
from exam_sets where slug = 'GPA3001';

-- ============================================================================
-- SEED: app_settings singleton row (ตั้งรหัสผ่านแอดมินเริ่มต้น — ควรเปลี่ยนทันทีหลัง deploy)
-- หมายเหตุ: รหัสผ่านตัวอย่างในสเปคคือ "แอดมิน123" — เปลี่ยนใน production ก่อนใช้งานจริงเสมอ
-- ============================================================================
insert into app_settings (id, ai_provider, admin_password_hash)
values (true, 'auto', crypt('แอดมิน123', gen_salt('bf')));

-- ============================================================================
-- SEED: ข้อกำหนดและเงื่อนไขเวอร์ชันแรก (ตัวอย่าง — แก้ไขเนื้อหาจริงก่อนใช้งาน)
-- ============================================================================
insert into terms_versions (version, content, is_active) values (
  'v1.0-2569',
  'ข้อกำหนดและเงื่อนไขการใช้งานระบบคลังข้อสอบ ก.พ. E-EXAM 2569 (โปรดแก้ไขเนื้อหานี้ให้ตรงตามนโยบายจริงก่อนเผยแพร่)',
  true
);

-- ============================================================================
-- จบไฟล์ schema.sql
-- ============================================================================
