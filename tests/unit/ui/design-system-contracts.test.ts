import { createElement, createRef, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Text, type TextProps } from "@/components/ui/text";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";

describe("Design-system contracts", () => {
  it("excludes className and inline style overrides from public props", () => {
    expectTypeOf<
      "className" extends keyof ButtonProps ? true : false
    >().toEqualTypeOf<false>();
    expectTypeOf<
      "style" extends keyof ButtonProps ? true : false
    >().toEqualTypeOf<false>();
    expectTypeOf<
      "className" extends keyof TextProps ? true : false
    >().toEqualTypeOf<false>();
    expectTypeOf<
      "style" extends keyof TextProps ? true : false
    >().toEqualTypeOf<false>();
    expectTypeOf<
      "className" extends keyof ComponentProps<typeof Td> ? true : false
    >().toEqualTypeOf<false>();
    expectTypeOf<
      "style" extends keyof ComponentProps<typeof Tr> ? true : false
    >().toEqualTypeOf<false>();
  });

  it.each([
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "span",
    "strong",
    "small",
    "code",
  ] as const)(
    "renders a semantic %s independently of its appearance",
    (tag) => {
      const html = renderToStaticMarkup(
        createElement(
          Text,
          { as: tag, variant: "caption", tone: "muted", id: "copy" },
          "Shared copy",
        ),
      );
      expect(html).toMatch(new RegExp(`^<${tag}\\b`));
      expect(html).toContain(`</${tag}>`);
      expect(html).toContain('id="copy"');
      expect(html).toContain("text-caption text-gray-500");
    },
  );

  it("supports typography options without emitting custom props into HTML", () => {
    const html = renderToStaticMarkup(
      createElement(
        Text,
        {
          as: "p",
          variant: "title",
          tone: "intakeSecondary",
          weight: "normal",
          mono: true,
          truncate: true,
          wrap: "preserve",
        },
        "Patient notes",
      ),
    );
    expect(html).toContain("text-intake-text-secondary");
    expect(html).toContain("font-normal");
    expect(html).not.toContain("font-bold");
    expect(html).toContain("font-mono");
    expect(html).toContain("whitespace-pre-wrap");
    expect(html).toContain("truncate");
    expect(html).not.toMatch(/\s(?:variant|tone|mono|truncate)=/);
  });

  it("leaves inline control text inheriting its control's typography", () => {
    const html = renderToStaticMarkup(
      createElement(Text, { variant: "inherit" }, "Save"),
    );
    expect(html).not.toContain("text-gray-900");
    expect(html).not.toContain("text-sm");
  });

  it("supports themed, full-width buttons and preserves loading semantics", () => {
    const html = renderToStaticMarkup(
      createElement(
        Button,
        {
          type: "submit",
          theme: "intake",
          variant: "primary",
          size: "md",
          fullWidth: true,
          loading: true,
          loadingLabel: "Saving",
        },
        "Save",
      ),
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("bg-intake-primary-action");
    expect(html).toContain("focus-visible:outline-intake-focus-ring");
    expect(html).toContain("min-h-touch-target");
    expect(html).toContain("w-full");
    expect(html).toContain("Saving");
    expect(html).not.toMatch(/\s(?:theme|variant|size|fullWidth|loading)=/);
  });

  it("communicates selected segments and keeps independent toggle semantics", () => {
    const selected = renderToStaticMarkup(
      createElement(Button, { variant: "segment", selected: true }, "Preview"),
    );
    const unselected = renderToStaticMarkup(
      createElement(Button, { variant: "segment" }, "Editor"),
    );
    const toggle = renderToStaticMarkup(
      createElement(Button, { "aria-pressed": true }, "Dark"),
    );
    expect(selected).toContain('aria-pressed="true"');
    expect(selected).toContain("bg-white text-gray-900 shadow-sm");
    expect(unselected).toContain('aria-pressed="false"');
    expect(toggle).toContain('aria-pressed="true"');
  });

  it("keeps intake colors and compact typography together", () => {
    const html = renderToStaticMarkup(
      createElement(
        Button,
        { theme: "intake", variant: "secondary", size: "xs" },
        "Save & Exit",
      ),
    );
    expect(html).toContain("bg-intake-surface");
    expect(html).not.toContain("bg-white");
    expect(html).toContain("text-intake-text-primary");
    expect(html).toContain("text-caption");
    expect(html).not.toContain("text-gray-700");
  });

  it("preserves native refs and click handlers", () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const button = Button({ ref, onClick, children: "Save" });
    expect(button.props.ref).toBe(ref);
    expect(button.props.onClick).toBe(onClick);
    const textRef = createRef<HTMLParagraphElement>();
    const text = Text({ as: "p", ref: textRef, children: "Copy" });
    expect(text.props.ref).toBe(textRef);
  });

  it("preserves semantic headers, selection, and responsive table cells", () => {
    const html = renderToStaticMarkup(
      createElement(
        Table,
        { "aria-label": "Forms" },
        createElement(
          Thead,
          null,
          createElement(
            Tr,
            { variant: "header" },
            createElement(Th, { variant: "title" }, "Title"),
            createElement(
              Th,
              { variant: "meta", desktopOnly: true },
              "Version",
            ),
          ),
        ),
        createElement(
          Tbody,
          null,
          createElement(
            Tr,
            { interactive: true, selected: true },
            createElement(
              Td,
              { padding: "roomy", truncate: true },
              "Long form title",
            ),
            createElement(Td, { variant: "actions" }, "Open"),
          ),
        ),
      ),
    );
    expect(html).toContain('aria-label="Forms"');
    expect(html).toContain('scope="col"');
    expect(html).toContain("hidden lg:table-cell");
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("bg-blue-50");
    expect(html).toContain("px-5");
    expect(html).toContain("truncate max-w-xs");
    expect(html).not.toMatch(
      /\s(?:variant|desktopOnly|padding|truncate|interactive|selected)=/,
    );
  });
});
