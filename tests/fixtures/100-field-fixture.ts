import { FormDefinition, Question } from "@/features/forms/domain/types";

/**
 * Generates a realistic, fully compliant 100-field clinical intake fixture.
 * Structure:
 * - 20 Root categories (single-select questions)
 * - 40 Dependent follow-ups (conditional on root categories)
 * - 20 Number inputs (vital signs, dosages, durations)
 * - 10 Text inputs (notes, addresses, emergency contacts)
 * - 10 Multi-select symptom checklists
 */
export function generate100FieldFixture(): FormDefinition {
  const questions: Question[] = [];

  // Generate 20 sections of 5 fields each = 100 fields
  for (let s = 1; s <= 20; s++) {
    const rootId = `sec_${s}_root`;
    const optYesId = `sec_${s}_opt_yes`;
    const optNoId = `sec_${s}_opt_no`;

    // 1. Root single-select (Unconditional, Required)
    questions.push({
      id: rootId,
      type: "single_select",
      label: `Section ${s}: Do you experience symptoms related to Condition Category ${s}?`,
      required: true,
      visibility: null,
      options: [
        { id: optYesId, label: "Yes, frequently" },
        { id: optNoId, label: "No, never" },
      ],
    });

    // 2. Dependent text field
    questions.push({
      id: `sec_${s}_text`,
      type: "long_text",
      label: `Section ${s} details: Describe the frequency and nature of Category ${s} symptoms`,
      required: true,
      visibility: { parentQuestionId: rootId, equalsOptionId: optYesId },
      validation: { minLength: 5, maxLength: 500 },
    });

    // 3. Dependent number field
    questions.push({
      id: `sec_${s}_severity`,
      type: "number",
      label: `Section ${s} severity rating (1-10)`,
      required: true,
      visibility: { parentQuestionId: rootId, equalsOptionId: optYesId },
      validation: { min: 1, max: 10, integerOnly: true },
    });

    // 4. Dependent multi-select checklist
    questions.push({
      id: `sec_${s}_triggers`,
      type: "multi_select",
      label: `Section ${s} triggers`,
      required: false,
      visibility: { parentQuestionId: rootId, equalsOptionId: optYesId },
      options: [
        { id: `sec_${s}_trig_stress`, label: "Stress" },
        { id: `sec_${s}_trig_diet`, label: "Dietary changes" },
        { id: `sec_${s}_trig_exertion`, label: "Physical exertion" },
      ],
    });

    // 5. Unconditional background checkbox
    questions.push({
      id: `sec_${s}_reviewed`,
      type: "checkbox",
      label: `Section ${s}: I have reviewed the clinical disclaimer for this section`,
      required: true,
      visibility: null,
    });
  }

  return {
    schemaVersion: 1,
    title: "Comprehensive 100-Field Clinical Intake Benchmark",
    description: "Benchmark intake form containing 100 fields with real conditional dependencies.",
    questions,
  };
}

