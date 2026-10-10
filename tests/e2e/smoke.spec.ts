import { test, expect } from "@playwright/test";

/**
 * Bask Health Intake Studio — End-to-End Administrator Smoke Test
 *
 * Verifies the complete administrator workflow:
 * 1. Login
 * 2. Create draft
 * 3. Add and edit questions
 * 4. Configure visibility
 * 5. Trigger autosave
 * 6. Reload and verify persistence
 * 7. Break a dependency and verify publish is blocked
 * 8. Fix it and publish successfully
 */

test.describe("Administrator Form Builder Smoke Flow", () => {
  test.beforeEach(() => {
    // Safety guard: Never execute destructive browser tests against production
    const env = process.env.NODE_ENV || process.env.APP_ENV || "";
    if (env.toLowerCase() === "production") {
      throw new Error(
        "Destructive E2E smoke tests are strictly forbidden against production!",
      );
    }
  });

  test("full administrator lifecycle from draft creation to publication", async ({
    page,
  }) => {
    page.on("console", (msg) =>
      console.log("[CONSOLE]", msg.type(), msg.text()),
    );
    page.on("response", (res) =>
      console.log("[HTTP]", res.status(), res.request().method(), res.url()),
    );
    page.on("requestfailed", (req) =>
      console.log(
        "[HTTP FAILED]",
        req.method(),
        req.url(),
        req.failure()?.errorText,
      ),
    );

    // -------------------------------------------------------------------------
    // 1. Login
    // -------------------------------------------------------------------------
    await page.goto("/admin/login");
    await expect(page).toHaveTitle(/Intake Studio|Bask/i);

    await page.fill("#email", "reviewer@baskhealth.com");
    await page.fill("#password", "ClinicalReview2026!");
    await page.click('button[type="submit"]');

    // Wait for redirect to forms dashboard
    await page.waitForURL("**/admin/forms", { timeout: 15000 });
    await expect(page.locator("text=Clinical Intake Forms")).toBeVisible();

    // -------------------------------------------------------------------------
    // 2. Create draft
    // -------------------------------------------------------------------------
    const uniqueFormTitle = `E2E GLP-1 Intake ${Date.now()}`;
    await page.click('button:has-text("Create New Form")');
    await page.waitForSelector("#new-form-name");
    await page.fill("#new-form-name", uniqueFormTitle);
    await page.click('button:has-text("Create & Open")');

    // Navigates to builder edit page
    await page.waitForURL("**/admin/forms/**/edit", { timeout: 15000 });
    await expect(page.locator("header")).toBeVisible();
    await expect(
      page.locator("header").locator(`text=${uniqueFormTitle}`),
    ).toBeVisible();

    // -------------------------------------------------------------------------
    // 3. Add and edit questions
    // -------------------------------------------------------------------------
    // Add Question 1: Single select
    await page.click('button:has-text("Add Field")');
    await page.click('button:has-text("Single Select")');

    await expect(page.locator("#question-label-input")).toBeVisible();
    await page.fill(
      "#question-label-input",
      "Do you have a history of pancreatitis?",
    );
    // Toggle required
    await page.click("#question-required-toggle");

    // Add Question 2: Short text
    await page.click('button:has-text("Add Field")');
    await page.click('button:has-text("Short Text")');
    await expect(page.locator("#question-label-input")).toBeVisible();
    await page.fill(
      "#question-label-input",
      "Describe any current symptoms and treatments",
    );

    // -------------------------------------------------------------------------
    // 4. Configure visibility
    // -------------------------------------------------------------------------
    await page.click("#cond-toggle");
    await expect(
      page.locator("text=Condition is valid and active"),
    ).toBeVisible();

    // -------------------------------------------------------------------------
    // 5. Trigger autosave
    // -------------------------------------------------------------------------
    // Wait for debounced autosave to persist to the database (revision advances past rev 0)
    await expect(page.locator("header").locator("text=rev 0")).not.toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[role="status"]:has-text("Saved")')).toBeVisible(
      { timeout: 15000 },
    );

    // -------------------------------------------------------------------------
    // 6. Reload and verify persistence
    // -------------------------------------------------------------------------
    await page.reload();
    await expect(
      page.locator("text=Do you have a history of pancreatitis?").first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator("text=Describe any current symptoms and treatments").first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Conditional").first()).toBeVisible();

    // -------------------------------------------------------------------------
    // 7. Break a dependency and verify publish is blocked
    // -------------------------------------------------------------------------
    // Select the first question (parent) and break the dependency by making it optional
    await page
      .locator("text=Do you have a history of pancreatitis?")
      .first()
      .click();
    await page.waitForSelector("#question-required-toggle");
    const revBeforeBreak = await page
      .locator("header span.font-mono")
      .innerText();

    // Turn required off
    await page.click("#question-required-toggle");

    // Wait for autosave to capture the edit
    await expect(page.locator("header span.font-mono")).not.toHaveText(
      revBeforeBreak,
      { timeout: 15000 },
    );
    await expect(page.locator('[role="status"]:has-text("Saved")')).toBeVisible(
      { timeout: 15000 },
    );

    // Open Publish Modal
    await page.locator('header button:has-text("Publish")').click();

    // Confirm that publish is blocked with a validation error
    await expect(page.locator("text=Cannot Publish")).toBeVisible();
    await expect(
      page.locator("text=Condition parent question must be required"),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Confirm & Publish")'),
    ).toBeDisabled();

    // -------------------------------------------------------------------------
    // 8. Fix it and publish successfully
    // -------------------------------------------------------------------------
    // Close publish modal
    await page.click('button:has-text("Cancel")');

    // Fix the dependency: toggle required back on
    const revBeforeFix = await page
      .locator("header span.font-mono")
      .innerText();
    await page.click("#question-required-toggle");
    await expect(page.locator("header span.font-mono")).not.toHaveText(
      revBeforeFix,
      { timeout: 15000 },
    );
    await expect(page.locator('[role="status"]:has-text("Saved")')).toBeVisible(
      { timeout: 15000 },
    );

    // Open Publish Modal again
    await page.locator('header button:has-text("Publish")').click();
    await expect(page.locator("text=Publish Readiness Summary")).toBeVisible();

    const confirmPublishButton = page.locator(
      'button:has-text("Confirm & Publish")',
    );
    await expect(confirmPublishButton).toBeEnabled();
    await confirmPublishButton.click();

    // Verify publication success
    await expect(page.locator("text=Form Published Successfully!")).toBeVisible(
      { timeout: 15000 },
    );
    await expect(page.locator("text=Version 1 Created")).toBeVisible();
    await expect(page.locator('input[value*="/intake/"]')).toBeVisible();

    // Close publish modal
    await page.click('button:has-text("Done")');
  });
});
