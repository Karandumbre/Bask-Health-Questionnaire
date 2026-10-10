import { test, expect } from "@playwright/test";
import { THEME_PRESETS } from "../../src/features/themes/domain/presets";
import {
  parseHexColor,
  getContrastRatio,
} from "../../src/features/themes/domain/color";

function cssColor(hex: string) {
  const { r, g, b } = parseHexColor(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

for (const width of [1440, 390]) {
  for (const [name, theme] of Object.entries(THEME_PRESETS)) {
    test(`patient input contrast in ${name} light/dark at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const snapshot = {
        publicSlug: "theme-test",
        versionNumber: 1,
        theme,
        definition: {
          schemaVersion: 1,
          title: "Theme check",
          questions: [
            {
              id: "name",
              type: "short_text",
              label: "Name",
              required: false,
              visibility: null,
            },
            {
              id: "notes",
              type: "long_text",
              label: "Notes",
              required: false,
              visibility: null,
            },
            {
              id: "age",
              type: "number",
              label: "Age",
              required: false,
              visibility: null,
            },
          ],
        },
      };
      await page.route("**/api/patient/forms/theme-test", (route) =>
        route.fulfill({
          json: {
            success: true,
            data: { ...snapshot, publishedAt: "2026-10-10T00:00:00Z" },
          },
        }),
      );
      await page.route("**/api/patient/forms/theme-test/session", (route) =>
        route.fulfill({
          json: {
            success: true,
            data: {
              active: true,
              ...snapshot,
              sessionId: "fixture-session",
              sessionReference: "BKS-TEST-1234",
              status: "in_progress",
              sessionRevision: 1,
              currentAnswers: {
                name: "Synthetic Patient",
                notes: "Synthetic notes",
                age: 18,
              },
            },
          },
        }),
      );
      await page.goto("/intake/theme-test");
      for (const mode of ["light", "dark"] as const) {
        if (mode === "dark")
          await page
            .getByRole("button", { name: "Switch to dark mode" })
            .click();
        await expect(
          page.locator("[data-patient-progress-bar]"),
        ).toHaveAttribute("data-theme-mode", mode);
        for (const id of ["name", "notes", "age"]) {
          const control = page
            .locator(`[data-question-id="${id}"]`)
            .locator("input, textarea");
          await expect(control).not.toHaveValue("");
          await expect(control).toHaveCSS(
            "background-color",
            cssColor(theme[mode].surface),
          );
          await expect(control).toHaveCSS(
            "color",
            cssColor(theme[mode].textPrimary),
          );
          expect(
            await control.evaluate(
              (element) => getComputedStyle(element, "::placeholder").color,
            ),
          ).toBe(cssColor(theme[mode].textSecondary));
          expect(
            getContrastRatio(theme[mode].textPrimary, theme[mode].surface),
          ).toBeGreaterThanOrEqual(4.5);
          expect(
            getContrastRatio(theme[mode].textSecondary, theme[mode].surface),
          ).toBeGreaterThanOrEqual(4.5);
          await control.focus();
          await expect(control).toHaveCSS(
            "border-color",
            cssColor(theme[mode].borderFocus),
          );
        }
        if (name === "Ocean" && mode === "dark")
          await page.screenshot({
            path: `/private/tmp/bask-patient-dark-${width}.png`,
            fullPage: true,
          });
      }
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    });
  }
}
