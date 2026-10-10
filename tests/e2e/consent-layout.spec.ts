import { test, expect } from "@playwright/test";
import { THEME_PRESET_OCEAN } from "../../src/features/themes/domain/presets";

for (const width of [1440, 390]) {
  test(`consent appears once as a plain keyboard-accessible row at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const label =
      "I confirm that this self-assessment is accurate and understand it will be reviewed by a licensed clinician for medical evaluation.";
    const snapshot = {
      publicSlug: "consent-test",
      versionNumber: 1,
      theme: THEME_PRESET_OCEAN,
      definition: {
        schemaVersion: 1,
        title: "Consent layout",
        questions: [
          {
            id: "consent",
            type: "checkbox",
            label,
            required: true,
            visibility: null,
            description: "Please review before checking.",
          },
        ],
      },
    };
    await page.route("**/api/patient/forms/consent-test", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: { ...snapshot, publishedAt: "2026-10-10T00:00:00Z" },
        },
      }),
    );
    await page.route("**/api/patient/forms/consent-test/session", (route) =>
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
    await page.route("**/api/patient/session/progress", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: {
            sessionRevision:
              route.request().postDataJSON().expectedSessionRevision + 1,
            sanitizedAnswers: route.request().postDataJSON().answers,
          },
        },
      }),
    );
    await page.goto("/intake/consent-test");
    const card = page.locator('[data-question-id="consent"]');
    const checkbox = card.getByRole("checkbox");
    const row = card.locator("label");
    await expect(row).toHaveCount(1);
    expect((await card.innerText()).split(label)).toHaveLength(2);
    for (const mode of ["light", "dark"] as const) {
      if (mode === "dark")
        await page.getByRole("button", { name: "Switch to dark mode" }).click();
      for (const checked of [false, true]) {
        if (checked) await row.click();
        await expect(checkbox).toBeChecked({ checked });
        for (const element of [card, row]) {
          await expect(element).toHaveCSS("border-top-width", "0px");
          await expect(element).toHaveCSS("box-shadow", "none");
          await expect(element).toHaveCSS(
            "background-color",
            "rgba(0, 0, 0, 0)",
          );
        }
      }
      await checkbox.focus();
      await page.keyboard.press("Space");
      await expect(checkbox).not.toBeChecked();
    }
    await page
      .getByRole("button", { name: "Submit Responses", exact: true })
      .click();
    await expect(card.getByRole("alert")).toBeVisible();
    await expect(checkbox).toHaveAttribute("aria-invalid", "true");
    await row.click();
    await expect(checkbox).toBeChecked();
    await expect(card.getByRole("alert")).toHaveCount(0);
    await page.screenshot({
      path: `/private/tmp/bask-consent-plain-${width}.png`,
      fullPage: true,
    });
  });
}
