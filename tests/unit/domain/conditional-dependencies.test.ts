import { describe, expect, it } from "vitest";
import {
  FormDefinition,
  FormDefinitionSchema,
  SingleSelectQuestion,
  ShortTextQuestion,
} from "@/features/forms/domain/types";
import { validateFormForPublish } from "@/features/forms/domain/validation";
import { cloneQuestionWithNewId } from "@/features/forms/domain/question-operations";

describe("Conditional Dependencies Integrity", () => {
  const createValidTwoQuestionForm = (): {
    form: FormDefinition;
    parent: SingleSelectQuestion;
    child: ShortTextQuestion;
  } => {
    const parent: SingleSelectQuestion = {
      id: "q_parent_1",
      type: "single_select",
      label: "Do you experience persistent chest discomfort?",
      required: true,
      visibility: null,
      options: [
        { id: "opt_yes", label: "Yes" },
        { id: "opt_no", label: "No" },
      ],
    };

    const child: ShortTextQuestion = {
      id: "q_child_1",
      type: "short_text",
      label: "Please describe the severity and frequency of chest symptoms:",
      required: true,
      visibility: {
        parentQuestionId: "q_parent_1",
        equalsOptionId: "opt_yes",
      },
      placeholder: "e.g. Sharp pain when climbing stairs...",
    };

    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Cardiology Clinical Intake",
      questions: [parent, child],
    };

    return { form, parent, child };
  };

  it("initially valid form passes both draft schema and publish validation", () => {
    const { form } = createValidTwoQuestionForm();

    // Draft persistence permits saving
    expect(FormDefinitionSchema.safeParse(form).success).toBe(true);

    // Publication validation passes
    const publishResult = validateFormForPublish(form);
    expect(publishResult.valid).toBe(true);
    expect(publishResult.errors).toHaveLength(0);
  });

  it("parent deletion breaks dependency: draft remains saveable but publication is rejected", () => {
    const { form } = createValidTwoQuestionForm();

    // Simulate deleting the parent question (child retains its visibility reference)
    const formAfterParentDeleted: FormDefinition = {
      ...form,
      questions: [form.questions[1]!], // Only child remains
    };

    // 1. Incomplete/invalid drafts MUST remain saveable
    expect(FormDefinitionSchema.safeParse(formAfterParentDeleted).success).toBe(
      true,
    );

    // 2. Publication MUST be strictly blocked
    const publishResult = validateFormForPublish(formAfterParentDeleted);
    expect(publishResult.valid).toBe(false);
    expect(
      publishResult.errors.some(
        (err) => err.code === "MISSING_PARENT_QUESTION",
      ),
    ).toBe(true);
    expect(publishResult.errors[0]?.issue).toContain(
      "Referenced parent question no longer exists",
    );
  });

  it("referenced option deletion breaks dependency: draft remains saveable but publication is rejected", () => {
    const { form, parent } = createValidTwoQuestionForm();

    // Parent option 'opt_yes' is deleted, leaving only 'opt_no' and 'opt_maybe'
    const updatedParent: SingleSelectQuestion = {
      ...parent,
      options: [
        { id: "opt_no", label: "No" },
        { id: "opt_maybe", label: "Unsure" },
      ],
    };

    const formWithDeletedOption: FormDefinition = {
      ...form,
      questions: [updatedParent, form.questions[1]!],
    };

    // 1. Draft remains saveable
    expect(FormDefinitionSchema.safeParse(formWithDeletedOption).success).toBe(
      true,
    );

    // 2. Publication is blocked
    const publishResult = validateFormForPublish(formWithDeletedOption);
    expect(publishResult.valid).toBe(false);
    expect(
      publishResult.errors.some((err) => err.code === "MISSING_PARENT_OPTION"),
    ).toBe(true);
    expect(publishResult.errors[0]?.issue).toContain(
      "Referenced option no longer exists",
    );
  });

  it("reordering parent after child breaks dependency: draft remains saveable but publication is rejected", () => {
    const { form, parent, child } = createValidTwoQuestionForm();

    // Reorder: place child before parent
    const formReordered: FormDefinition = {
      ...form,
      questions: [child, parent],
    };

    // 1. Draft remains saveable
    expect(FormDefinitionSchema.safeParse(formReordered).success).toBe(true);

    // 2. Publication is blocked
    const publishResult = validateFormForPublish(formReordered);
    expect(publishResult.valid).toBe(false);
    expect(
      publishResult.errors.some(
        (err) => err.code === "FORWARD_OR_SELF_DEPENDENCY",
      ),
    ).toBe(true);
    expect(publishResult.errors[0]?.issue).toContain(
      "Parent question must appear before this question",
    );
  });

  it("parent made optional breaks dependency: draft remains saveable but publication is rejected", () => {
    const { form, parent } = createValidTwoQuestionForm();

    // Parent required is toggled to false
    const optionalParent: SingleSelectQuestion = {
      ...parent,
      required: false,
    };

    const formWithOptionalParent: FormDefinition = {
      ...form,
      questions: [optionalParent, form.questions[1]!],
    };

    // 1. Draft remains saveable
    expect(FormDefinitionSchema.safeParse(formWithOptionalParent).success).toBe(
      true,
    );

    // 2. Publication is blocked
    const publishResult = validateFormForPublish(formWithOptionalParent);
    expect(publishResult.valid).toBe(false);
    expect(
      publishResult.errors.some((err) => err.code === "PARENT_NOT_REQUIRED"),
    ).toBe(true);
    expect(publishResult.errors[0]?.issue).toContain("must be marked Required");
  });

  it("parent becoming conditional breaks dependency (nested condition forbidden): draft saveable, publish rejected", () => {
    const { form, parent, child } = createValidTwoQuestionForm();

    // Add an upstream question
    const grandParent: SingleSelectQuestion = {
      id: "q_gp_0",
      type: "single_select",
      label: "Are you a new patient?",
      required: true,
      visibility: null,
      options: [
        { id: "opt_gp_yes", label: "Yes" },
        { id: "opt_gp_no", label: "No" },
      ],
    };

    // Parent is now conditional on grandParent
    const nestedParent: SingleSelectQuestion = {
      ...parent,
      visibility: {
        parentQuestionId: "q_gp_0",
        equalsOptionId: "opt_gp_yes",
      },
    };

    const formWithNestedCondition: FormDefinition = {
      ...form,
      questions: [grandParent, nestedParent, child],
    };

    // 1. Draft remains saveable
    expect(
      FormDefinitionSchema.safeParse(formWithNestedCondition).success,
    ).toBe(true);

    // 2. Publication is blocked
    const publishResult = validateFormForPublish(formWithNestedCondition);
    expect(publishResult.valid).toBe(false);
    expect(
      publishResult.errors.some(
        (err) => err.code === "NESTED_CONDITION_FORBIDDEN",
      ),
    ).toBe(true);
    expect(publishResult.errors[0]?.issue).toContain(
      "nested conditions are forbidden",
    );
  });

  it("duplicating dependent question creates unique ID while preserving valid condition", () => {
    const { form, parent, child } = createValidTwoQuestionForm();

    // Duplicate child
    const duplicatedChild = cloneQuestionWithNewId(child, "q_child_1_copy");

    expect(duplicatedChild.id).toBe("q_child_1_copy");
    expect(duplicatedChild.id).not.toBe(child.id);
    expect(duplicatedChild.visibility).toEqual(child.visibility);

    const formWithDuplicate: FormDefinition = {
      ...form,
      questions: [parent, child, duplicatedChild],
    };

    // Both draft and publish valid
    expect(FormDefinitionSchema.safeParse(formWithDuplicate).success).toBe(
      true,
    );
    const publishResult = validateFormForPublish(formWithDuplicate);
    expect(publishResult.valid).toBe(true);
    expect(publishResult.errors).toHaveLength(0);
  });

  it("duplicating parent question generates distinct option IDs without mutating existing dependencies", () => {
    const { form, parent, child } = createValidTwoQuestionForm();

    // Duplicate parent
    const clonedParent = cloneQuestionWithNewId(parent, "q_parent_cloned");

    expect(clonedParent.id).toBe("q_parent_cloned");
    // Ensure all options receive new unique IDs
    expect(
      clonedParent.type === "single_select" && clonedParent.options[0]?.id,
    ).not.toBe("opt_yes");

    // Existing child still references original parent 'q_parent_1' and 'opt_yes'
    expect(child.visibility?.parentQuestionId).toBe("q_parent_1");
    expect(child.visibility?.equalsOptionId).toBe("opt_yes");

    const formWithClonedParent: FormDefinition = {
      ...form,
      questions: [parent, clonedParent, child],
    };

    expect(FormDefinitionSchema.safeParse(formWithClonedParent).success).toBe(
      true,
    );
    const publishResult = validateFormForPublish(formWithClonedParent);
    expect(publishResult.valid).toBe(true);
  });

  it("renaming question labels and option labels preserves conditional integrity because IDs are stable", () => {
    const { form, parent, child } = createValidTwoQuestionForm();

    // Rename parent question label and option labels
    const renamedParent: SingleSelectQuestion = {
      ...parent,
      label:
        "Have you noticed any cardiovascular discomfort or pressure recently?",
      options: [
        { id: "opt_yes", label: "Affirmative (Yes)" },
        { id: "opt_no", label: "Negative (No)" },
      ],
    };

    const renamedChild: ShortTextQuestion = {
      ...child,
      label: "Elaborate on the specific onset, duration, and triggers:",
    };

    const formRenamed: FormDefinition = {
      ...form,
      questions: [renamedParent, renamedChild],
    };

    // Relationship remains 100% valid because IDs ('q_parent_1' and 'opt_yes') are intact
    expect(FormDefinitionSchema.safeParse(formRenamed).success).toBe(true);
    const publishResult = validateFormForPublish(formRenamed);
    expect(publishResult.valid).toBe(true);
    expect(publishResult.errors).toHaveLength(0);
  });
});
