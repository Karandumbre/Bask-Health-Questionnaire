import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { COMPONENT_STYLES } from "@/design-system/component-styles";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { ROUTES } from "@/lib/constants/application";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Dialog, DialogHeader, DialogActions } from "@/components/ui/dialog";
import { FormField, CheckboxField } from "@/components/ui/form-field";
import * as Icons from "@/components/ui/icons";
import { Input, Textarea, Select } from "@/components/ui/input";
import { RouteError, RouteLoading } from "@/components/ui/route-feedback";
import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/table";

describe("Common UI primitives (src/components/ui)", () => {
  describe("Alert", () => {
    it.each([
      {
        tone: "error" as const,
        expectedRole: "alert",
        expectedClass: "border-red-200 bg-red-50 text-red-800",
      },
      {
        tone: "warning" as const,
        expectedRole: "alert",
        expectedClass: "border-amber-200 bg-amber-50 text-amber-800",
      },
      {
        tone: "success" as const,
        expectedRole: "status",
        expectedClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
      },
      {
        tone: "info" as const,
        expectedRole: "status",
        expectedClass: "border-blue-200 bg-blue-50 text-blue-800",
      },
    ])(
      "renders $tone tone with default role=$expectedRole and tone classes",
      ({ tone, expectedRole, expectedClass }) => {
        const html = renderToStaticMarkup(
          createElement(Alert, { tone }, `Message for ${tone}`),
        );
        expect(html).toContain(`role="${expectedRole}"`);
        expect(html).toContain(expectedClass);
        expect(html).toContain(`Message for ${tone}`);
      },
    );

    it("defaults to error tone and allows overriding role and merging className", () => {
      const html = renderToStaticMarkup(
        createElement(
          Alert,
          { role: "region", className: "p-5 rounded-xl", id: "custom-alert" },
          "Default error alert",
        ),
      );
      expect(html).toContain('role="region"');
      expect(html).toContain('id="custom-alert"');
      expect(html).toContain("border-red-200 bg-red-50 text-red-800");
      expect(html).toContain("p-5");
      expect(html).toContain("rounded-xl");
    });
  });

  describe("Badge", () => {
    it.each([
      ["neutral", COMPONENT_STYLES.badge.tones.neutral],
      ["mono", COMPONENT_STYLES.badge.tones.mono],
      ["success", COMPONENT_STYLES.badge.tones.success],
      ["warning", COMPONENT_STYLES.badge.tones.warning],
      ["info", COMPONENT_STYLES.badge.tones.info],
      ["purple", COMPONENT_STYLES.badge.tones.purple],
    ] as const)("renders %s tone with design-system tokens", (tone, classes) => {
      const html = renderToStaticMarkup(
        createElement(Badge, { tone, title: `badge-${tone}` }, tone),
      );
      expect(html).toContain("<span");
      expect(html).toContain(`title="badge-${tone}"`);
      for (const token of classes.split(" ")) {
        expect(html).toContain(token);
      }
    });

    it("defaults to neutral tone and merges custom className", () => {
      const html = renderToStaticMarkup(
        createElement(Badge, { className: "px-3 text-caption" }, "v1"),
      );
      expect(html).toContain("px-3");
      expect(html).toContain("text-caption");
      expect(html).not.toContain("px-1.5");
    });
  });

  describe("Button", () => {
    it.each(["plain", "primary", "secondary", "warning"] as const)(
      "renders %s variant with default type=button",
      (variant) => {
        const html = renderToStaticMarkup(
          createElement(Button, { variant }, `Action ${variant}`),
        );
        expect(html).toContain('type="button"');
        expect(html).toContain(`Action ${variant}`);
        const variantClasses = COMPONENT_STYLES.button.variants[variant];
        if (variantClasses) {
          for (const token of variantClasses.split(" ")) {
            expect(html).toContain(token);
          }
        }
      },
    );

    it("disables button, sets aria-busy, renders Spinner, and swaps to loadingLabel when loading", () => {
      const htmlWithLabel = renderToStaticMarkup(
        createElement(
          Button,
          { loading: true, loadingLabel: "Saving draft..." },
          "Save",
        ),
      );
      expect(htmlWithLabel).toContain("disabled");
      expect(htmlWithLabel).toContain('aria-busy="true"');
      expect(htmlWithLabel).toContain("animate-spin");
      expect(htmlWithLabel).toContain("Saving draft...");
      expect(htmlWithLabel).not.toContain(">Save<");

      const htmlWithoutLabel = renderToStaticMarkup(
        createElement(Button, { loading: true }, "Save"),
      );
      expect(htmlWithoutLabel).toContain("disabled");
      expect(htmlWithoutLabel).toContain('aria-busy="true"');
      expect(htmlWithoutLabel).toContain("Save");
    });
  });

  describe("Input, Textarea, and Select", () => {
    it("renders text Input with field styles and sets data-autofocus when autoFocus is true", () => {
      const html = renderToStaticMarkup(
        createElement(Input, {
          id: "patient-name",
          autoFocus: true,
          placeholder: "Full name",
        }),
      );
      expect(html).toContain('type="text"');
      expect(html).toContain('data-autofocus="true"');
      expect(html).toContain('placeholder="Full name"');
      expect(html).toContain("rounded-lg");
    });

    it.each(["checkbox", "radio"] as const)(
      "renders %s Input with choice styles instead of text field styles",
      (type) => {
        const html = renderToStaticMarkup(
          createElement(Input, { id: `opt-${type}`, type }),
        );
        expect(html).toContain(`type="${type}"`);
        expect(html).toContain("h-4 w-4");
        expect(html).not.toContain("p-2.5");
      },
    );

    it("renders Textarea with field styles and resize-none", () => {
      const html = renderToStaticMarkup(
        createElement(Textarea, {
          id: "notes",
          rows: 4,
          className: "p-3",
        }),
      );
      expect(html).toContain("<textarea");
      expect(html).toContain('rows="4"');
      expect(html).toContain("resize-none");
      expect(html).toContain("p-3");
    });

    it("renders Select with wrapperClassName, control styles, and decorative ChevronDownIcon", () => {
      const html = renderToStaticMarkup(
        createElement(
          Select,
          {
            id: "preset-select",
            wrapperClassName: "w-auto",
            className: "py-1.5",
          },
          createElement("option", { value: "default" }, "Default"),
        ),
      );
      expect(html).toContain("w-auto");
      expect(html).toContain("appearance-none pr-9");
      expect(html).toContain("py-1.5");
      expect(html).toContain('aria-hidden="true"');
    });
  });

  describe("FormField and CheckboxField", () => {
    it("FormField associates label htmlFor, renders required marker, and renders help description", () => {
      const html = renderToStaticMarkup(
        createElement(
          FormField,
          {
            id: "email-input",
            label: "Email Address",
            description: "Used for clinical notifications",
            required: true,
            className: "pt-2",
            labelClassName: "text-sm",
          },
          createElement(Input, { id: "email-input", type: "email" }),
        ),
      );
      expect(html).toContain('for="email-input"');
      expect(html).toContain("Email Address");
      expect(html).toContain('<span class="ml-1 text-red-600">*</span>');
      expect(html).toContain('id="email-input-help"');
      expect(html).toContain("Used for clinical notifications");
      expect(html).toContain("pt-2");
      expect(html).toContain("text-sm");
    });

    it("CheckboxField renders horizontal label + description + control associated by id", () => {
      const html = renderToStaticMarkup(
        createElement(
          CheckboxField,
          {
            id: "req-toggle",
            label: "Required Field",
            description: "Patient must answer before submitting",
            className: "p-3 rounded-lg",
          },
          createElement(Input, { id: "req-toggle", type: "checkbox" }),
        ),
      );
      expect(html).toContain("flex items-center justify-between gap-3");
      expect(html).toContain('for="req-toggle"');
      expect(html).toContain("Required Field");
      expect(html).toContain("Patient must answer before submitting");
      expect(html).toContain('id="req-toggle"');
    });
  });

  describe("ChoiceGroup", () => {
    const options = [
      { id: "opt_a", label: "Option A" },
      { id: "opt_b", label: "Option B" },
    ] as const;

    it("renders single-select radio group with visible required legend and active selection", () => {
      const html = renderToStaticMarkup(
        createElement(ChoiceGroup, {
          id: "q_single",
          type: "single",
          options,
          value: "opt_b",
          onChange: () => {},
          legend: "Choose one option",
          legendSrOnly: false,
          required: true,
          ariaDescribedBy: "q_single-desc",
          ariaInvalid: true,
        }),
      );
      expect(html).toContain('<fieldset id="q_single"');
      expect(html).toContain('aria-required="true"');
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('aria-describedby="q_single-desc"');
      expect(html).toContain("Choose one option");
      expect(html).toContain('<span class="ml-1 text-red-600">*</span>');
      expect(html).toContain('type="radio"');
      expect(html).toContain('name="choice-q_single"');
      expect(html).toContain('id="q_single-opt-opt_b"');
      expect(html).toContain("ring-1 ring-intake-border-focus");
    });

    it("renders multi-select checkbox group with sr-only legend and disabled state", () => {
      const html = renderToStaticMarkup(
        createElement(ChoiceGroup, {
          id: "q_multi",
          type: "multi",
          options,
          value: ["opt_a", "opt_b"],
          onChange: () => {},
          legend: "Choose all that apply",
          disabled: true,
        }),
      );
      expect(html).toContain('class="sr-only"');
      expect(html).toContain('type="checkbox"');
      expect(html).toContain("opacity-50 cursor-not-allowed");
      expect(html).toContain("disabled");
    });

    it("invokes onChange with selected option ID in single mode and toggles array in multi mode", () => {
      const singleOnChange = vi.fn();
      const singleTree = ChoiceGroup({
        id: "q_single_cb",
        type: "single",
        options,
        value: "opt_a",
        onChange: singleOnChange,
        legend: "Pick one",
      });
      const singleLabels = singleTree.props.children[1].props.children;
      // Trigger onChange on second option input
      singleLabels[1].props.children[0].props.onChange({
        target: { checked: true },
      });
      expect(singleOnChange).toHaveBeenCalledWith("opt_b");

      const multiOnChange = vi.fn();
      const multiTree = ChoiceGroup({
        id: "q_multi_cb",
        type: "multi",
        options,
        value: ["opt_a"],
        onChange: multiOnChange,
        legend: "Pick many",
      });
      const multiLabels = multiTree.props.children[1].props.children;
      // Uncheck opt_a
      multiLabels[0].props.children[0].props.onChange({
        target: { checked: false },
      });
      expect(multiOnChange).toHaveBeenCalledWith([]);
      // Check opt_b
      multiLabels[1].props.children[0].props.onChange({
        target: { checked: true },
      });
      expect(multiOnChange).toHaveBeenCalledWith(["opt_a", "opt_b"]);
    });
  });

  describe("Dialog, DialogHeader, and DialogActions", () => {
    it("renders Dialog with aria-labelledby, DialogHeader with icon and close button, and DialogActions", () => {
      const onClose = vi.fn();
      const html = renderToStaticMarkup(
        createElement(
          Dialog,
          { open: false, titleId: "modal-title", onClose, className: "max-w-xl" },
          createElement(DialogHeader, {
            titleId: "modal-title",
            title: "Confirm Action",
            description: "Please review carefully",
            icon: createElement("span", { id: "header-icon" }, "!"),
            onClose,
            closeLabel: "Dismiss modal",
          }),
          createElement(
            DialogActions,
            { className: "pt-4" },
            createElement(Button, { variant: "primary" }, "Confirm"),
          ),
        ),
      );
      expect(html).toContain('<dialog tabindex="-1" aria-labelledby="modal-title"');
      expect(html).toContain("max-w-xl");
      expect(html).toContain('id="modal-title"');
      expect(html).toContain("Confirm Action");
      expect(html).toContain("Please review carefully");
      expect(html).toContain('id="header-icon"');
      expect(html).toContain('aria-label="Dismiss modal"');
      expect(html).toContain("flex justify-end gap-2 pt-4");
    });

    it("renders centered DialogHeader when align='center' and invokes onClose when close button is clicked", () => {
      const html = renderToStaticMarkup(
        createElement(DialogHeader, {
          align: "center",
          titleId: "center-title",
          title: "Centered Title",
          description: "Centered description",
          icon: createElement("div", { id: "center-icon" }),
        }),
      );
      expect(html).toContain("text-center");
      expect(html).toContain('id="center-icon"');
      expect(html).toContain('id="center-title"');
      expect(html).toContain("Centered description");

      const onClose = vi.fn();
      const headerTree = DialogHeader({
        titleId: "close-test",
        title: "Close Test",
        onClose,
        disabled: true,
      });
      const closeButton = headerTree.props.children[1];
      expect(closeButton.props.disabled).toBe(true);
      closeButton.props.onClick();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Table, Thead, Tbody, Tr, Th, and Td", () => {
    it("exports semantic table primitives and matching aliases with merged styles", () => {
      expect(TableHead).toBe(Thead);
      expect(TableBody).toBe(Tbody);
      expect(TableRow).toBe(Tr);
      expect(TableHeader).toBe(Th);
      expect(TableCell).toBe(Td);

      const html = renderToStaticMarkup(
        createElement(
          Table,
          { "aria-label": "Forms Table", className: "custom-table" },
          createElement(
            Thead,
            null,
            createElement(
              Tr,
              { className: "hover:bg-transparent" },
              createElement(Th, { scope: "col", className: "px-5" }, "Name"),
            ),
          ),
          createElement(
            Tbody,
            null,
            createElement(
              Tr,
              null,
              createElement(
                Td,
                { className: "px-5 text-right whitespace-normal" },
                "Row Value",
              ),
            ),
          ),
        ),
      );

      expect(html).toContain('<table class="w-full text-left border-collapse text-xs custom-table"');
      expect(html).toContain("<thead");
      expect(html).toContain("text-caption");
      expect(html).toContain("text-gray-500");
      expect(html).toContain("hover:bg-transparent");
      expect(html).toContain('<th class="py-3.5 whitespace-nowrap px-5" scope="col">Name</th>');
      expect(html).toContain('<tbody class="divide-y divide-gray-100">');
      expect(html).toContain(
        '<td class="py-3.5 px-5 text-right whitespace-normal">Row Value</td>',
      );
    });
  });

  describe("Skeleton, SkeletonRegion, Spinner, and RouteFeedback", () => {
    it("renders Skeleton and SkeletonRegion with accessible busy/status semantics", () => {
      const html = renderToStaticMarkup(
        createElement(
          SkeletonRegion,
          { label: "Loading patient intake", className: "p-4" },
          createElement(Skeleton, { className: "h-6 w-32" }),
        ),
      );
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('<span class="sr-only">Loading patient intake</span>');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("h-6 w-32");
    });

    it("renders Spinner with aria-hidden and merged className", () => {
      const html = renderToStaticMarkup(
        createElement(Spinner, { className: "h-6 w-6 text-blue-600" }),
      );
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("animate-spin");
      expect(html).toContain("h-6 w-6 text-blue-600");
    });

    it("renders RouteError and RouteLoading feedback views", () => {
      const errorHtml = renderToStaticMarkup(
        createElement(RouteError, {
          error: new Error("Failed"),
          reset: () => {},
        }),
      );
      expect(errorHtml).toContain(APP_MESSAGES.ROUTE_ERROR_TITLE);
      expect(errorHtml).toContain(APP_MESSAGES.ROUTE_ERROR_MESSAGE);
      expect(errorHtml).toContain(APP_MESSAGES.RETRY);
      expect(errorHtml).toContain(`href="${ROUTES.home}"`);

      const loadingHtml = renderToStaticMarkup(createElement(RouteLoading));
      expect(loadingHtml).toContain('role="status"');
      expect(loadingHtml).toContain('aria-busy="true"');
    });
  });

  describe("Icons", () => {
    it("renders all exported themed icons with fill='currentColor' and aria-hidden='true'", () => {
      const iconEntries = Object.entries(Icons);
      expect(iconEntries.length).toBeGreaterThanOrEqual(30);

      for (const [name, IconComponent] of iconEntries) {
        const html = renderToStaticMarkup(
          createElement(IconComponent, { className: "w-4 h-4", id: name }),
        );
        expect(html).toContain("<svg");
        expect(html).toContain('fill="currentColor"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain(`id="${name}"`);
      }
    });
  });
});
