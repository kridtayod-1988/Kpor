<<<<<<< HEAD
// ชนิดข้อมูลหลัก — เขียนด้วยมือให้ตรงกับ schema.sql
// (ในโปรเจกต์จริงแนะนำให้ใช้ `supabase gen types typescript` เพื่อ generate อัตโนมัติแทน)

export type ExamMode = "simulation" | "practice" | "archive" | "workshop" | "category";
=======
// ชนิดข้อมูลหลัก — ปรับให้ตรงกับฐานข้อมูล Supabase "KPOR" ที่ใช้งานจริง
// (ต่างจากดีไซน์ตั้งต้น: ใช้ categories/exam_years แทน subcategories/exam_sets)

export type ExamMode = "full100" | "category" | "year";
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc

export type Profile = {
  id: string;
  display_name: string | null;
<<<<<<< HEAD
  avatar_url: string | null;
  role: "user" | "admin";
  xp: number;
  level: number;
};

export type ExamSet = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  mode: ExamMode;
  question_count: number;
  max_score: number;
  pass_score: number;
  pass_pct_label: string | null;
  time_limit_minutes: number;
  is_gpa3: boolean;
  is_published: boolean;
};

export type ExamSetSection = {
  id: string;
  exam_set_id: string;
  label: string;
  icon: string | null;
  subcategory_ids: string[];
  question_count: number;
  max_score: number;
  pass_score: number;
  description: string | null;
  fail_message: string | null;
};

export type Question = {
  id: string;
  subcategory_id: string;
  text: string;
  passage: string | null;
  choices: string[];
  correct_index: number;
  explanation: string;
  source_round: string;
};

export type UserAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_index: number | null;
  is_flagged: boolean;
  is_correct: boolean | null;
};

export type UserAttempt = {
  id: string;
  user_id: string;
  exam_set_id: string | null;
  mode: ExamMode;
  started_at: string;
  finished_at: string | null;
  elapsed_seconds: number | null;
  raw_score: number | null;
  max_score: number | null;
  passed: boolean | null;
  passed_sections: Record<string, boolean> | null;
=======
  email: string | null;
  role: "user" | "admin";
  photo_url: string | null;
  total_attempts: number;
  best_score: number;
  total_exp: number;
  last_attempt_at: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type ExamYear = {
  id: string;
  label: string;
  year: number;
  is_active: boolean;
};

export type SafeQuestion = {
  id: string;
  category_id: string;
  exam_year_id: string | null;
  question_text: string;
  table_data: Record<string, unknown> | null;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
};

export type QuestionRow = SafeQuestion & {
  correct_answer_index: number;
  explanation: string;
  is_active: boolean;
  source: "manual" | "ai_generated";
};

export type ExamAttempt = {
  id: string;
  user_id: string;
  mode: ExamMode;
  category_id: string | null;
  exam_year_id: string | null;
  question_ids: string[];
  user_answers: (number | null)[];
  flagged_question_ids: string[];
  instant_reveal: boolean;
  score: number;
  total_questions: number;
  exp_gained: number;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number;
};

export type ReviewRow = {
  question_id: string;
  category_id: string;
  question_text: string;
  table_data: Record<string, unknown> | null;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  selected_index: number | null;
  is_flagged: boolean;
  is_correct: boolean;
  question_position: number;
>>>>>>> 8e6b52aae4ec937f33fc407503a1baefdd10cefc
};

// Placeholder — แทนที่ด้วย generated types จาก Supabase CLI เมื่อพร้อม
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
