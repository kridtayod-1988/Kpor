-- ============================================================================
-- 03_admin_functions.sql
-- รันหลังจาก schema.sql และ 02_scoring_functions.sql
-- ฟังก์ชันสำหรับ Admin Panel: ตรวจรหัสผ่านแอดมิน, จัดการ AI settings, รีเซ็ตคลังข้อสอบ
-- ทุกฟังก์ชันเช็ค is_admin() ภายในตัวเอง (SECURITY DEFINER) จึงไม่ต้องใช้ service role key
-- ============================================================================

-- ── ตรวจรหัสผ่านแอดมิน (ใช้ตอนกด ⚙️ เพื่อปลดล็อก Admin Panel) ──────────────
create or replace function verify_admin_password(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  if not is_admin() then
    return false;
  end if;

  select admin_password_hash into v_hash from app_settings where id = true;
  if v_hash is null then
    return false;
  end if;

  return crypt(p_password, v_hash) = v_hash;
end;
$$;

grant execute on function verify_admin_password(text) to authenticated;

-- ── เปลี่ยนรหัสผ่านแอดมิน ──────────────────────────────────────────────────
create or replace function update_admin_password(p_new_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น';
  end if;
  if length(p_new_password) < 6 then
    raise exception 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
  end if;

  update app_settings
  set admin_password_hash = crypt(p_new_password, gen_salt('bf')), updated_at = now(), updated_by = auth.uid()
  where id = true;
end;
$$;

grant execute on function update_admin_password(text) to authenticated;

-- ── อ่านค่า AI provider ปัจจุบัน (ไม่คืนค่า API key) ─────────────────────────
create or replace function get_ai_settings()
returns table (ai_provider ai_provider, has_gemini_key boolean, has_claude_key boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น';
  end if;

  return query
    select s.ai_provider, (s.gemini_api_key_encrypted is not null), (s.claude_api_key_encrypted is not null)
    from app_settings s where s.id = true;
end;
$$;

grant execute on function get_ai_settings() to authenticated;

-- ── บันทึกค่า AI provider / API keys (ส่ง null หรือ '' = ไม่แก้ไขคีย์เดิม) ───
create or replace function update_ai_settings(
  p_provider ai_provider,
  p_gemini_key text default null,
  p_claude_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น';
  end if;

  update app_settings
  set
    ai_provider = p_provider,
    gemini_api_key_encrypted = case when p_gemini_key is null or p_gemini_key = '' then gemini_api_key_encrypted else p_gemini_key end,
    claude_api_key_encrypted = case when p_claude_key is null or p_claude_key = '' then claude_api_key_encrypted else p_claude_key end,
    updated_at = now(),
    updated_by = auth.uid()
  where id = true;
end;
$$;

grant execute on function update_ai_settings(ai_provider, text, text) to authenticated;

-- ── อ่านค่า AI keys จริง (ใช้เฉพาะฝั่ง server ใน Route Handler เครื่องกำเนิด AI) ──
-- หมายเหตุ: แม้ grant ให้ authenticated แต่ฟังก์ชันเช็ค is_admin() เอง จึงเรียกได้เฉพาะแอดมิน
-- ควรเรียกจาก Server Component/Route Handler เท่านั้น อย่าเรียกจาก client โดยตรง
create or replace function get_ai_keys_internal()
returns table (ai_provider ai_provider, gemini_key text, claude_key text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น';
  end if;

  return query
    select s.ai_provider, s.gemini_api_key_encrypted, s.claude_api_key_encrypted
    from app_settings s where s.id = true;
end;
$$;

grant execute on function get_ai_keys_internal() to authenticated;

-- ── สถิติภาพรวมคลังข้อสอบ (สำหรับแท็บ 📊 ภาพรวม) ───────────────────────────
create or replace function get_question_bank_stats()
returns table (subcategory_id text, subcategory_name text, group_name text, question_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น';
  end if;

  return query
    select sc.id, sc.name, sg.name, count(q.id)
    from subcategories sc
    left join subject_groups sg on sg.id = sc.group_id
    left join questions q on q.subcategory_id = sc.id and q.is_active = true
    group by sc.id, sc.name, sg.name, sc.sort_order
    order by sc.sort_order;
end;
$$;

grant execute on function get_question_bank_stats() to authenticated;

-- ── รีเซ็ตคลังข้อสอบ (ลบคำถามทั้งหมด + การ mapping ในชุดข้อสอบ) ────────────
-- หมายเหตุ: ไม่ลบ exam_sets/subcategories/subject_groups เพื่อคงโครงสร้างไว้
create or replace function admin_reset_question_bank()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'ต้องเป็นผู้ดูแลระบบเท่านั้น';
  end if;

  delete from exam_set_questions;
  delete from user_answers;
  delete from questions;

  insert into admin_audit_log (admin_id, action, details)
  values (auth.uid(), 'reset_bank', jsonb_build_object('at', now()));
end;
$$;

grant execute on function admin_reset_question_bank() to authenticated;

-- ============================================================================
-- จบไฟล์ 03_admin_functions.sql
-- ============================================================================
