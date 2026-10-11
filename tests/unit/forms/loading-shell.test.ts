import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import {
  EditorLoading,
  FormsLoading,
} from "@/features/forms/components/FormLoading";
import { APP_MESSAGES } from "@/lib/constants/messages";

describe("forms loading shells", () => {
  it("shows dashboard identity and headings before data", () => {
    const html = renderToStaticMarkup(React.createElement(FormsLoading));
    for (const label of [
      APP_MESSAGES.BASK_HEALTH_INTAKE_STUDIO,
      APP_MESSAGES.CLINICAL_INTAKE_FORMS,
      APP_MESSAGES.REFRESH,
      APP_MESSAGES.CREATE_NEW_FORM,
    ])
      expect(html).toContain(label);
    expect(html).not.toContain('<div aria-hidden="true"><header');
  });
  it("shows editor navigation and panel headings before the draft", () => {
    const html = renderToStaticMarkup(React.createElement(EditorLoading));
    for (const label of [
      APP_MESSAGES.FORM_QUESTIONS,
      APP_MESSAGES.QUESTION_SETTINGS,
      APP_MESSAGES.EDITOR,
      APP_MESSAGES.PATIENT_PREVIEW,
      APP_MESSAGES.PUBLISH,
    ])
      expect(html).toContain(label);
    expect(html).toContain('href="/admin/forms"');
    expect(html).toContain('disabled=""');
  });
});
