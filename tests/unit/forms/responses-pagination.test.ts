import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { ResponsesView } from "@/features/forms/components/ResponsesView";
import type { SubmissionListItem } from "@/features/forms/client/responses-api";

describe("ResponsesView pagination", () => {
  const fixtureSubmissions: SubmissionListItem[] = Array.from(
    { length: 50 },
    (_, i) => ({
      id: `sub_${i}`,
      sessionId: `sess_${i}`,
      sessionReference: `REF-${i}`,
      formName: "Intake Form",
      publishedVersionId: "ver_1",
      versionNumber: 1,
      answerSnapshot: {},
      status: "completed",
      submittedAt: new Date(2026, 0, 1, 10, i).toISOString(),
    }),
  );

  it("renders pagination controls and total count when totalCount exceeds PAGE_SIZE (50)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ResponsesView, {
        formId: "form_1",
        formName: "Intake Form",
        initialSubmissions: fixtureSubmissions,
        initialTotalCount: 55,
      }),
    );

    expect(html).toContain("55 Completed Responses");
    expect(html).toContain("Responses (55)");
    expect(html).toContain("Showing 1–50 of 55 responses");
    expect(html).toContain("Page 1 of 2");
    expect(html).toContain("Next");
    expect(html).toContain("Previous");
  });

  it("does not render pagination controls when totalCount is within single page", () => {
    const html = renderToStaticMarkup(
      React.createElement(ResponsesView, {
        formId: "form_1",
        formName: "Intake Form",
        initialSubmissions: fixtureSubmissions.slice(0, 10),
        initialTotalCount: 10,
      }),
    );

    expect(html).toContain("10 Completed Responses");
    expect(html).not.toContain("Page 1 of");
    expect(html).not.toContain("Showing 1–");
  });
});
