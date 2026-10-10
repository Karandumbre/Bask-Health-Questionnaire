import { test, expect, type Page } from "@playwright/test";
import { THEME_PRESET_OCEAN } from "../../src/features/themes/domain/presets";

const snapshot = {
  publicSlug: "completion-test",
  versionNumber: 1,
  theme: THEME_PRESET_OCEAN,
  definition: {
    schemaVersion: 1,
    title: "Completion check",
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
const confirmation = {
  submissionId: "submission-original",
  submittedAt: "2026-10-10T12:00:00Z",
};

async function install(
  page: Page,
  state: {
    completed: boolean;
    active: boolean;
    unavailable: boolean;
    submits: number;
    saves: number;
    starts: number;
  },
) {
  await page.route("**/api/patient/forms/completion-test", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { ...snapshot, publishedAt: "2026-10-10T00:00:00Z" },
      },
    }),
  );
  await page.route("**/api/patient/forms/completion-test/session", (route) => {
    if (route.request().method() === "POST") {
      state.starts++;
      return route.fulfill({
        json: {
          success: true,
          data: {
            ...snapshot,
            sessionId: "new-session",
            sessionReference: "BKS-NEW-1234",
            recoveryCode: "BK-NEW-1234",
            sessionRevision: 1,
            currentAnswers: {},
          },
        },
      });
    }
    if (state.completed && state.unavailable)
      return route.fulfill({
        status: 500,
        json: {
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Temporary outage" },
        },
      });
    return route.fulfill({
      json: {
        success: true,
        data: state.active
          ? {
              ...snapshot,
              active: true,
              sessionId: "session",
              sessionReference: "BKS-TEST-1234",
              status: state.completed ? "completed" : "in_progress",
              sessionRevision: 1,
              currentAnswers: { name: "Synthetic answer" },
              submission: state.completed ? confirmation : undefined,
            }
          : { active: false },
      },
    });
  });
  await page.route("**/api/patient/session/progress", (route) => {
    state.saves++;
    if (state.completed)
      return route.fulfill({
        status: 409,
        json: {
          success: false,
          error: {
            code: "SESSION_COMPLETED",
            message: "Cannot modify completed intake",
          },
        },
      });
    const body = route.request().postDataJSON();
    return route.fulfill({
      json: {
        success: true,
        data: {
          sessionRevision: body.expectedSessionRevision + 1,
          sanitizedAnswers: body.answers,
        },
      },
    });
  });
  await page.route("**/api/patient/session/submit", (route) => {
    state.submits++;
    state.completed = true;
    return route.fulfill({
      json: {
        success: true,
        data: {
          ...confirmation,
          status: "completed",
          isIdempotentReplay: false,
        },
      },
    });
  });
}

for (const width of [1440, 390]) {
  test(`refreshing a submitted intake keeps the original confirmation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = {
      completed: false,
      active: true,
      unavailable: false,
      submits: 0,
      saves: 0,
      starts: 0,
    };
    await install(page, state);
    await page.goto("/intake/completion-test");
    await page.getByRole("button", { name: "Submit Responses" }).click();
    await expect(
      page.getByRole("heading", { name: "Intake Submitted Successfully" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Intake Submitted Successfully" }),
    ).toBeVisible();
    await expect(
      page.getByText(confirmation.submissionId, { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name" })).not.toBeVisible();
    expect(state.submits).toBe(1);
    expect(state.starts).toBe(0);
    expect(state.saves).toBe(0);
  });
}

test("completion in another tab stops autosave and recovers confirmation after an outage", async ({
  page,
}) => {
  const state = {
    completed: false,
    active: true,
    unavailable: false,
    submits: 0,
    saves: 0,
    starts: 0,
  };
  await install(page, state);
  await page.goto("/intake/completion-test");
  await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();
  state.completed = true;
  state.unavailable = true;
  await page
    .getByRole("textbox", { name: "Name" })
    .fill("Unsaved edit in another tab");
  await expect(
    page.getByRole("heading", { name: "Intake already submitted" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry confirmation" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Name" })).not.toBeVisible();
  state.unavailable = false;
  await page.getByRole("button", { name: "Retry confirmation" }).click();
  await expect(
    page.getByRole("heading", { name: "Intake Submitted Successfully" }),
  ).toBeVisible();
  await expect(
    page.getByText(confirmation.submissionId, { exact: true }),
  ).toBeVisible();
  expect(state.saves).toBe(1);
  expect(state.submits).toBe(0);
  expect(state.starts).toBe(0);
});

test("a separate browser context starts with an empty intake", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    const state = {
      completed: false,
      active: false,
      unavailable: false,
      submits: 0,
      saves: 0,
      starts: 0,
    };
    await install(page, state);
    await page.goto("/intake/completion-test");
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(state.starts).toBe(1);
    expect(state.submits).toBe(0);
    await expect(
      page.getByRole("heading", { name: "Intake Submitted Successfully" }),
    ).not.toBeVisible();
  } finally {
    await context.close();
  }
});
