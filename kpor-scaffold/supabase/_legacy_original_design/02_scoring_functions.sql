-- ============================================================================
-- 02_scoring_functions.sql
-- รันไฟล์นี้ใน Supabase SQL Editor "หลังจาก" schema.sql แล้วเท่านั้น
-- ฟังก์ชันคำนวณคะแนนฝั่ง server (SECURITY DEFINER) — ป้องกันผู้ใช้แก้ไขคะแนนจาก client
-- ============================================================================

-- ── ฟังก์ชัน: บันทึก/แก้ไขคำตอบทีละข้อระหว่างทำข้อสอบ ──────────────────────
-- ใช้แทนการ insert/update user_answers ตรง ๆ จาก client เพื่อรวม logic ไว้ที่เดียว
create or replace function upsert_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_index smallint,
  p_is_flagged boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from user_attempts
    where id = p_attempt_id and user_id = auth.uid() and finished_at is null
  ) then
    raise exception 'ไม่พบการทำข้อสอบนี้ หรือส่งข้อสอบไปแล้ว';
  end if;

  insert into user_answers (attempt_id, question_id, selected_index, is_flagged, answered_at)
  values (p_attempt_id, p_question_id, p_selected_index, p_is_flagged, now())
  on conflict (attempt_id, question_id)
  do update set
    selected_index = excluded.selected_index,
    is_flagged = excluded.is_flagged,
    answered_at = now();
end;
$$;

grant execute on function upsert_answer(uuid, uuid, smallint, boolean) to authenticated;

-- ── ฟังก์ชัน: ส่งข้อสอบและคำนวณคะแนนทั้งหมดฝั่ง server ──────────────────────
create or replace function submit_attempt(p_attempt_id uuid)
returns table (
  raw_score numeric,
  max_score numeric,
  passed boolean,
  passed_sections jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_exam_set record;
  v_raw_score numeric := 0;
  v_max_score numeric := 0;
  v_passed boolean;
  v_passed_sections jsonb := '{}'::jsonb;
  v_section record;
  v_section_score numeric;
  v_all_sections_passed boolean := true;
begin
  select * into v_attempt from user_attempts
    where id = p_attempt_id and user_id = auth.uid();

  if not found then
    raise exception 'ไม่พบการทำข้อสอบนี้ หรือไม่มีสิทธิ์เข้าถึง';
  end if;

  if v_attempt.finished_at is not null then
    raise exception 'ข้อสอบชุดนี้ถูกส่งไปแล้ว';
  end if;

  -- ทำเครื่องหมายถูก/ผิดในทุกคำตอบของ attempt นี้
  update user_answers ua
  set is_correct = (ua.selected_index is not null and ua.selected_index = q.correct_index)
  from questions q
  where ua.question_id = q.id and ua.attempt_id = p_attempt_id;

  if v_attempt.exam_set_id is not null then
    select * into v_exam_set from exam_sets where id = v_attempt.exam_set_id;
  end if;

  -- คะแนนดิบ: ใช้คะแนนต่อข้อจาก exam_set_questions ถ้ามี ไม่งั้น default 2 คะแนน/ข้อ
  select
    coalesce(sum(case when ua.is_correct then coalesce(esq.points, 2) else 0 end), 0),
    coalesce(sum(coalesce(esq.points, 2)), 0)
  into v_raw_score, v_max_score
  from user_answers ua
  left join exam_set_questions esq
    on esq.exam_set_id = v_attempt.exam_set_id and esq.question_id = ua.question_id
  where ua.attempt_id = p_attempt_id;

  if v_exam_set.max_score is not null and v_exam_set.max_score > 0 then
    v_max_score := v_exam_set.max_score;
  end if;

  -- GPA3: ต้องผ่านทุกหมวดพร้อมกัน คำนวณแยกตาม subcategory_ids ของแต่ละ section
  if v_exam_set.is_gpa3 then
    for v_section in
      select * from exam_set_sections where exam_set_id = v_attempt.exam_set_id order by sort_order
    loop
      select coalesce(sum(case when ua.is_correct then coalesce(esq.points, 2) else 0 end), 0)
      into v_section_score
      from user_answers ua
      join questions q on q.id = ua.question_id
      left join exam_set_questions esq
        on esq.exam_set_id = v_attempt.exam_set_id and esq.question_id = ua.question_id
      where ua.attempt_id = p_attempt_id
        and q.subcategory_id = any(v_section.subcategory_ids);

      v_passed_sections := v_passed_sections || jsonb_build_object(v_section.id::text, v_section_score >= v_section.pass_score);
      if v_section_score < v_section.pass_score then
        v_all_sections_passed := false;
      end if;
    end loop;

    v_passed := v_all_sections_passed;
  else
    v_passed := v_raw_score >= coalesce(v_exam_set.pass_score, 0);
  end if;

  update user_attempts
  set
    finished_at = now(),
    elapsed_seconds = extract(epoch from (now() - v_attempt.started_at))::integer,
    raw_score = v_raw_score,
    max_score = v_max_score,
    passed = v_passed,
    passed_sections = v_passed_sections
  where id = p_attempt_id;

  return query select v_raw_score, v_max_score, v_passed, v_passed_sections;
end;
$$;

grant execute on function submit_attempt(uuid) to authenticated;

-- ============================================================================
-- ความปลอดภัยของเฉลย: ป้องกันไม่ให้ผู้ใช้ดู correct_index/explanation
-- ระหว่างทำข้อสอบผ่าน REST API ตรง ๆ (เช่นเปิด devtools แล้ว query ตาราง questions เอง)
-- ============================================================================

-- 1) ปิดสิทธิ์ผู้ใช้ทั่วไปอ่านตาราง questions ทั้งแถวโดยตรง (เหลือเฉพาะ admin)
drop policy if exists "questions: read active" on questions;
create policy "questions: admin only select" on questions for select
  using (is_admin());

-- 2) View ที่ปลอดภัย — มีเฉพาะคอลัมน์ที่ใช้แสดงตอนทำข้อสอบ (ไม่มีเฉลย)
create or replace view questions_public as
  select id, subcategory_id, text, passage, choices
  from questions
  where is_active = true;

grant select on questions_public to authenticated;

-- 3) ฟังก์ชันเปิดเฉลยทีละข้อ — ใช้ในโหมด practice (เฉลยทันที) หรือหลังส่งข้อสอบแล้วเท่านั้น
create or replace function reveal_question_answer(p_question_id uuid, p_attempt_id uuid)
returns table (correct_index smallint, explanation text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
begin
  select * into v_attempt from user_attempts
    where id = p_attempt_id and user_id = auth.uid();

  if not found then
    raise exception 'ไม่พบการทำข้อสอบนี้ หรือไม่มีสิทธิ์เข้าถึง';
  end if;

  if v_attempt.mode <> 'practice' and v_attempt.finished_at is null then
    raise exception 'ยังไม่สามารถดูเฉลยได้ในโหมดนี้จนกว่าจะส่งข้อสอบ';
  end if;

  return query
    select q.correct_index, q.explanation from questions q where q.id = p_question_id;
end;
$$;

grant execute on function reveal_question_answer(uuid, uuid) to authenticated;

-- 4) ฟังก์ชันดึงข้อมูลตรวจทานคำตอบทั้งชุดหลังส่งข้อสอบแล้ว (หน้าผลสอบ)
create or replace function get_attempt_review(p_attempt_id uuid)
returns table (
  question_id uuid,
  subcategory_id text,
  text text,
  passage text,
  choices jsonb,
  correct_index smallint,
  explanation text,
  selected_index smallint,
  is_flagged boolean,
  is_correct boolean,
  question_position integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
begin
  select * into v_attempt from user_attempts
    where id = p_attempt_id and user_id = auth.uid();

  if not found then
    raise exception 'ไม่พบการทำข้อสอบนี้ หรือไม่มีสิทธิ์เข้าถึง';
  end if;

  if v_attempt.finished_at is null then
    raise exception 'ยังไม่ได้ส่งข้อสอบชุดนี้';
  end if;

  return query
    select
      q.id, q.subcategory_id, q.text, q.passage, q.choices, q.correct_index, q.explanation,
      ua.selected_index, ua.is_flagged, ua.is_correct,
      coalesce(esq.position, 0) as question_position
    from user_answers ua
    join questions q on q.id = ua.question_id
    left join exam_set_questions esq
      on esq.exam_set_id = v_attempt.exam_set_id and esq.question_id = q.id
    where ua.attempt_id = p_attempt_id
    order by question_position, q.id;
end;
$$;

grant execute on function get_attempt_review(uuid) to authenticated;

-- ============================================================================
-- จบไฟล์ 02_scoring_functions.sql
-- ============================================================================
