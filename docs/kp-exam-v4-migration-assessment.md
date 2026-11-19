# kp-exam-v4 → KPOR Question Migration Assessment

Assessment date: 2026-11-19

Status: **Dry-run plan only. No source or target records have been changed.**

## Source and target

- Source project: `kp-exam-v4`, using `categories / exam_years / questions / exam_attempts`.
- Target project: `kpor`, using `subject_groups / subcategories / questions / exam_sets / user_attempts`.
- The schemas are different. Do not copy rows directly between tables or migrate source attempts.
- Source contains 100 questions, all active, with 100 unique UUIDs.
- Source contains 30 historical `exam_attempts` (8 finished). These rows and their user IDs/answers are intentionally excluded.
- Target currently has 0 questions, 0 `exam_set_questions` mappings, and 0 user attempts.
- Target already has the published `GPA3001` exam set configured for 100 questions, 200 points, 180 minutes, and a 120-point pass score.

## Proposed category mapping

| Source category / legacy subcategory | KPOR subcategory | Rows |
|---|---|---:|
| ความสามารถทั่วไป / `cat=math`, `sub=SC_M*` | `GPA_MATH` | 24 |
| ความสามารถทั่วไป / `cat=thai`, `sub=SC_T*` | `GPA_THAI` | 26 |
| ภาษาอังกฤษ | `GPA_ENG` | 25 |
| การเป็นข้าราชการที่ดี | `GPA_LAW` | 25 |
| **Total** | | **100** |

This matches the existing `GPA3001` section counts (50 / 25 / 25) and configured section scores (100 / 50 / 50). The target sections currently use these same aggregate subcategory IDs.

## Field mapping

| Source field | KPOR field | Rule |
|---|---|---|
| `id` | `id` | Preserve source UUID for traceability |
| `question_text` | `text` | Plain text; no HTML/LaTeX/line breaks found |
| `options` | `choices` | Preserve 4 options as JSON array |
| `correct_answer_index` | `correct_index` | Preserve 0-based index |
| `explanation` | `explanation` | Preserve exact source value; currently placeholder |
| `difficulty` | `difficulty` | `easy=1, medium=2, hard=3` |
| category + legacy `cat/sub` | `subcategory_id` | Mapping table above |
| `source` | `source_round` | Source is all `manual`; store `manual` |
| — | `question_type` | `mcq` |
| — | `content_format` | `plain` |
| — | `is_active` | **false** until explanation review |
| `created_at / updated_at` | same | Preserve source timestamps |
| — | `created_by` | null; source user IDs are not valid in target Auth |
| — | `passage / answer_data / media / bloom_level` | null / empty defaults |

The source questions have no assigned `exam_year_id`, so the import cannot truthfully assign a specific paper date or exam year.

## Data quality findings

| Check | Result |
|---|---:|
| Source question rows | 100 |
| Distinct source UUIDs | 100 |
| Active / not deleted | 100 |
| Four nonblank options | 100 |
| Correct answer index in range 0–3 | 100 |
| Blank question text | 0 |
| Blank options | 0 |
| Blank explanations | 0 |
| Placeholder explanations | **100** |
| Question rows with table data | 0 |
| HTML / LaTeX / newline formatting | 0 |
| Assigned exam year | 0 |
| Source category “ความสามารถทั่วไป” marked inactive | 50 rows |
| Repeated prompt group | 4 rows use “ข้อใดคือคำที่สะกดถูกต้อง?” |
| Exact duplicate prompt + options + correct answer | 0 |

The repeated prompt group has different answer options and answer positions, so it is a content-review warning, not proof of exact duplicate questions.

### Activation blocker

Every source explanation is currently the placeholder:

`[ยังไม่มีคำอธิบายเฉลย — กรุณาเพิ่มผ่านหน้าจัดการคำถาม]`

These records must remain inactive until reviewed and replaced with useful explanations. The Admin Questions tab now shows an active/review status and refuses activation while this placeholder remains.

## Safe rollout sequence

1. Confirm the production/staging target URL and take a target database backup.
2. Run the migration helper without flags. It is read-only and prints the mapping/validation report.
3. Run with `--apply-bank` only when you explicitly intend to insert the bank. This inserts 100 questions as `is_active=false` and preserves their UUIDs.
4. Review every explanation and the repeated prompt group in Admin → Questions. Mark a question active only after its answer and explanation have been checked.
5. Hide `GPA3001` before editing its published exam set.
6. Use Exam Set Builder to assign the reviewed 100 questions, 2 points each, to the matching sections. Confirm 50 / 25 / 25 questions and 100 / 50 / 50 section points.
7. Test start, answer-save, submit, result review, and section pass rules in staging. Only then publish and deploy.

The migration helper does **not** create mappings, change exam-set metadata, activate questions, or migrate users/attempt history.

## Run the helper

Set these variables locally. Never commit service-role keys or put them in `NEXT_PUBLIC_*` variables.

```bash
export SUPABASE_SOURCE_URL="https://<kp-exam-v4-project>.supabase.co"
export SUPABASE_SOURCE_SERVICE_ROLE_KEY="<source-service-role-key>"
export SUPABASE_TARGET_URL="https://<kpor-project>.supabase.co"
export SUPABASE_TARGET_SERVICE_ROLE_KEY="<target-service-role-key>"

# Read-only validation
node scripts/migrate-kp-exam-v4-questions.mjs

# Explicitly insert inactive questions only
node scripts/migrate-kp-exam-v4-questions.mjs --apply-bank
```
