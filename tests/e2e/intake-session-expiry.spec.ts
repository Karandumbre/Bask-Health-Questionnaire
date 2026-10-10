import { test, expect } from "@playwright/test";
import { THEME_PRESET_OCEAN } from "../../src/features/themes/domain/presets";

const snapshot = {
  publicSlug: "session-feedback",
  versionNumber: 1,
  theme: THEME_PRESET_OCEAN,
  definition: {
    schemaVersion: 1,
    title: "Session feedback",
    questions: [
      {
        id: "name",
        type: "short_text",
        label: "Name",
        required: true,
        visibility: null,
      },
    ],
  },
};

for (const failure of [
  "SESSION_EXPIRED",
  "SESSION_UNAUTHORIZED",
  "INTERNAL_ERROR",
] as const) {
  test(`patient progress handles ${failure} without discarding answers`, async ({
    page,
  }) => {
    let saves = 0;
    let starts = 0;
    await page.route("**/api/patient/forms/session-feedback", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: { ...snapshot, publishedAt: "2026-10-10T00:00:00Z" },
        },
      }),
    );
    await page.route(
      "**/api/patient/forms/session-feedback/session",
      (route) => {
        if (route.request().method() === "POST") {
          starts++;
          return route.fulfill({
            json: {
              success: true,
              data: {
                ...snapshot,
                sessionId: "new-session",
                sessionReference: "BKS-NEW-1234",
                recoveryCode: "BK-TEST-1234",
                sessionRevision: 1,
                currentAnswers: {},
              },
            },
          });
        }
        return route.fulfill({
          json: {
            success: true,
            data: {
              ...snapshot,
              active: true,
              sessionId: "session",
              sessionReference: "BKS-TEST-1234",
              status: "in_progress",
              sessionRevision: 1,
              currentAnswers: {},
            },
          },
        });
      },
    );
    await page.route("**/api/patient/session/progress", (route) => {
      saves++;
      return route.fulfill({
        status:
          failure === "SESSION_EXPIRED"
            ? 410
            : failure === "SESSION_UNAUTHORIZED"
              ? 401
              : 500,
        json: {
          success: false,
          error: { code: failure, message: "Request failed" },
        },
      });
    });
    await page.goto("/intake/session-feedback");
    const input = page.getByRole("textbox", { name: "Name" });
    await input.fill("Synthetic answer");
    if (failure === "INTERNAL_ERROR") {
      await expect(
        page.getByRole("button", { name: "Retry Save" }),
      ).toBeVisible();
      await expect(input).toBeEnabled();
      await expect(input).toHaveValue("Synthetic answer");
      await expect(
        page.getByRole("heading", { name: "Intake session ended" }),
      ).not.toBeVisible();
      await page.getByRole("button", { name: "Retry Save" }).click();
      await expect.poll(() => saves).toBe(2);
    } else {
      await expect(
        page.getByRole("heading", { name: "Intake session ended" }),
      ).toBeVisible();
      await expect(input).toBeDisabled();
      await expect(input).toHaveValue("Synthetic answer");
      await expect(
        page.getByRole("button", { name: "Submit Responses" }),
      ).toBeDisabled();
      expect(starts).toBe(0);
      expect(saves).toBe(1);
      await page.getByRole("button", { name: "Start new intake" }).click();
      await expect(input).toBeEnabled();
      await expect(input).toHaveValue("");
      await expect(
        page.getByRole("heading", { name: "Intake session ended" }),
      ).not.toBeVisible();
      expect(starts).toBe(1);
    }
  });
}

test("an ended browser session waits for an explicit new intake", async ({
  page,
}) => {
  let starts = 0;
  await page.route("**/api/patient/forms/session-feedback", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { ...snapshot, publishedAt: "2026-10-10T00:00:00Z" },
      },
    }),
  );
  await page.route("**/api/patient/forms/session-feedback/session", (route) => {
    if (route.request().method() === "POST") starts++;
    return route.fulfill({
      json: { success: true, data: { active: false, sessionEnded: true } },
    });
  });
  await page.goto("/intake/session-feedback");
  await expect(
    page.getByRole("heading", { name: "Intake session ended" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume intake", exact: true }),
  ).toBeVisible();
  expect(starts).toBe(0);
});
