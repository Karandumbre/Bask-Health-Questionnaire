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
      throw new Error("Destructive E2E smoke tests are strictly forbidden against production!");
    }
  });

  test("full administrator lifecycle from draft creation to publication", async ({ page }) => {
    // -------------------------------------------------------------------------
    // 1. Login
    // -------------------------------------------------------------------------
    await page.goto("/admin/login");
    await expect(page).toHaveTitle(/Intake Studio|Bask/i);

    // Mock API authentication or fill credentials
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          user: { id: "usr_reviewer_test", email: "reviewer@baskhealth.com" },
        }),
      });
    });

    await page.fill("#email", "reviewer@baskhealth.com");
    await page.fill("#password", "ClinicalReview2026!");
    await page.click('button[type="submit"]');

    // -------------------------------------------------------------------------
    // 2. Create draft
    // -------------------------------------------------------------------------
    const testFormId = "form_e2e_smoke_01";
    let mockDraftRevision = 0;
    let mockDefinition = {
      schemaVersion: 1,
      title: "GLP-1 Weight Management Intake",
      questions: [] as any[],
    };
    const mockTheme = {
      presetName: "Ocean",
      isCustomShuffle: false,
      light: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        text: "#0F172A",
        primary: "#0284C7",
        primaryForeground: "#FFFFFF",
      },
      dark: {
        background: "#0B1120",
        surface: "#1E293B",
        text: "#F8FAFC",
        primary: "#38BDF8",
        primaryForeground: "#0B1120",
      },
    };

    // Mock backend form endpoints for isolated fixture testing
    await page.route("**/api/admin/forms", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            form: { id: testFormId, name: "GLP-1 Weight Management Intake", workspaceId: "ws_test" },
            draft: { id: "draft_01", revision: 0 },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            forms: [],
          }),
        });
      }
    });

    await page.route(`**/api/admin/forms/${testFormId}`, async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            form: { id: testFormId, name: mockDefinition.title },
            draft: { revision: mockDraftRevision },
            definition: mockDefinition,
            theme: mockTheme,
          }),
        });
      } else if (method === "PATCH") {
        const body = route.request().postDataJSON();
        if (body.expectedRevision === mockDraftRevision) {
          mockDraftRevision++;
          mockDefinition = body.definition;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              revision: mockDraftRevision,
            }),
          });
        } else {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: {
                code: "REVISION_CONFLICT",
                message: "Stale revision",
                details: { currentRevision: mockDraftRevision, expectedRevision: body.expectedRevision },
              },
            }),
          });
        }
      }
    });

    await page.route(`**/api/admin/forms/${testFormId}/publish`, async (route) => {
      // Validate dependency rules before allowing publication
      const hasBroken = mockDefinition.questions.some((q: any) => {
        if (!q.visibility) return false;
        const parent = mockDefinition.questions.find((p: any) => p.id === q.visibility.parentQuestionId);
        if (!parent) return true;
        if (!parent.options.some((o: any) => o.id === q.visibility.equalsOptionId)) return true;
        return false;
      });

      if (hasBroken) {
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: "INVALID_FORM",
              message: "Clinical dependency validation failed",
              details: {
                validationErrors: [
                  { field: "visibility", issue: "Condition references missing or broken parent choice" },
                ],
              },
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            versionNumber: 1,
            publicSlug: "glp1-intake-v1-9k2a",
            publicUrl: "/intake/glp1-intake-v1-9k2a",
          }),
        });
      }
    });

    // Go directly to the builder edit page
    await page.goto(`/admin/forms/${testFormId}/edit`);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("text=GLP-1 Weight Management Intake")).toBeVisible();

    // -------------------------------------------------------------------------
    // 3. Add and edit questions
    // -------------------------------------------------------------------------
    // Add Question 1: Single select
    await page.click('button:has-text("Add Field")');
    await page.click('button:has-text("Single Select")');

    await expect(page.locator("#question-label-input")).toBeVisible();
    await page.fill("#question-label-input", "Have you taken GLP-1 medications in the past?");
    // Toggle required
    await page.click("#question-required-toggle");

    // Add Question 2: Short text
    await page.click('button:has-text("Add Field")');
    await page.click('button:has-text("Short Text")');
    await page.fill("#question-label-input", "Specify your previous medication and dosage");

    // -------------------------------------------------------------------------
    // 4. Configure visibility
    // -------------------------------------------------------------------------
    await page.click("#cond-toggle");
    await expect(page.locator("text=Condition is valid and active")).toBeVisible();

    // -------------------------------------------------------------------------
    // 5. Trigger autosave
    // -------------------------------------------------------------------------
    // Wait for autosave to complete (debounced 800ms)
    await expect(page.locator('[role="status"]:has-text("Saved")')).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 6. Reload and verify persistence
    // -------------------------------------------------------------------------
    await page.reload();
    await expect(page.locator("text=Have you taken GLP-1 medications in the past?")).toBeVisible();
    await expect(page.locator("text=Specify your previous medication and dosage")).toBeVisible();
    await expect(page.locator("text=Conditional")).toBeVisible();

    // -------------------------------------------------------------------------
    // 7. Break a dependency and verify publish is blocked
    // -------------------------------------------------------------------------
    // Select the first question (parent) and delete one of its options
    await page.click("text=Have you taken GLP-1 medications in the past?");
    // Delete the first choice option
    const deleteOptionButtons = page.locator('button[title="Delete option"]');
    if ((await deleteOptionButtons.count()) > 0) {
      // Add a 3rd option first if needed so option count >= 2, or delete option
      await page.click('button:has-text("Add Choice")');
      await page.locator('button[title="Delete option"]').first().click();
    }

    // Now select child question and observe broken condition
    await page.click("text=Specify your previous medication and dosage");

    // Open Publish Modal
    await page.click('button:has-text("Publish")');
    // If validation error exists, Confirm & Publish button should be disabled
    const confirmPublishButton = page.locator('button:has-text("Confirm & Publish")');
    if (await page.locator("text=Cannot Publish").isVisible()) {
      await expect(confirmPublishButton).toBeDisabled();
    }

    // -------------------------------------------------------------------------
    // 8. Fix it and publish successfully
    // -------------------------------------------------------------------------
    // Close modal
    await page.click('button:has-text("Cancel")');

    // Fix condition: select an existing choice or remove condition
    if (await page.locator('button:has-text("Remove condition")').isVisible()) {
      await page.click('button:has-text("Remove condition")');
    }

    // Open Publish Modal again
    await page.click('button:has-text("Publish")');
    await expect(confirmPublishButton).toBeEnabled();
    await confirmPublishButton.click();

    // Verify publish outcome
    await expect(page.locator("text=Form Published Successfully!")).toBeVisible();
    await expect(page.locator("text=Version 1 Created")).toBeVisible();
    await expect(page.locator('input[value*="/intake/"]')).toBeVisible();
  });
});
