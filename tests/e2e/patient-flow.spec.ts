import { test, expect } from "@playwright/test";

/**
 * Bask Health Intake Studio — Mobile Patient Journey E2E Test
 *
 * Verifies mobile-first patient intake interface:
 * 1. Mobile viewport responsiveness (390 x 844)
 * 2. Published form title & description rendering
 * 3. Reactive question ordering & progress bar
 * 4. Conditional question visibility triggered by answer selection
 * 5. Recovery code modal interaction (presentation, copy, dismiss)
 * 6. Client-side required field validation
 * 7. End-to-end submission and confirmation screen
 */

test.describe("Mobile Patient Intake Journey", () => {
  test.use({
    viewport: { width: 390, height: 844 }, // Mobile viewport (e.g. iPhone 13/14)
    isMobile: true,
    hasTouch: true,
  });

  const mockPublishedForm = {
    success: true,
    data: {
      publicSlug: "clinical-health-intake",
      versionNumber: 1,
      publishedAt: new Date().toISOString(),
      definition: {
        schemaVersion: 1,
        title: "Clinical Health Evaluation",
        description:
          "Please complete this confidential intake form prior to your telehealth consultation.",
        questions: [
          {
            id: "q_full_name",
            type: "short_text",
            label: "Full Legal Name",
            required: true,
            visibility: null,
            validation: { minLength: 2, maxLength: 60 },
          },
          {
            id: "q_consult_reason",
            type: "single_select",
            label: "Primary Reason for Consultation",
            required: true,
            visibility: null,
            options: [
              { id: "opt_weight", label: "Weight Management" },
              { id: "opt_hair", label: "Hair Restoration" },
              { id: "opt_general", label: "General Primary Care" },
            ],
          },
          {
            id: "q_glp1_history",
            type: "long_text",
            label: "Describe any prior GLP-1 or weight loss medication history",
            required: true,
            visibility: {
              parentQuestionId: "q_consult_reason",
              equalsOptionId: "opt_weight",
            },
          },
          {
            id: "q_consent",
            type: "checkbox",
            label:
              "I agree to telehealth medical consultation and consent to treatment",
            required: true,
            visibility: null,
          },
        ],
      },
      theme: {
        presetName: "Ocean",
        isCustomShuffle: false,
        light: {
          background: "#F8FAFC",
          surface: "#FFFFFF",
          textPrimary: "#0F172A",
          textSecondary: "#475569",
          border: "#E2E8F0",
          borderFocus: "#0284C7",
          primaryAction: "#0284C7",
          primaryActionForeground: "#FFFFFF",
          primaryActionHover: "#0369A1",
          secondaryAction: "#F1F5F9",
          secondaryActionForeground: "#0F172A",
          secondaryActionHover: "#E2E8F0",
          focusRing: "#0284C7",
          error: "#DC2626",
          errorBackground: "#FEF2F2",
          errorBorder: "#FCA5A5",
          success: "#15803D",
          successBackground: "#F0FDF4",
          successBorder: "#86EFAC",
          muted: "#94A3B8",
          disabledText: "#94A3B8",
        },
        dark: {
          background: "#0F172A",
          surface: "#1E293B",
          textPrimary: "#F8FAFC",
          textSecondary: "#94A3B8",
          border: "#334155",
          borderFocus: "#38BDF8",
          primaryAction: "#38BDF8",
          primaryActionForeground: "#0F172A",
          primaryActionHover: "#0284C7",
          secondaryAction: "#334155",
          secondaryActionForeground: "#F8FAFC",
          secondaryActionHover: "#475569",
          focusRing: "#38BDF8",
          error: "#F87171",
          errorBackground: "#450A0A",
          errorBorder: "#7F1D1D",
          success: "#4ADE80",
          successBackground: "#052E16",
          successBorder: "#14532D",
          muted: "#64748B",
          disabledText: "#64748B",
        },
      },
    },
  };

  test("completes end-to-end mobile patient flow with conditional logic and recovery modal", async ({
    page,
  }) => {
    // 1. Mock API endpoints for isolated, deterministic execution
    await page.route(
      "**/api/patient/forms/clinical-health-intake",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockPublishedForm),
        });
      },
    );

    await page.route(
      "**/api/patient/forms/clinical-health-intake/session",
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { active: false },
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                sessionId: "sess_mobile_test_1",
                sessionReference: "BKS-MOB1-7788",
                recoveryCode: "BK-7M4P-88XZ-11QR",
                publicSlug: "clinical-health-intake",
                versionNumber: 1,
                definition: mockPublishedForm.data.definition,
                theme: mockPublishedForm.data.theme,
                currentAnswers: {},
                sessionRevision: 1,
              },
            }),
          });
        }
      },
    );

    await page.route("**/api/patient/session/progress", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            sessionRevision: 2,
            sanitizedAnswers: {},
          },
        }),
      });
    });

    await page.route("**/api/patient/session/submit", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            submissionId: "sub_bask_confirmed_9900",
            submittedAt: new Date().toISOString(),
            status: "completed",
            isIdempotentReplay: false,
          },
        }),
      });
    });

    // 2. Navigate to public mobile intake page
    await page.goto("/intake/clinical-health-intake");

    // 3. Verify form title, description, and mobile layout
    await expect(page.locator("h1")).toContainText(
      "Clinical Health Evaluation",
    );
    await expect(
      page.locator("text=Please complete this confidential intake form"),
    ).toBeVisible();

    // 4. Verify initial progress bar state (3 visible questions initially: name, reason, consent)
    const progressBar = page.locator('div[role="progressbar"]');
    await expect(progressBar).toBeVisible();
    await expect(page.locator("text=0 of 3 answered (0%)")).toBeVisible();

    // Conditional dependent question (GLP-1 history) should NOT be visible yet
    await expect(
      page.locator(
        "text=Describe any prior GLP-1 or weight loss medication history",
      ),
    ).not.toBeVisible();

    // 5. Test Recovery Code Modal
    const viewCodeBtn = page.locator(
      "text=Need to finish later? View recovery code",
    );
    await viewCodeBtn.click();
    await expect(
      page.locator("text=Save Your Session Recovery Code"),
    ).toBeVisible();
    await expect(page.getByText("BK-7M4P-88XZ-11QR", { exact: true })).toBeVisible();

    // Close recovery modal
    await page.click("text=I've Saved My Code — Continue");
    await expect(
      page.locator("text=Save Your Session Recovery Code"),
    ).not.toBeVisible();

    // 6. Test Client-Side Required Field Validation
    const submitBtn = page.locator('button:has-text("Submit Responses")');
    await submitBtn.click();

    // Should display validation error banner
    await expect(
      page.locator(
        "text=Please resolve the highlighted questions before submitting",
      ),
    ).toBeVisible();

    // 7. Answer Full Name
    const nameInput = page.locator('input[id^="patient-field-q_full_name"]');
    await nameInput.fill("Eleanor Vance");

    // 8. Trigger Conditional Visibility by selecting "Weight Management"
    const weightRadio = page.locator('input[value="opt_weight"]');
    await weightRadio.check();

    // Verify GLP-1 history is now dynamically rendered!
    const glp1Field = page.locator(
      "text=Describe any prior GLP-1 or weight loss medication history",
    );
    await expect(glp1Field).toBeVisible();

    // Fill GLP-1 history
    const glp1Textarea = page.locator(
      'textarea[id^="patient-field-q_glp1_history"]',
    );
    await glp1Textarea.fill(
      "Previously took Wegovy 0.5mg for 3 months with mild nausea.",
    );

    // 9. Check consent checkbox
    const consentCheckbox = page.locator(
      'input[id^="patient-field-q_consent"]',
    );
    await consentCheckbox.check();

    // 10. Submit complete intake
    await submitBtn.click();

    // 11. Verify Submission Confirmation screen
    await expect(
      page.locator("text=Intake Submitted Successfully"),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=sub_bask_confirmed_9900")).toBeVisible();
    await expect(
      page.locator("text=You may safely close this browser window"),
    ).toBeVisible();
  });
});
