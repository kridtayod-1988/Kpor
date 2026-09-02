-- ============================================================================
-- 04_adapt_existing_schema.sql
-- ไฟล์นี้ปรับใช้กับฐานข้อมูล Supabase "KPOR" ที่มีอยู่จริงแล้ว (มีข้อมูลคำถาม 117 ข้อ)
-- แทนที่ 02_scoring_functions.sql และ 03_admin_functions.sql เดิม (ซึ่งออกแบบไว้สำหรับ
-- schema คนละชุด — ตาราง exam_sets/subcategories/user_attempts ที่ไม่มีอยู่จริงในโปรเจกต์นี้)
--
-- ไฟล์นี้เป็นแบบ "เพิ่มเติม/แก้ไข policy" เท่านั้น ไม่ลบตารางหรือข้อมูลเดิม
-- ปลอดภัยต่อข้อมูลคำถาม 117 ข้อ, exam_years 2 แถว, categories 3 แถว ที่มีอยู่แล้ว
--
-- รันได้ครั้งเดียวใน Supabase SQL Editor ของโปรเจกต์ KPOR (mivyilrytsoncvolhhev)
-- ============================================================================

-- ============================================================================
-- ส่วนที่ 1: ปิดช่องโหว่เฉลยรั่ว (สำคัญที่สุด)
-- ============================================================================
-- policy เดิม "questions_select" อนุญาตให้ authenticated ทุกคนอ่านทั้งแถวของ questions
-- ได้ตรง ๆ ซึ่งรวม correct_answer_index และ explanation ด้วย — เปิด devtools แล้ว query
-- ตาราง questions เองก็เห็นเฉลยก่อนทำข้อสอบเสร็จได้เลย ต้องปิดช่องนี้ก่อนเปิดใช้งานจริง

drop policy if exists "questions_select" on questions;

create policy "questions_admin_select" on questions for select
  using (is_admin());

-- view ปลอดภัย ไม่มีเฉลย — ใช้ตอนทำข้อสอบ (ทุกโหมด)
create or replace view questions_public as
  select id, category_id, exam_year_id, question_text, table_data, options, difficulty
  from questions
  where is_active = true;

grant select on questions_public to authenticated;

-- ============================================================================
-- ส่วนที่ 2: ป้องกันการแก้ไข exam_attempts หลังส่งข้อสอบไปแล้ว
-- ============================================================================
-- policy เดิม "exam_attempts_update" อนุญาตให้เจ้าของแก้ไขได้เสมอ ไม่ว่าจะส่งไปแล้วหรือไม่
-- เพิ่มเงื่อนไข finished_at is null เพื่อล็อกไม่ให้แก้ไขคำตอบ/คะแนนหลังส่งข้อสอบแล้ว
-- (ฟังก์ชัน submit_exam_attempt ด้านล่างเป็น SECURITY DEFINER จึงยังตั้งค่า finished_at ได้
-- ตามปกติ เพราะฟังก์ชันประเภทนี้ทำงานด้วยสิทธิ์ของเจ้าของฟังก์ชันซึ่ง bypass RLS)

drop policy if exists "exam_attempts_update" on exam_attempts;

create policy "exam_attempts_update" on exam_attempts for update
  using ((select auth.uid()) = user_id and finished_at is null);

-- ============================================================================
-- ส่วนที่ 3: เพิ่มคอลัมน์ที่จำเป็น (additive เท่านั้น ไม่กระทบข้อมูลเดิม)
-- ============================================================================
alter table exam_attempts add column if not exists instant_reveal boolean not null default false;
alter table exam_attempts add column if not exists flagged_question_ids uuid[] not null default '{}';

alter table system_config add column if not exists admin_password_hash text;
alter table system_config add column if not exists ai_provider text not null default 'auto'
  check (ai_provider in ('auto', 'gemini', 'claude'));

-- ตั้งรหัสผ่านแอดมินเริ่มต้น "แอดมิน123" เฉพาะกรณียังไม่เคยตั้งไว้ (ไม่ทับของเดิมถ้ามีอยู่แล้ว)
update system_config
set admin_password_hash = crypt('แอดมิน123', gen_salt('bf'))
where key = 'secrets' and admin_password_hash is null;

-- ============================================================================
-- ส่วนที่ 4: ตารางใหม่ (additive) — ข้อกำหนดและเงื่อนไข + log การสร้างข้อสอบด้วย AI
-- ============================================================================
create table if not exists terms_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists terms_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version_id uuid not null references terms_versions(id),
  accepted_at timestamptz not null default now(),
  unique (user_id, terms_version_id)
);

alter table terms_versions enable row level security;
alter table terms_acceptance enable row level security;

drop policy if exists "terms_versions_select" on terms_versions;
create policy "terms_versions_select" on terms_versions for select using (is_active = true or is_admin());

drop policy if exists "terms_acceptance_self" on terms_acceptance;
create policy "terms_acceptance_self_insert" on terms_acceptance for insert with check ((select auth.uid()) = user_id);
create policy "terms_acceptance_self_select" on terms_acceptance for select using ((select auth.uid()) = user_id or is_admin());

insert into terms_versions (version, content, is_active)
select 'v1.0-2569', 'ข้อกำหนดและเงื่อนไขการใช้งานระบบคลังข้อสอบ ก.พ. E-EXAM 2569 (โปรดแก้ไขเนื้อหานี้ให้ตรงตามนโยบายจริงก่อนเผยแพร่)', true
where not exists (select 1 from terms_versions);

create table if not exists ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id),
  category_id uuid not null references categories(id),
  source_mode text not null check (source_mode in ('article', 'topic', 'google_sheet')),
  source_input text,
  provider_used text,
  generated_questions jsonb,
  status text not null default 'generating' check (status in ('generating', 'preview', 'saved', 'discarded', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table ai_generation_logs enable row level security;
drop policy if exists "ai_logs_admin" on ai_generation_logs;
create policy "ai_logs_admin" on ai_generation_logs for all using (is_admin()) with check (is_admin());

alter table questions add column if not exists ai_generation_log_id uuid references ai_generation_logs(id) on delete set null;

-- ============================================================================
-- ส่วนที่ 5: ฟังก์ชันเริ่มทำข้อสอบ — สุ่มคำถามแบบไม่ซ้ำของเดิม (ใช้ user_seen_questions)
-- ============================================================================
create or replace function start_attempt(
  p_mode text,
  p_category_id uuid default null,
  p_exam_year_id uuid default null,
  p_instant_reveal boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_want_count int;
  v_seen uuid[];
  v_ids uuid[];
  v_attempt_id uuid;
  v_answers int[];
begin
  if v_uid is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;
  if p_mode not in ('full100', 'category', 'year') then
    raise exception 'โหมดไม่ถูกต้อง';
  end if;

  select case p_mode when 'full100' then full_exam_question_count else 20 end
  into v_want_count
  from system_config where key = 'public';
  v_want_count := coalesce(v_want_count, 20);

  select seen_question_ids into v_seen from user_seen_questions where user_id = v_uid;
  v_seen := coalesce(v_seen, '{}');

  -- พยายามสุ่มจากข้อที่ยังไม่เคยเจอก่อน
  select array_agg(id) into v_ids from (
    select id from questions
    where is_active = true
      and (p_category_id is null or category_id = p_category_id)
      and (p_exam_year_id is null or exam_year_id = p_exam_year_id)
      and not (id = any(v_seen))
    order by random()
    limit v_want_count
  ) sub;

  -- ถ้าไม่พอ (ทำครบทุกข้อในหมวดนี้แล้ว) ให้รีเซ็ต seen แล้วสุ่มใหม่จากทั้งหมด
  if v_ids is null or array_length(v_ids, 1) < least(v_want_count, (
      select count(*) from questions where is_active = true
        and (p_category_id is null or category_id = p_category_id)
        and (p_exam_year_id is null or exam_year_id = p_exam_year_id)
    ))
  then
    select array_agg(id) into v_ids from (
      select id from questions
      where is_active = true
        and (p_category_id is null or category_id = p_category_id)
        and (p_exam_year_id is null or exam_year_id = p_exam_year_id)
      order by random()
      limit v_want_count
    ) sub;
    v_seen := '{}';
  end if;

  if v_ids is null or array_length(v_ids, 1) = 0 then
    raise exception 'ไม่พบข้อสอบที่ตรงกับเงื่อนไขที่เลือก';
  end if;

  v_answers := array_fill(null::int, array[array_length(v_ids, 1)]);

  insert into exam_attempts (user_id, mode, category_id, exam_year_id, question_ids, user_answers, total_questions, instant_reveal)
  values (v_uid, p_mode, p_category_id, p_exam_year_id, v_ids, v_answers, array_length(v_ids, 1), p_instant_reveal)
  returning id into v_attempt_id;

  insert into user_seen_questions (user_id, seen_question_ids, last_reset_at)
  values (v_uid, v_seen || v_ids, now())
  on conflict (user_id) do update
    set seen_question_ids = (
      select array_agg(distinct x) from unnest(user_seen_questions.seen_question_ids || excluded.seen_question_ids) as x
    ),
    last_reset_at = case when array_length(v_seen, 1) is null then now() else user_seen_questions.last_reset_at end;

  return v_attempt_id;
end;
$$;

grant execute on function start_attempt(text, uuid, uuid, boolean) to authenticated;

-- ============================================================================
-- ส่วนที่ 6: บันทึกคำตอบ/ตั้งธงระหว่างทำข้อสอบ
-- ============================================================================
create or replace function save_attempt_answer(p_attempt_id uuid, p_question_id uuid, p_selected_index int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pos int;
begin
  select idx into v_pos from exam_attempts, unnest(question_ids) with ordinality as u(qid, idx)
    where exam_attempts.id = p_attempt_id
      and exam_attempts.user_id = auth.uid()
      and exam_attempts.finished_at is null
      and u.qid = p_question_id;

  if v_pos is null then
    raise exception 'ไม่พบคำถามนี้ในชุดข้อสอบ หรือส่งข้อสอบไปแล้ว';
  end if;

  update exam_attempts set user_answers[v_pos] = p_selected_index where id = p_attempt_id;
end;
$$;

grant execute on function save_attempt_answer(uuid, uuid, int) to authenticated;

create or replace function toggle_attempt_flag(p_attempt_id uuid, p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update exam_attempts
  set flagged_question_ids = case
    when p_question_id = any(flagged_question_ids)
      then array_remove(flagged_question_ids, p_question_id)
    else flagged_question_ids || p_question_id
  end
  where id = p_attempt_id and user_id = auth.uid() and finished_at is null;
end;
$$;

grant execute on function toggle_attempt_flag(uuid, uuid) to authenticated;

-- ============================================================================
-- ส่วนที่ 7: เปิดเฉลยทีละข้อ (โหมดฝึกพร้อมเฉลยทันที / หรือหลังส่งข้อสอบแล้ว)
-- ============================================================================
create or replace function reveal_question_answer(p_question_id uuid, p_attempt_id uuid)
returns table (correct_answer_index int, explanation text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
begin
  select * into v_attempt from exam_attempts where id = p_attempt_id and user_id = auth.uid();
  if not found then
    raise exception 'ไม่พบการทำข้อสอบนี้ หรือไม่มีสิทธิ์เข้าถึง';
  end if;
  if not v_attempt.instant_reveal and v_attempt.finished_at is null then
    raise exception 'ยังไม่สามารถดูเฉลยได้จนกว่าจะส่งข้อสอบ';
  end if;

  return query select q.correct_answer_index, q.explanation from questions q where q.id = p_question_id;
end;
$$;

grant execute on function reveal_question_answer(uuid, uuid) to authenticated;

-- ============================================================================
-- ส่วนที่ 8: ส่งข้อสอบและคำนวณคะแนนฝั่ง server
-- ============================================================================
create or replace function submit_exam_attempt(p_attempt_id uuid)
returns table (score int, total_questions int, exp_gained int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_correct int := 0;
  v_exp int;
begin
  select * into v_attempt from exam_attempts where id = p_attempt_id and user_id = auth.uid();
  if not found then
    raise exception 'ไม่พบการทำข้อสอบนี้ หรือไม่มีสิทธิ์เข้าถึง';
  end if;
  if v_attempt.finished_at is not null then
    raise exception 'ข้อสอบชุดนี้ถูกส่งไปแล้ว';
  end if;

  select count(*) into v_correct
  from unnest(v_attempt.question_ids) with ordinality as u(qid, idx)
  join questions q on q.id = u.qid
  where v_attempt.user_answers[u.idx] is not null
    and v_attempt.user_answers[u.idx] = q.correct_answer_index;

  v_exp := 10 + v_correct * 2;

  update exam_attempts
  set score = v_correct,
      exp_gained = v_exp,
      finished_at = now(),
      duration_seconds = extract(epoch from (now() - v_attempt.started_at))::int
  where id = p_attempt_id;

  update profiles
  set total_attempts = total_attempts + 1,
      best_score = greatest(best_score, v_correct),
      total_exp = total_exp + v_exp,
      last_attempt_at = now()
  where id = v_attempt.user_id;

  return query select v_correct, v_attempt.total_questions, v_exp;
end;
$$;

grant execute on function submit_exam_attempt(uuid) to authenticated;

-- ============================================================================
-- ส่วนที่ 9: ดึงข้อมูลตรวจทานคำตอบหลังส่งข้อสอบแล้ว (หน้าผลสอบ)
-- ============================================================================
create or replace function get_attempt_review(p_attempt_id uuid)
returns table (
  question_id uuid,
  category_id uuid,
  question_text text,
  table_data jsonb,
  options text[],
  correct_answer_index int,
  explanation text,
  selected_index int,
  is_flagged boolean,
  is_correct boolean,
  question_position int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
begin
  select * into v_attempt from exam_attempts where id = p_attempt_id and user_id = auth.uid();
  if not found then
    raise exception 'ไม่พบการทำข้อสอบนี้ หรือไม่มีสิทธิ์เข้าถึง';
  end if;
  if v_attempt.finished_at is null then
    raise exception 'ยังไม่ได้ส่งข้อสอบชุดนี้';
  end if;

  return query
    select
      q.id, q.category_id, q.question_text, q.table_data, q.options, q.correct_answer_index, q.explanation,
      v_attempt.user_answers[u.idx],
      (u.qid = any(v_attempt.flagged_question_ids)),
      (v_attempt.user_answers[u.idx] is not null and v_attempt.user_answers[u.idx] = q.correct_answer_index),
      u.idx::int
    from unnest(v_attempt.question_ids) with ordinality as u(qid, idx)
    join questions q on q.id = u.qid
    order by u.idx;
end;
$$;

grant execute on function get_attempt_review(uuid) to authenticated;

-- ============================================================================
-- ส่วนที่ 10: ฟังก์ชันสำหรับ Admin Panel
-- ============================================================================
create or replace function verify_admin_password(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if not is_admin() then return false; end if;
  select admin_password_hash into v_hash from system_config where key = 'secrets';
  if v_hash is null then return false; end if;
  return crypt(p_password, v_hash) = v_hash;
end;
$$;

grant execute on function verify_admin_password(text) to authenticated;

create or replace function update_admin_password(p_new_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น'; end if;
  if length(p_new_password) < 6 then raise exception 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'; end if;
  update system_config set admin_password_hash = crypt(p_new_password, gen_salt('bf')) where key = 'secrets';
end;
$$;

grant execute on function update_admin_password(text) to authenticated;

create or replace function get_question_bank_stats()
returns table (category_id uuid, category_name text, question_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น'; end if;
  return query
    select c.id, c.name, count(q.id)
    from categories c
    left join questions q on q.category_id = c.id and q.is_active = true
    group by c.id, c.name, c.sort_order
    order by c.sort_order;
end;
$$;

grant execute on function get_question_bank_stats() to authenticated;

-- ⚠️ อันตราย: ลบคำถามทั้งหมดในคลัง (มี 117 ข้ออยู่ในปัจจุบัน) ใช้เฉพาะกรณีจำเป็นจริง ๆ
create or replace function admin_reset_question_bank()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น'; end if;
  delete from exam_attempts;
  delete from user_seen_questions;
  delete from questions;
end;
$$;

grant execute on function admin_reset_question_bank() to authenticated;

-- ============================================================================
-- จบไฟล์ 04_adapt_existing_schema.sql
-- ============================================================================
