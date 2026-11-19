#!/usr/bin/env node
/**
 * Dry-run-first migration helper for the 100 questions in kp-exam-v4.
 *
 * Default: read-only validation and report.
 * Apply:   node scripts/migrate-kp-exam-v4-questions.mjs --apply-bank
 *
 * --apply-bank inserts only inactive draft questions into the KPOR question
 * bank. It does NOT create exam_set_questions, change exam_sets, activate
 * questions, or migrate old users/attempts. This keeps placeholder
 * explanations away from real examinees until content review is complete.
 */

import { createClient } from "@supabase/supabase-js";

const SOURCE_URL = process.env.SUPABASE_SOURCE_URL;
const SOURCE_KEY = process.env.SUPABASE_SOURCE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.SUPABASE_TARGET_URL;
const TARGET_KEY = process.env.SUPABASE_TARGET_SERVICE_ROLE_KEY;
const APPLY_BANK = process.argv.includes("--apply-bank");

const SOURCE_CATEGORY_TO_TARGET = {
  "ภาษาอังกฤษ": "GPA_ENG",
  "การเป็นข้าราชการที่ดี": "GPA_LAW",
};

const DIFFICULTY_MAP = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const EXPECTED_COUNTS = {
  GPA_MATH: 24,
  GPA_THAI: 26,
  GPA_ENG: 25,
  GPA_LAW: 25,
};

const EXPECTED_SECTIONS = [
  {
    subcategory_ids: ["GPA_MATH", "GPA_THAI"],
    question_count: 50,
    max_score: 100,
    pass_score: 60,
  },
  {
    subcategory_ids: ["GPA_ENG"],
    question_count: 25,
    max_score: 50,
    pass_score: 25,
  },
  {
    subcategory_ids: ["GPA_LAW"],
    question_count: 25,
    max_score: 50,
    pass_score: 30,
  },
];

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().toLocaleLowerCase("th-TH");
}

function mapSubcategory(question) {
  const categoryName = question.category?.name;

  if (categoryName === "ความสามารถทั่วไป") {
    if (question.cat === "math" && /^SC_M[0-9]+$/.test(question.sub ?? "")) {
      return "GPA_MATH";
    }
    if (question.cat === "thai" && /^SC_T[0-9]+$/.test(question.sub ?? "")) {
      return "GPA_THAI";
    }
    return null;
  }

  return SOURCE_CATEGORY_TO_TARGET[categoryName] ?? null;
}

function checkSectionShape(sections) {
  const actual = sections
    .map((section) => ({
      subcategory_ids: [...(section.subcategory_ids ?? [])].sort(),
      question_count: Number(section.question_count),
      max_score: Number(section.max_score),
      pass_score: Number(section.pass_score),
    }))
    .sort((a, b) => a.subcategory_ids.join(",").localeCompare(b.subcategory_ids.join(",")));

  const expected = EXPECTED_SECTIONS
    .map((section) => ({
      ...section,
      subcategory_ids: [...section.subcategory_ids].sort(),
    }))
    .sort((a, b) => a.subcategory_ids.join(",").localeCompare(b.subcategory_ids.join(",")));

  return JSON.stringify(actual) === JSON.stringify(expected);
}

async function main() {
  const source = createClient(
    requireEnv("SUPABASE_SOURCE_URL", SOURCE_URL),
    requireEnv("SUPABASE_SOURCE_SERVICE_ROLE_KEY", SOURCE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const target = createClient(
    requireEnv("SUPABASE_TARGET_URL", TARGET_URL),
    requireEnv("SUPABASE_TARGET_SERVICE_ROLE_KEY", TARGET_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: sourceQuestions, error: sourceError } = await source
    .from("questions")
    .select(
      "id, category_id, question_text, options, correct_answer_index, explanation, difficulty, is_active, source, cat, sub, deleted_at, exam_year_id, category:categories!questions_category_id_fkey(name,is_active)"
    )
    .order("id", { ascending: true });

  if (sourceError) throw new Error(`Source read failed: ${sourceError.message}`);

  const [{ count: sourceAttemptCount, error: attemptError }, { data: targetSet, error: setError }] =
    await Promise.all([
      source.from("exam_attempts").select("id", { count: "exact", head: true }),
      target
        .from("exam_sets")
        .select("id, slug, name, mode, question_count, max_score, pass_score, time_limit_minutes, is_gpa3, is_published")
        .eq("slug", "GPA3001")
        .maybeSingle(),
    ]);

  if (attemptError) throw new Error(`Source attempt count failed: ${attemptError.message}`);
  if (setError) throw new Error(`Target exam set read failed: ${setError.message}`);
  if (!targetSet) throw new Error("Target exam set GPA3001 was not found.");

  const targetSubcategoryIds = [
    "GPA_MATH",
    "GPA_THAI",
    "GPA_ENG",
    "GPA_LAW",
  ];

  const [
    { data: targetSubcategories, error: subcategoryError },
    { data: targetSections, error: sectionError },
    { data: targetIds, error: targetIdsError },
  ] = await Promise.all([
    target
      .from("subcategories")
      .select("id, name, is_gpa3")
      .in("id", targetSubcategoryIds),
    target
      .from("exam_set_sections")
      .select("id, label, subcategory_ids, question_count, max_score, pass_score, sort_order")
      .eq("exam_set_id", targetSet.id)
      .order("sort_order", { ascending: true }),
    target.from("questions").select("id"),
  ]);

  if (subcategoryError) throw new Error(`Target subcategory read failed: ${subcategoryError.message}`);
  if (sectionError) throw new Error(`Target section read failed: ${sectionError.message}`);
  if (targetIdsError) throw new Error(`Target question ID read failed: ${targetIdsError.message}`);

  const targetSubcategorySet = new Set((targetSubcategories ?? []).map((row) => row.id));
  const targetIdSet = new Set((targetIds ?? []).map((row) => row.id));
  const errors = [];
  const warnings = [];
  const mappedRows = [];
  const categoryCounts = {};
  const targetCounts = {};
  const promptGroups = new Map();
  const exactQuestionGroups = new Map();

  for (const question of sourceQuestions ?? []) {
    const categoryName = question.category?.name ?? "(ไม่พบหมวดต้นทาง)";
    categoryCounts[categoryName] = (categoryCounts[categoryName] ?? 0) + 1;

    const targetSubcategory = mapSubcategory(question);
    if (!targetSubcategory) {
      errors.push({
        source_id: question.id,
        reason: "ไม่สามารถ map หมวด/หมวดย่อยไปยัง subcategory ปลายทาง",
        source_category: categoryName,
        cat: question.cat,
        sub: question.sub,
      });
      continue;
    }

    targetCounts[targetSubcategory] = (targetCounts[targetSubcategory] ?? 0) + 1;

    if (!targetSubcategorySet.has(targetSubcategory)) {
      errors.push({
        source_id: question.id,
        reason: `ไม่พบ subcategory ปลายทาง ${targetSubcategory}`,
      });
    }
    if (!question.is_active || question.deleted_at !== null) {
      errors.push({
        source_id: question.id,
        reason: "โจทย์ต้นทางไม่ active หรือมี deleted_at",
      });
    }
    if (!String(question.question_text ?? "").trim()) {
      errors.push({ source_id: question.id, reason: "ข้อความคำถามว่าง" });
    }
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      errors.push({ source_id: question.id, reason: "ตัวเลือกไม่ครบ 4 ตัว" });
    } else if (question.options.some((option) => !String(option ?? "").trim())) {
      errors.push({ source_id: question.id, reason: "มีตัวเลือกว่าง" });
    }
    if (
      !Number.isInteger(question.correct_answer_index) ||
      question.correct_answer_index < 0 ||
      question.correct_answer_index > 3
    ) {
      errors.push({ source_id: question.id, reason: "correct_answer_index ต้องอยู่ระหว่าง 0–3" });
    }
    if (!(question.difficulty in DIFFICULTY_MAP)) {
      errors.push({ source_id: question.id, reason: `ไม่รู้จัก difficulty: ${question.difficulty}` });
    }
    if (question.source !== "manual") {
      warnings.push({
        source_id: question.id,
        reason: `source ต้นทางเป็น ${question.source}; migration จะเก็บ source_round เป็น manual`,
      });
    }
    if (!String(question.explanation ?? "").trim()) {
      errors.push({ source_id: question.id, reason: "คำอธิบายเฉลยว่าง" });
    } else if (String(question.explanation).includes("ยังไม่มีคำอธิบาย")) {
      warnings.push({
        source_id: question.id,
        reason: "คำอธิบายเฉลยเป็นข้อความ placeholder",
      });
    }

    const promptKey = normalizeText(question.question_text);
    if (!promptGroups.has(promptKey)) promptGroups.set(promptKey, []);
    promptGroups.get(promptKey).push(question);

    const exactKey = JSON.stringify({
      text: promptKey,
      options: (question.options ?? []).map(normalizeText),
      correct: question.correct_answer_index,
    });
    exactQuestionGroups.set(exactKey, (exactQuestionGroups.get(exactKey) ?? 0) + 1);

    mappedRows.push({
      id: question.id,
      subcategory_id: targetSubcategory,
      text: question.question_text,
      passage: null,
      choices: question.options,
      correct_index: question.correct_answer_index,
      explanation: question.explanation,
      difficulty: DIFFICULTY_MAP[question.difficulty],
      source_round: "manual",
      is_active: false,
      created_by: null,
      question_type: "mcq",
      answer_data: null,
      media: [],
      content_format: "plain",
      bloom_level: null,
    });
  }

  const duplicatePrompts = [...promptGroups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([normalizedText, rows]) => ({
      prompt: rows[0].question_text,
      count: rows.length,
      source_ids: rows.map((row) => row.id),
      categories: [...new Set(rows.map((row) => row.category?.name ?? "(unknown)"))],
      exactContentDuplicate:
        new Set(rows.map((row) =>
          JSON.stringify({
            options: (row.options ?? []).map(normalizeText),
            correct: row.correct_answer_index,
          })
        )).size === 1,
    }));

  const exactDuplicateCount = [...exactQuestionGroups.values()]
    .reduce((sum, count) => sum + Math.max(0, count - 1), 0);

  if ((sourceQuestions ?? []).length !== 100) {
    errors.push({
      reason: `จำนวนข้อสอบต้นทางควรเป็น 100 แต่พบ ${(sourceQuestions ?? []).length}`,
    });
  }

  for (const [subcategoryId, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
    if ((targetCounts[subcategoryId] ?? 0) !== expectedCount) {
      errors.push({
        reason: `จำนวน ${subcategoryId} ไม่ตรง: คาด ${expectedCount}, พบ ${targetCounts[subcategoryId] ?? 0}`,
      });
    }
  }

  if (
    targetSet.slug !== "GPA3001" ||
    targetSet.mode !== "simulation" ||
    targetSet.question_count !== 100 ||
    targetSet.max_score !== 200 ||
    targetSet.pass_score !== 120 ||
    targetSet.time_limit_minutes !== 180 ||
    targetSet.is_gpa3 !== true
  ) {
    errors.push({ reason: "metadata ของชุดข้อสอบ GPA3001 ไม่ตรงกับค่าที่ migration คาดหวัง" });
  }

  if (!checkSectionShape(targetSections ?? [])) {
    errors.push({ reason: "โครงสร้าง exam_set_sections ของ GPA3001 ไม่ตรงกับ 50/25/25 ข้อ และคะแนน 100/50/50" });
  }

  if ((targetSubcategories ?? []).length !== 4) {
    errors.push({ reason: "พบ subcategory ปลายทางไม่ครบ 4 หมวด" });
  }

  const conflictingIds = mappedRows
    .filter((row) => targetIdSet.has(row.id))
    .map((row) => row.id);

  if (conflictingIds.length > 0) {
    errors.push({
      reason: "มี UUID ของข้อสอบต้นทางชนกับข้อสอบที่มีอยู่ใน KPOR",
      conflicting_source_ids: conflictingIds,
    });
  }

  const placeholderExplanationCount = warnings.filter((warning) =>
    warning.reason === "คำอธิบายเฉลยเป็นข้อความ placeholder"
  ).length;

  const report = {
    mode: APPLY_BANK ? "apply-bank" : "dry-run",
    source: {
      total_questions: sourceQuestions?.length ?? 0,
      attempts_not_migrated: sourceAttemptCount ?? 0,
      category_counts: categoryCounts,
    },
    mapping: {
      target_counts: targetCounts,
      expected_counts: EXPECTED_COUNTS,
      difficulty_rule: DIFFICULTY_MAP,
      target_exam_set: {
        id: targetSet.id,
        slug: targetSet.slug,
        name: targetSet.name,
        is_published: targetSet.is_published,
        question_count: targetSet.question_count,
        max_score: targetSet.max_score,
      },
      sections_match: checkSectionShape(targetSections ?? []),
    },
    quality: {
      mapped_rows: mappedRows.length,
      invalid_rows: errors.length,
      placeholder_explanations: placeholderExplanationCount,
      repeated_prompt_groups: duplicatePrompts,
      exact_duplicate_questions: exactDuplicateCount,
      category_inactive_in_source: (sourceQuestions ?? [])
        .filter((question) => question.category?.is_active === false)
        .length,
      missing_exam_year: (sourceQuestions ?? []).filter((question) => !question.exam_year_id).length,
    },
    safety: {
      target_question_rows_before: targetIds?.length ?? 0,
      conflicting_source_ids: conflictingIds.length,
      imported_questions_will_be_active: false,
      exam_set_questions_will_be_created: false,
      exam_set_metadata_will_be_changed: false,
      old_attempts_will_be_migrated: false,
      activation_blocked_until_explanations_reviewed: placeholderExplanationCount > 0,
    },
    errors,
    warnings: warnings.filter((warning) =>
      warning.reason !== "คำอธิบายเฉลยเป็นข้อความ placeholder"
    ),
  };

  console.log(JSON.stringify(report, null, 2));

  if (errors.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (!APPLY_BANK) {
    console.log("\nDRY RUN ONLY — no database rows were changed.");
    console.log("To insert the 100 mapped questions as inactive drafts, rerun with --apply-bank.");
    return;
  }

  if (mappedRows.length !== 100) {
    throw new Error("Apply refused: mapped question count is not exactly 100.");
  }

  const { data: inserted, error: insertError } = await target
    .from("questions")
    .insert(mappedRows)
    .select("id");

  if (insertError) {
    throw new Error(`Target insert failed (the bulk insert is atomic): ${insertError.message}`);
  }

  if ((inserted ?? []).length !== 100) {
    throw new Error(`Expected 100 inserted questions, received ${inserted?.length ?? 0}.`);
  }

  console.log("\nInserted 100 inactive draft questions. No exam set mapping or publication changes were made.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
