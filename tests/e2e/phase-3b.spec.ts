import {
  readEnvironment,
  ENVIRONMENT_DEFAULTS,
  ENVIRONMENT_KEYS,
  ENVIRONMENT_VALUES,
} from "../../config/environment.mjs";
import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  THEME_PRESET_OCEAN,
  THEME_PRESET_EMERALD,
} from "../../src/features/themes/domain/presets";

/**
 * Phase 3B — end-to-end journeys against the real Next.js server and the
 * designated test database. Nothing is mocked except one deliberately
 * dropped network response in the submission-retry journey.
 */

const BASE_URL =
  readEnvironment(ENVIRONMENT_KEYS.PLAYWRIGHT_BASE_URL) ||
  ENVIRONMENT_DEFAULTS.PLAYWRIGHT_BASE_URL;
const ORIGIN = new URL(BASE_URL).origin;

const LABEL_NAME_V1 = "Full legal name";
const LABEL_NAME_V2 = "Patient full legal name (revised)";

function definition(nameLabel: string) {
  return {
    schemaVersion: 1,
    title: "E2E Smoking History Intake",
    description: "Phase 3B browser verification form.",
    questions: [
      {
        id: "q_name",
        type: "short_text",
        label: nameLabel,
        required: true,
        visibility: null,
        validation: { minLength: 2, maxLength: 80 },
      },
      {
        id: "q_smoker",
        type: "single_select",
        label: "Do you currently smoke?",
        required: true,
        visibility: null,
        options: [
          { id: "opt_yes", label: "Yes" },
          { id: "opt_no", label: "No" },
        ],
      },
      {
        id: "q_packs",
        type: "number",
        label: "Packs per day",
        required: true,
        visibility: { parentQuestionId: "q_smoker", equalsOptionId: "opt_yes" },
        validation: { min: 0, max: 10, integerOnly: true },
      },
      {
        id: "q_consent",
        type: "checkbox",
        label: "I confirm this information is accurate",
        required: true,
        visibility: null,
      },
    ],
  };
}

interface Fixture {
  formId: string;
  slugV1: string;
  slugV2: string;
}

let fixture: Fixture;
let adminContext: BrowserContext;

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.fill("#email", "reviewer@baskhealth.com");
  await page.fill("#password", "ClinicalReview2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin/forms", { timeout: 15000 });
}

async function api<T>(
  page: Page,
  method: "POST" | "PATCH" | "GET",
  url: string,
  data?: unknown,
): Promise<T> {
  const response = await page.request.fetch(url, {
    method,
    data,
    headers: { origin: ORIGIN },
  });
  expect(response.ok(), `${method} ${url} -> ${response.status()}`).toBe(true);
  return (await response.json()) as T;
}

async function createPublishedFixture(browser: Browser): Promise<Fixture> {
  adminContext = await browser.newContext();
  const page = await adminContext.newPage();
  await login(page);

  const created = await api<{ form: { id: string } }>(
    page,
    "POST",
    "/api/admin/forms",
    { name: `E2E Phase3B ${Date.now()}` },
  );
  const formId = created.form.id;

  const draft = await api<{ draft: { revision: number } }>(
    page,
    "GET",
    `/api/admin/forms/${formId}`,
  );
  let revision = draft.draft.revision;

  const save = async (nameLabel: string, theme: unknown) => {
    const saved = await api<{ revision: number }>(
      page,
      "PATCH",
      `/api/admin/forms/${formId}`,
      { definition: definition(nameLabel), theme, expectedRevision: revision },
    );
    revision = saved.revision;
  };
  const publish = async () => {
    const result = await api<{ publicSlug: string; revision?: number }>(
      page,
      "POST",
      `/api/admin/forms/${formId}/publish`,
      { expectedRevision: revision, operationId: crypto.randomUUID() },
    );
    // Publishing advances the draft revision.
    const reloaded = await api<{ draft: { revision: number } }>(
      page,
      "GET",
      `/api/admin/forms/${formId}`,
    );
    revision = reloaded.draft.revision;
    return result.publicSlug;
  };

  await save(LABEL_NAME_V1, THEME_PRESET_OCEAN);
  const slugV1 = await publish();
  await save(LABEL_NAME_V2, THEME_PRESET_EMERALD);
  const slugV2 = await publish();
  await page.close();
  return { formId, slugV1, slugV2 };
}

const nameInput = (page: Page) =>
  page.locator('input[id^="patient-field-q_name"]');
const packsInput = (page: Page) =>
  page.locator('input[id^="patient-field-q_packs"]');
const savedIndicator = (page: Page) =>
  page
    .locator("[data-patient-progress-bar]")
    .getByText("Saved", { exact: true });

async function readRecoveryCredentials(page: Page) {
  const refText = await page.getByText(/^Ref: /).innerText();
  await page.getByRole("button", { name: /View recovery code/ }).click();
  const dialog = page.getByRole("dialog");
  const code = (
    await dialog.locator("span.font-mono").first().innerText()
  ).trim();
  await dialog.getByRole("button", { name: /Saved My Code/ }).click();
  return { reference: refText.replace("Ref: ", "").trim(), code };
}

test.describe("Phase 3B journeys (real backend)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    const env =
      readEnvironment(ENVIRONMENT_KEYS.NODE_ENV) ||
      readEnvironment(ENVIRONMENT_KEYS.APP_ENV) ||
      ENVIRONMENT_DEFAULTS.EMPTY;
    if (env.toLowerCase() === ENVIRONMENT_VALUES.PRODUCTION) {
      throw new Error("Phase 3B E2E tests must never run against production.");
    }
    fixture = await createPublishedFixture(browser);
  });

  test.afterAll(async () => {
    await adminContext?.close();
  });

  test("two-browser resume restores saved progress with recovery credentials", async ({
    browser,
  }) => {
    const first = await browser.newContext();
    const second = await browser.newContext();
    try {
      const pageA = await first.newPage();
      await pageA.goto(`/intake/${fixture.slugV1}`);
      await nameInput(pageA).fill("Ada Lovelace");
      await expect(savedIndicator(pageA)).toBeVisible({ timeout: 15000 });
      const { reference, code } = await readRecoveryCredentials(pageA);
      expect(code).toMatch(/^BK-/);

      const pageB = await second.newPage();
      await pageB.goto(`/intake/${fixture.slugV1}`);
      await expect(nameInput(pageB)).toHaveValue("");
      await pageB.getByRole("button", { name: "Resume with code" }).click();
      await pageB.fill("#resume-session-ref", reference);
      await pageB.fill("#resume-recovery-code", code);
      await pageB.getByRole("button", { name: "Restore Progress" }).click();
      await expect(nameInput(pageB)).toHaveValue("Ada Lovelace", {
        timeout: 15000,
      });

      // The redeemed code is single-use: a third attempt is rejected.
      const third = await browser.newContext();
      const pageC = await third.newPage();
      await pageC.goto(`/intake/${fixture.slugV1}`);
      await pageC.getByRole("button", { name: "Resume with code" }).click();
      await pageC.fill("#resume-session-ref", reference);
      await pageC.fill("#resume-recovery-code", code);
      await pageC.getByRole("button", { name: "Restore Progress" }).click();
      await expect(pageC.getByRole("dialog").getByRole("alert")).toBeVisible();
      await third.close();
    } finally {
      await first.close();
      await second.close();
    }
  });

  test("dynamic visibility shows, hides and prunes dependent answers", async ({
    page,
  }) => {
    await page.goto(`/intake/${fixture.slugV1}`);
    await expect(packsInput(page)).toHaveCount(0);

    await page.locator('input[value="opt_yes"]').check();
    await expect(packsInput(page)).toBeVisible();
    await packsInput(page).fill("3");

    await page.locator('input[value="opt_no"]').check();
    await expect(packsInput(page)).toHaveCount(0);
    await expect(savedIndicator(page)).toBeVisible({ timeout: 15000 });

    // Reload: the server-persisted progress must not contain the hidden answer.
    await page.reload();
    await expect(page.locator('input[value="opt_no"]')).toBeChecked({
      timeout: 15000,
    });
    await page.locator('input[value="opt_yes"]').check();
    await expect(packsInput(page)).toHaveValue("");
  });

  test("submission retry after a lost response yields exactly one confirmed response", async ({
    page,
  }) => {
    await page.goto(`/intake/${fixture.slugV1}`);
    await nameInput(page).fill("Retry Patient");
    await page.locator('input[value="opt_no"]').check();
    await page.locator('input[id^="patient-field-q_consent"]').check();
    const reference = (await page.getByText(/^Ref: /).innerText())
      .replace("Ref: ", "")
      .trim();

    // Let the first submit reach the server and commit, then drop the response.
    let dropped = false;
    await page.route("**/api/patient/session/submit", async (route) => {
      if (!dropped) {
        dropped = true;
        await route.fetch();
        await route.abort("failed");
        return;
      }
      await route.continue();
    });

    const submit = page.getByRole("button", { name: "Submit Responses" });
    await submit.click();
    await expect(page.getByRole("alert").first()).toBeVisible({
      timeout: 15000,
    });
    await submit.click();
    await expect(page.getByText("Intake Submitted Successfully")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText(/previously submitted and confirmed/),
    ).toBeVisible();

    // Admin sees exactly one response for this session.
    const admin = await adminContext.newPage();
    await admin.goto(`/admin/forms/${fixture.formId}/responses`);
    await expect(
      admin.getByRole("table", { name: "Clinical Form Responses" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      admin.getByRole("row").filter({ hasText: reference }),
    ).toHaveCount(1);
    await admin.close();
  });

  test("historical versions keep their own labels and theme", async ({
    page,
  }) => {
    await page.goto(`/intake/${fixture.slugV1}`);
    await expect(page.getByText(LABEL_NAME_V1, { exact: false })).toBeVisible();
    await expect(page.getByText(LABEL_NAME_V2)).toHaveCount(0);
    const v1Primary = await page
      .locator("main[data-patient-theme]")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--theme-primary-action").trim(),
      );
    expect(v1Primary.toUpperCase()).toBe(
      THEME_PRESET_OCEAN.light.primaryAction.toUpperCase(),
    );

    await page.goto(`/intake/${fixture.slugV2}`);
    await expect(page.getByText(LABEL_NAME_V2)).toBeVisible();
    const v2Primary = await page
      .locator("main[data-patient-theme]")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--theme-primary-action").trim(),
      );
    expect(v2Primary.toUpperCase()).toBe(
      THEME_PRESET_EMERALD.light.primaryAction.toUpperCase(),
    );
  });

  test("response list and detail render snapshot labels and typed answers", async () => {
    const admin = await adminContext.newPage();
    await admin.goto(`/admin/forms/${fixture.formId}/responses`);
    const table = admin.getByRole("table", { name: "Clinical Form Responses" });
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(
      table.getByRole("columnheader", { name: "Version" }),
    ).toBeVisible();

    await table
      .getByRole("button", { name: /View Detail/ })
      .first()
      .click();
    const dialog = admin.getByRole("dialog");
    await expect(dialog.getByText("Intake Response Detail")).toBeVisible({
      timeout: 15000,
    });
    await expect(dialog.getByText(/Submitted .* · Version 1$/)).toBeVisible();
    await expect(dialog.getByText(LABEL_NAME_V1)).toBeVisible();
    await expect(dialog.getByText(LABEL_NAME_V2)).toHaveCount(0);
    await expect(dialog.getByTestId("response-field-q_smoker")).toContainText(
      "No",
    );

    await admin.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await admin.close();
  });

  test("theme preset, Shuffle, autosave and reload persist in the builder", async () => {
    const admin = await adminContext.newPage();
    await admin.goto(`/admin/forms/${fixture.formId}/edit`);
    const preset = admin.locator("#theme-preset");
    await expect(preset).toBeVisible({ timeout: 15000 });

    const slateSave = admin.waitForResponse(
      (res) =>
        res.url().includes(`/api/admin/forms/${fixture.formId}`) &&
        res.request().method() === "PATCH" &&
        res.status() === 200,
    );
    await preset.selectOption("Slate");
    await slateSave;
    await expect(
      admin.locator('[role="status"]:has-text("Saved")'),
    ).toBeVisible({
      timeout: 15000,
    });
    await admin.reload();
    await expect(admin.locator("#theme-preset")).toHaveValue("Slate", {
      timeout: 15000,
    });

    const draftTheme = async () =>
      (
        await api<{ theme: { presetName: string; isCustomShuffle: boolean } }>(
          admin,
          "GET",
          `/api/admin/forms/${fixture.formId}`,
        )
      ).theme;

    const shuffle1Save = admin.waitForResponse(
      (res) =>
        res.url().includes(`/api/admin/forms/${fixture.formId}`) &&
        res.request().method() === "PATCH" &&
        res.status() === 200,
    );
    await admin.getByRole("button", { name: "Shuffle" }).click();
    await shuffle1Save;
    await expect(admin.locator("#theme-preset")).toHaveValue("custom");
    await expect
      .poll(async () => (await draftTheme()).isCustomShuffle, {
        timeout: 15000,
      })
      .toBe(true);
    const firstShuffle = (await draftTheme()).presetName;

    const shuffle2Save = admin.waitForResponse(
      (res) =>
        res.url().includes(`/api/admin/forms/${fixture.formId}`) &&
        res.request().method() === "PATCH" &&
        res.status() === 200,
    );
    await admin.getByRole("button", { name: "Shuffle" }).click();
    await shuffle2Save;
    await expect
      .poll(async () => (await draftTheme()).presetName, { timeout: 15000 })
      .not.toBe(firstShuffle);

    await admin.reload();
    await expect(admin.locator("#theme-preset")).toHaveValue("custom", {
      timeout: 15000,
    });

    // Published v1 remains on Ocean despite later draft theme edits.
    const patient = await adminContext.newPage();
    await patient.goto(`/intake/${fixture.slugV1}`);
    const v1Primary = await patient
      .locator("main[data-patient-theme]")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--theme-primary-action").trim(),
      );
    expect(v1Primary.toUpperCase()).toBe(
      THEME_PRESET_OCEAN.light.primaryAction.toUpperCase(),
    );
    await patient.close();
    await admin.close();
  });

  test("patient intake is fully keyboard operable", async ({ page }) => {
    await page.goto(`/intake/${fixture.slugV1}`);
    await expect(nameInput(page)).toBeVisible();

    // Tab forward until the first answer field receives focus.
    for (let i = 0; i < 15; i++) {
      if (await nameInput(page).evaluate((el) => el === document.activeElement))
        break;
      await page.keyboard.press("Tab");
    }
    await expect(nameInput(page)).toBeFocused();
    await page.keyboard.type("Keyboard User");

    await page.keyboard.press("Tab");
    await expect(page.locator('input[value="opt_yes"]')).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.locator('input[value="opt_yes"]')).toBeChecked();
    await expect(packsInput(page)).toBeVisible();

    // Theme toggle is a real, labelled toggle button.
    const toggle = page.getByRole("button", { name: "Switch to dark mode" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Switch to light mode" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Modal dialog opens from the keyboard and closes with Escape.
    await page.getByRole("button", { name: /View recovery code/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test.describe("mobile viewport", () => {
    test.use({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });

    test("has no horizontal overflow and Next Required jumps to the first gap", async ({
      page,
    }) => {
      await page.goto(`/intake/${fixture.slugV1}`);
      await expect(nameInput(page)).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      await nameInput(page).fill("Mobile Patient");
      const jump = page.getByRole("button", {
        name: /Jump to next required question/,
      });
      await expect(jump).toContainText("Next Required (2)");
      await jump.click();
      await expect(page.locator('input[value="opt_yes"]')).toBeFocused();
    });
  });
});
