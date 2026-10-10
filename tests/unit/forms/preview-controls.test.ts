import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select } from "@/components/ui/input";
import { QuestionInput } from "@/features/forms/components/QuestionInput";
import type { Question } from "@/features/forms/domain/types";

describe("Preview controls", () => {
  it("renders a native select with an inset decorative arrow", () => {
    const html = renderToStaticMarkup(
      createElement(
        Select,
        { id: "theme" },
        createElement("option", null, "Ocean"),
      ),
    );
    expect(html).toContain('id="theme"');
    expect(html).toContain("appearance-none pr-9");
    expect(html).toContain("pointer-events-none");
    expect(html).toContain('aria-hidden="true"');
  });

  it.each([
    "short_text",
    "long_text",
    "number",
    "checkbox",
    "single_select",
    "multi_select",
  ] as const)("uses one red required marker for %s", (type) => {
    const question = {
      id: "required-question",
      type,
      label: "Required question",
      required: true,
      visibility: null,
      ...(type === "single_select" || type === "multi_select"
        ? {
            options: [
              { id: "one", label: "One" },
              { id: "two", label: "Two" },
            ],
          }
        : {}),
    } as Question;
    const html = renderToStaticMarkup(
      createElement(QuestionInput, {
        question,
        answers: {},
        onAnswerChange: () => {},
      }),
    );
    expect(
      html.match(/<span class="ml-1 text-red-600">\*<\/span>/g),
    ).toHaveLength(1);
    expect(html).not.toContain("Required question *");
  });
});
