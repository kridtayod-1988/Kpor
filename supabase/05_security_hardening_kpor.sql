-- ============================================================================
-- 05_security_hardening_kpor.sql
-- Target: KPOR schema using user_attempts / user_answers / exam_set_questions.
--
-- Additive hardening only. Review the target project and take a database
-- backup before applying. This file has NOT been applied to any hosted DB.
-- ============================================================================
begin;

-- --------------------------------------------------------------------------
-- Harden SECURITY DEFINER profile/auth functions.
-- Empty search_path plus schema-qualified objects prevents temporary objects
-- or untrusted schemas from shadowing objects used by privileged functions.
-- --------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and role = 'admin'
  );
$function$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, display_name, full_name, phone, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$function$;

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if pg_catalog.current_setting('app.bypass_protect', true) = '1'
     or pg_catalog.pg_trigger_depth() > 1 then
    return new;
  end if;

  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.xp is distinct from old.xp
       or new.level is distinct from old.level
       or new.verification_status is distinct from old.verification_status
       or new.verification_note is distinct from old.verification_note
       or new.verified_at is distinct from old.verified_at
       or new.verified_by is distinct from old.verified_by
       or new.citizen_id_hash is distinct from old.citizen_id_hash
       or new.citizen_id_last4 is distinct from old.citizen_id_last4
       or new.registered_at is distinct from old.registered_at
       or new.exam_number is distinct from old.exam_number then
      raise exception 'ไม่มีสิทธิ์แก้ไขข้อมูลส่วนนี้';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.thai_citizen_id_valid(p text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $function$
declare
  s integer := 0;
  i integer;
begin
  if p is null or p !~ '^[0-9]{13}$' then
    return false;
  end if;

  for i in 1..12 loop
    s := s + substr(p, i, 1)::integer * (14 - i);
  end loop;

  return ((11 - (s % 11)) % 10) = substr(p, 13, 1)::integer;
end;
$function$;

create or replace function public.complete_registration(
  p_full_name text,
  p_phone text,
  p_citizen_id text,
  p_exam_number text,
  p_terms_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_pepper text;
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'กรุณาเข้าสู่ระบบ';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'กรุณากรอกชื่อ-นามสกุล';
  end if;
  if coalesce(p_phone, '') !~ '^0[0-9]{8,9}$' then
    raise exception 'เบอร์โทรไม่ถูกต้อง';
  end if;
  if not public.thai_citizen_id_valid(p_citizen_id) then
    raise exception 'เลขบัตรประชาชนไม่ถูกต้อง';
  end if;
  if not exists (
    select 1
      from public.terms_versions
     where id = p_terms_version_id
       and is_active
  ) then
    raise exception 'ต้องยอมรับเงื่อนไขการใช้งานและนโยบายข้อมูลส่วนบุคคล';
  end if;
  if exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and registered_at is not null
  ) then
    raise exception 'ลงทะเบียนแล้ว';
  end if;

  select value
    into v_pepper
    from public.app_secrets
   where key = 'citizen_pepper';

  if v_pepper is null or v_pepper = '' then
    raise exception 'ระบบลงทะเบียนยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ';
  end if;

  v_hash := pg_catalog.encode(
    extensions.hmac(p_citizen_id, v_pepper, 'sha256'),
    'hex'
  );

  if exists (
    select 1
      from public.profiles
     where citizen_id_hash = v_hash
       and id <> auth.uid()
  ) then
    raise exception 'เลขบัตรประชาชนนี้ถูกใช้ลงทะเบียนแล้ว';
  end if;

  perform pg_catalog.set_config('app.bypass_protect', '1', true);
  update public.profiles
     set full_name = trim(p_full_name),
         display_name = coalesce(display_name, trim(p_full_name)),
         phone = p_phone,
         citizen_id_hash = v_hash,
         citizen_id_last4 = right(p_citizen_id, 4),
         exam_number = nullif(trim(p_exam_number), ''),
         registered_at = now()
   where id = auth.uid();
  perform pg_catalog.set_config('app.bypass_protect', '0', true);

  insert into public.terms_acceptance (user_id, terms_version_id)
  values (auth.uid(), p_terms_version_id);
end;
$function$;

create or replace function public.submit_verification(
  p_doc_path text,
  p_selfie_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'กรุณาเข้าสู่ระบบ';
  end if;
  if not exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and registered_at is not null
  ) then
    raise exception 'กรุณากรอกข้อมูลลงทะเบียนให้ครบก่อน';
  end if;
  if coalesce(p_doc_path, '') not like auth.uid()::text || '/%'
     or coalesce(p_selfie_path, '') not like auth.uid()::text || '/%' then
    raise exception 'ไฟล์ไม่ถูกต้อง';
  end if;

  perform pg_catalog.set_config('app.bypass_protect', '1', true);
  insert into public.verification_requests (user_id, doc_path, selfie_path)
  values (auth.uid(), p_doc_path, p_selfie_path)
  returning id into v_id;

  update public.profiles
     set verification_status = 'pending',
         verification_note = null
   where id = auth.uid()
     and verification_status <> 'verified';
  perform pg_catalog.set_config('app.bypass_protect', '0', true);

  return v_id;
end;
$function$;

-- These helpers only use PostgreSQL built-ins and can use an empty path.
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.protect_profile_columns() from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Answer reveal: require the question to belong to this user's attempt.
-- --------------------------------------------------------------------------

create or replace function public.reveal_question_answer(
  p_question_id uuid,
  p_attempt_id uuid
)
returns table(correct_index smallint, explanation text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.user_attempts%rowtype;
begin
  select *
    into v_attempt
    from public.user_attempts
   where id = p_attempt_id
     and user_id = auth.uid();

  if not found then
    raise exception 'ไม่พบการทำข้อสอบนี้ หรือไม่มีสิทธิ์เข้าถึง';
  end if;

  if not exists (
    select 1
      from public.exam_set_questions esq
     where esq.exam_set_id = v_attempt.exam_set_id
       and esq.question_id = p_question_id
  ) then
    raise exception 'คำถามนี้ไม่ได้อยู่ในชุดข้อสอบของคุณ';
  end if;

  if v_attempt.mode is distinct from 'practice'
     and v_attempt.finished_at is null then
    raise exception 'ยังไม่สามารถดูเฉลยได้ในโหมดนี้จนกว่าจะส่งข้อสอบ';
  end if;

  return query
    select q.correct_index, q.explanation
      from public.questions q
     where q.id = p_question_id;
end;
$function$;

-- Remove implicit PUBLIC/anon execution on user-specific or admin-only RPCs.
-- Signed-in users retain access where the function also enforces ownership or
-- is_admin() internally. Trigger/event-trigger functions are not RPC endpoints.

revoke execute on function public.reveal_question_answer(uuid, uuid) from public, anon;
grant execute on function public.reveal_question_answer(uuid, uuid) to authenticated;

revoke execute on function public.submit_attempt(uuid) from public, anon;
grant execute on function public.submit_attempt(uuid) to authenticated;

revoke execute on function public.verify_admin_password(text) from public, anon;
grant execute on function public.verify_admin_password(text) to authenticated;

revoke execute on function public.update_admin_password(text) from public, anon;
grant execute on function public.update_admin_password(text) to authenticated;

revoke execute on function public.get_ai_settings() from public, anon;
grant execute on function public.get_ai_settings() to authenticated;

revoke execute on function public.update_ai_settings(public.ai_provider, text, text) from public, anon;
grant execute on function public.update_ai_settings(public.ai_provider, text, text) to authenticated;

revoke execute on function public.get_ai_keys_internal() from public, anon;
grant execute on function public.get_ai_keys_internal() to authenticated;

revoke execute on function public.get_question_bank_stats() from public, anon;
grant execute on function public.get_question_bank_stats() to authenticated;

revoke execute on function public.complete_registration(text, text, text, text, uuid) from public, anon;
grant execute on function public.complete_registration(text, text, text, text, uuid) to authenticated;

revoke execute on function public.submit_verification(text, text) from public, anon;
grant execute on function public.submit_verification(text, text) to authenticated;

revoke execute on function public.admin_reset_question_bank() from public, anon;
grant execute on function public.admin_reset_question_bank() to authenticated;

-- is_admin() is referenced by policies that also apply to the anon role.
-- Keep it callable, but grant explicitly rather than through PUBLIC.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Trigger/event-trigger functions should only be invoked by PostgreSQL triggers.
revoke execute on function public.award_xp_on_finish() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- Protect historical exam results: once a question has appeared in any
-- attempt, changing content would rewrite what previous users saw.
-- --------------------------------------------------------------------------

create or replace function public.prevent_used_question_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if row(
    new.subcategory_id,
    new.text,
    new.passage,
    new.choices,
    new.correct_index,
    new.explanation,
    new.difficulty,
    new.source_round,
    new.is_active,
    new.question_type,
    new.answer_data,
    new.media,
    new.content_format,
    new.bloom_level
  ) is distinct from row(
    old.subcategory_id,
    old.text,
    old.passage,
    old.choices,
    old.correct_index,
    old.explanation,
    old.difficulty,
    old.source_round,
    old.is_active,
    old.question_type,
    old.answer_data,
    old.media,
    old.content_format,
    old.bloom_level
  ) and exists (
    select 1
      from public.exam_set_questions esq
      join public.user_attempts ua on ua.exam_set_id = esq.exam_set_id
     where esq.question_id = old.id
  ) then
    raise exception 'ข้อสอบนี้มีประวัติการสอบแล้ว จึงแก้ไขไม่ได้ กรุณาสร้างข้อสอบใหม่แทน';
  end if;

  return new;
end;
$function$;

drop trigger if exists questions_prevent_used_edits on public.questions;
create trigger questions_prevent_used_edits
before update on public.questions
for each row execute function public.prevent_used_question_edits();

revoke execute on function public.prevent_used_question_edits() from public, anon, authenticated;


-- Starting an exam and editing its question map must serialize on the same
-- exam_sets row. The row lock prevents a concurrent builder write from racing
-- with the attempt snapshot.
create or replace function public.start_attempt(p_exam_set_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_set public.exam_sets%rowtype;
  v_attempt_id uuid;
  v_question_count integer;
  v_total_points numeric;
begin
  if auth.uid() is null then
    raise exception 'กรุณาเข้าสู่ระบบ';
  end if;

  select *
    into v_set
    from public.exam_sets
   where id = p_exam_set_id
     and (is_published or public.is_admin())
   for update;

  if not found then
    raise exception 'ไม่พบชุดข้อสอบ';
  end if;

  if v_set.mode <> 'practice'
     and not public.is_verified()
     and not public.is_admin() then
    raise exception 'ต้องยืนยันตัวตนให้สำเร็จก่อนเข้าสอบโหมดนี้';
  end if;

  select count(q.id), coalesce(sum(esq.points), 0)
    into v_question_count, v_total_points
    from public.exam_set_questions esq
    join public.questions q on q.id = esq.question_id
   where esq.exam_set_id = p_exam_set_id
     and q.is_active = true;

  if v_question_count = 0
     or v_question_count <> v_set.question_count
     or abs(v_total_points - v_set.max_score::numeric) > 0.0001 then
    raise exception 'ชุดข้อสอบยังจัดคำถามไม่ครบ หรือคะแนนรวมไม่ตรงกับคะแนนเต็ม';
  end if;

  insert into public.user_attempts (user_id, exam_set_id, mode)
  values (auth.uid(), p_exam_set_id, v_set.mode)
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$function$;

revoke execute on function public.start_attempt(uuid) from public, anon;
grant execute on function public.start_attempt(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- A started attempt freezes the question mapping, order, and points of a set.
-- The UI checks this too, but the trigger is the authoritative DB guard.
-- --------------------------------------------------------------------------

create or replace function public.prevent_used_exam_set_question_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_exam_set_id uuid;
begin
  if tg_op = 'UPDATE' then
    -- Lock parent rows in a deterministic order when a mapping is moved.
    if old.exam_set_id <= new.exam_set_id then
      perform 1 from public.exam_sets where id = old.exam_set_id for update;
      if new.exam_set_id is distinct from old.exam_set_id then
        perform 1 from public.exam_sets where id = new.exam_set_id for update;
      end if;
    else
      perform 1 from public.exam_sets where id = new.exam_set_id for update;
      perform 1 from public.exam_sets where id = old.exam_set_id for update;
    end if;

    if exists (
      select 1 from public.user_attempts where exam_set_id = old.exam_set_id
    ) or exists (
      select 1 from public.user_attempts where exam_set_id = new.exam_set_id
    ) then
      raise exception 'ชุดข้อสอบนี้มีประวัติการสอบแล้ว จึงเปลี่ยนคำถาม ลำดับ หรือคะแนนไม่ได้';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    v_exam_set_id := old.exam_set_id;
  else
    v_exam_set_id := new.exam_set_id;
  end if;

  -- Serialize INSERT/DELETE with start_attempt() on this parent row.
  perform 1 from public.exam_sets where id = v_exam_set_id for update;

  if exists (
    select 1
      from public.user_attempts
     where exam_set_id = v_exam_set_id
  ) then
    raise exception 'ชุดข้อสอบนี้มีประวัติการสอบแล้ว จึงเปลี่ยนคำถาม ลำดับ หรือคะแนนไม่ได้';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

drop trigger if exists exam_set_questions_prevent_used_changes on public.exam_set_questions;
create trigger exam_set_questions_prevent_used_changes
before insert or update or delete on public.exam_set_questions
for each row execute function public.prevent_used_exam_set_question_changes();

revoke execute on function public.prevent_used_exam_set_question_changes() from public, anon, authenticated;

-- Keep historical attempts attached to their original exam set. The existing
-- foreign key uses ON DELETE SET NULL, so block deletion before it can orphan
-- an attempt and its result history.
create or replace function public.prevent_used_exam_set_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1
      from public.user_attempts
     where exam_set_id = old.id
  ) then
    raise exception 'ชุดข้อสอบนี้มีประวัติการสอบแล้ว จึงลบไม่ได้';
  end if;
  return old;
end;
$function$;

drop trigger if exists exam_sets_prevent_used_deletion on public.exam_sets;
create trigger exam_sets_prevent_used_deletion
before delete on public.exam_sets
for each row execute function public.prevent_used_exam_set_deletion();

revoke execute on function public.prevent_used_exam_set_deletion() from public, anon, authenticated;
commit;
