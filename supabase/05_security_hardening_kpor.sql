-- ============================================================================
-- 05_security_hardening_kpor.sql
-- Target: KPOR schema using user_attempts / user_answers / exam_set_questions.
--
-- This migration is intentionally additive: it does not drop tables or rows.
-- Review the target project and take a database backup before applying it.
-- ============================================================================
begin;

-- A user may only reveal an answer for a question that belongs to THEIR
-- attempt. The previous function checked attempt ownership but accepted any
-- question UUID, which could expose answers from unrelated exam sets.
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

  if v_attempt.mode <> 'practice' and v_attempt.finished_at is null then
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
-- is_admin() internally. Event-trigger/trigger functions are not RPC endpoints.
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

commit;
