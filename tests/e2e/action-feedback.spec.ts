import { test, expect } from "@playwright/test";
import { THEME_PRESET_OCEAN } from "../../src/features/themes/domain/presets";

const definition = {
  schemaVersion: 1,
  title: "Failure recovery intake",
  questions: [
    {
      id: "name",
      type: "short_text",
      label: "Your name",
      required: true,
      visibility: null,
    },
  ],
};
const snapshot = {
  publicSlug: "feedback-test",
  versionNumber: 1,
  definition,
  theme: THEME_PRESET_OCEAN,
};
const failure = {
  success: false,
  error: {
    code: "INTERNAL_ERROR",
    message: "Service temporarily unavailable. Please retry.",
  },
};

test("login failure releases the button and exposes an accessible alert", async ({
  page,
}) => {
  await page.route("**/api/auth/login", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({ status: 503, json: failure });
  });
  await page.goto("/admin/login");
  await page.getByLabel("Reviewer Email").fill("reviewer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("fictional-password");
  await page.getByRole("button", { name: "Sign in to Intake Studio" }).click();
  await expect(
    page.getByRole("button", { name: "Signing in..." }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("form").getByRole("alert")).toContainText(failure.error.message);
  await expect(
    page.getByRole("button", { name: "Sign in to Intake Studio" }),
  ).toBeEnabled();
  await expect(page.getByLabel("Reviewer Email")).toHaveValue(
    "reviewer@example.com",
  );
});

for (const width of [1440, 390]) {
  test(`patient save and submit failures preserve answers and allow explicit recovery at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("**/api/patient/forms/feedback-test", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: { ...snapshot, publishedAt: "2026-10-10T00:00:00Z" },
        },
      }),
    );
    await page.route("**/api/patient/forms/feedback-test/session", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: {
            active: true,
            ...snapshot,
            sessionId: "fixture-session",
            sessionReference: "BKS-TEST-1234",
            status: "in_progress",
            currentAnswers: {},
            sessionRevision: 1,
          },
        },
      }),
    );
    let saveAttempts = 0;
    await page.route("**/api/patient/session/progress", async (route) => {
      saveAttempts++;
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (saveAttempts === 1)
        await route.fulfill({ status: 503, json: failure });
      else
        await route.fulfill({
          json: {
            success: true,
            data: {
              sessionRevision: saveAttempts,
              sanitizedAnswers: { name: "Fictional Patient" },
            },
          },
        });
    });
    let submitAttempts = 0;
    await page.route("**/api/patient/session/submit", async (route) => {
      submitAttempts++;
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (submitAttempts === 1)
        await route.fulfill({ status: 503, json: failure });
      else
        await route.fulfill({
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
    await page.goto("/intake/feedback-test");
    await page
      .getByLabel("Your name", { exact: false })
      .fill("Fictional Patient");
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "They remain on this page",
    );
    await expect(page.getByLabel("Your name", { exact: false })).toHaveValue(
      "Fictional Patient",
    );
    await page
      .getByRole("button", { name: "Retry Save", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Saving...", exact: true }),
    ).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await page.getByRole("button", { name: "Submit Responses" }).click();
    await expect(
      page.getByRole("button", { name: "Submitting..." }),
    ).toBeDisabled();
    await expect(page.locator("main").getByRole("alert")).toContainText(failure.error.message);
    await expect(page.getByLabel("Your name", { exact: false })).toHaveValue(
      "Fictional Patient",
    );
    await expect(
      page.getByRole("button", { name: "Submit Responses" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Submit Responses" }).click();
    await expect(
      page.getByText("fixture-submission", { exact: false }),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
