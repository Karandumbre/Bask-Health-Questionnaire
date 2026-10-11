import { describe, it, expect } from "vitest";
import { generate100FieldFixture } from "../../fixtures/100-field-fixture";
import { validateFormForPublish } from "@/features/forms/domain/validation";
import {
  pruneHiddenAnswers,
  getVisibleQuestions,
} from "@/features/patients/domain/visibility";
import { PatientAnswers } from "@/features/patients/domain/types";

describe("100-Field Fixture & Performance Benchmark", () => {
  it("generates exactly 100 valid clinical fields", () => {
    const fixture = generate100FieldFixture();
    expect(fixture.questions).toHaveLength(100);
  });

  it("passes strict publish validation across all 100 fields", () => {
    const fixture = generate100FieldFixture();
    const result = validateFormForPublish(fixture);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("evaluates visibility and prunes 100-field answers in under 10ms", () => {
    const fixture = generate100FieldFixture();
    const answers: PatientAnswers = {};

    // Fill all root fields with 'Yes' and add details
    for (let s = 1; s <= 20; s++) {
      answers[`sec_${s}_root`] = `sec_${s}_opt_yes`;
      answers[`sec_${s}_text`] = "Chronic recurrent migraine symptoms.";
      answers[`sec_${s}_severity`] = 7;
      answers[`sec_${s}_triggers`] = [`sec_${s}_trig_stress`];
      answers[`sec_${s}_reviewed`] = true;
    }

    // Measure visibility calculation time
    const startVis = performance.now();
    const visibleAll = getVisibleQuestions(fixture.questions, answers);
    const endVis = performance.now();
    expect(visibleAll).toHaveLength(100);
    expect(endVis - startVis).toBeLessThan(10); // Under 10ms

    // Flip 10 roots to 'No' (which hides 30 dependent fields)
    for (let s = 1; s <= 10; s++) {
      answers[`sec_${s}_root`] = `sec_${s}_opt_no`;
    }

    // Measure pruning time
    const startPrune = performance.now();
    const pruned = pruneHiddenAnswers(answers, fixture.questions);
    const endPrune = performance.now();

    // Verify pruned answers: 10 * 2 (unconditional) + 10 * 5 (sections with Yes) = 20 + 50 = 70 fields
    expect(Object.keys(pruned)).toHaveLength(70);
    expect(endPrune - startPrune).toBeLessThan(10); // Under 10ms
  });
});
