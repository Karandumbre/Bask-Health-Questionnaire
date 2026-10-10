import { test, expect } from "@playwright/test";
import { THEME_PRESET_OCEAN } from "../../src/features/themes/domain/presets";

for (const width of [1440, 390]) {
  test(`field validation and pinned session survive a newer publication at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const pinned = {
      publicSlug: "validation-test",
      versionNumber: 2,
      theme: THEME_PRESET_OCEAN,
      definition: {
        schemaVersion: 1,
        title: "Pinned v2 intake",
        questions: [
          {
            id: "age",
            type: "number",
            label: "Age",
            required: true,
            visibility: null,
            validation: { min: 18, max: 100, integerOnly: true },
          },
        ],
      },
    };
    let published = pinned;
    let answers: Record<string, number> = {};
    let revision = 1;
    let saveAttempts = 0;
    let rejectSubmission = true;
    const invalid = (issue: string) => ({
      success: false,
      error: {
        code: "INVALID_ANSWER",
        message: "One or more answers failed validation",
        details: {
          validationErrors: [
            { questionId: "age", issue, code: "MAX_VALUE_VIOLATION" },
          ],
        },
      },
    });
    await page.route("**/api/patient/forms/validation-test", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: { ...published, publishedAt: "2026-10-10T00:00:00Z" },
        },
      }),
    );
    await page.route("**/api/patient/forms/validation-test/session", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: {
            active: true,
            ...pinned,
            sessionId: "fixture-session",
            sessionReference: "BKS-TEST-1234",
            status: "in_progress",
            currentAnswers: answers,
            sessionRevision: revision,
          },
        },
      }),
    );
    await page.route("**/api/patient/session/progress", (route) => {
      saveAttempts++;
      const body = route.request().postDataJSON();
      if (body.answers.age > 100)
        return route.fulfill({
          status: 422,
          json: invalid("Number cannot exceed 100"),
        });
      answers = body.answers;
      revision++;
      return route.fulfill({
        json: {
          success: true,
          data: { sessionRevision: revision, sanitizedAnswers: answers },
        },
      });
    });
    await page.route("**/api/patient/session/submit", (route) => {
      expect(route.request().postDataJSON().answers).toEqual({ age: 98 });
      if (rejectSubmission)
        return route.fulfill({
          status: 422,
          json: invalid("Please confirm this age"),
        });
      return route.fulfill({
        json: {
          success: true,
          data: {
            submissionId: "fixture-submission",
            submittedAt: "2026-10-10T00:00:00Z",
            status: "completed",
            isIdempotentReplay: false,
          },
        },
      });
    });
    await page.goto("/intake/validation-test");
    const age = page
      .getByLabel("Age", { exact: false })
      .filter({ visible: true });
    const card = page.locator('[data-question-id="age"]');
    await age.fill("101");
    await expect(age).toHaveAttribute("aria-invalid", "true");
    await expect(card.getByRole("alert")).toContainText("100");
    await expect.poll(() => saveAttempts).toBeGreaterThan(0);
    await age.fill("98");
    await expect(card.getByRole("alert")).toHaveCount(0);
    await expect.poll(() => answers.age).toBe(98);
    published = {
      ...pinned,
      versionNumber: 3,
      definition: {
        ...pinned.definition,
        title: "New v3 intake",
        questions: [
          {
            id: "age",
            type: "number",
            label: "Age",
            required: true,
            visibility: null,
            validation: { min: 18, max: 50, integerOnly: true },
          },
        ],
      },
    };
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Pinned v2 intake" }),
    ).toBeVisible();
    await expect(age).toHaveValue("98");
    await expect(card.getByRole("alert")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Submit Responses", exact: true })
      .click();
    await expect(card.getByRole("alert")).toContainText(
      "Please confirm this age",
    );
    await expect(age).toHaveAttribute("aria-invalid", "true");
    rejectSubmission = false;
    await age.fill("97");
    await age.fill("98");
    await page
      .getByRole("button", { name: "Submit Responses", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Intake Submitted Successfully" }),
    ).toBeVisible();
  });
}
