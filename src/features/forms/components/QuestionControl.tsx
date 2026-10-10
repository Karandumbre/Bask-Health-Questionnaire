"use client";

import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { COMPONENT_STYLES } from "@/design-system/component-styles";
import { Input, Textarea } from "@/components/ui/input";
import { ChoiceGroup } from "@/components/ui/choice-group";
import type { Question } from "../domain/types";
import type { CanonicalAnswer } from "@/features/patients/domain/types";

export interface QuestionControlProps {
  question: Question;
  id: string;
  value: CanonicalAnswer | undefined;
  onChange: (value: CanonicalAnswer | undefined) => void;
  error?: string;
  disabled?: boolean;
  ariaDescribedBy?: string;
  inputClassName?: string;
  rows?: number;
  name?: string;
  legend?: ReactNode;
  legendSrOnly?: boolean;
  checkboxLabel?: ReactNode;
}

/**
 * Calculates combined aria-describedby ensuring assistive technology
 * does not drop field help text when validation errors appear.
 */
export function getFieldDescribedBy(
  ...ids: (string | undefined | null | false)[]
): string | undefined {
  const valid = ids.filter(Boolean) as string[];
  return valid.length > 0 ? valid.join(" ") : undefined;
}

export function QuestionControl({
  question,
  id,
  value,
  onChange,
  error,
  disabled = false,
  ariaDescribedBy,
  inputClassName,
  rows,
  name,
  legend,
  legendSrOnly = true,
  checkboxLabel,
}: QuestionControlProps) {
  const hasError = Boolean(error);
  const baseInputClass = twMerge(
    COMPONENT_STYLES.intakeField,
    "text-sm py-2.5 px-3.5 rounded-xl",
    hasError && "border-intake-error-border focus:ring-intake-error-border",
    inputClassName,
  );

  switch (question.type) {
    case "short_text":
      return (
        <Input
          id={id}
          type="text"
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder || "Type your answer..."}
          maxLength={question.validation?.maxLength}
          aria-required={question.required}
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          className={baseInputClass}
        />
      );

    case "long_text":
      return (
        <Textarea
          id={id}
          rows={rows ?? 3}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder || "Type your response here..."}
          maxLength={question.validation?.maxLength}
          aria-required={question.required}
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          className={baseInputClass}
        />
      );

    case "number":
      return (
        <Input
          id={id}
          type="number"
          disabled={disabled}
          value={
            value !== null && value !== undefined && value !== ""
              ? String(value)
              : ""
          }
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === "" ? undefined : Number(val));
          }}
          placeholder={question.placeholder || "0"}
          min={question.validation?.min}
          max={question.validation?.max}
          step={question.validation?.integerOnly ? 1 : "any"}
          aria-required={question.required}
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          className={baseInputClass}
        />
      );

    case "single_select":
      return (
        <ChoiceGroup
          id={id}
          name={name || `radio-${question.id}`}
          type="single"
          options={question.options}
          value={typeof value === "string" ? value : undefined}
          onChange={(val) => onChange(val)}
          legend={legend ?? question.label}
          legendSrOnly={legendSrOnly}
          required={question.required}
          disabled={disabled}
          ariaDescribedBy={ariaDescribedBy}
          ariaInvalid={hasError}
        />
      );

    case "multi_select":
      return (
        <ChoiceGroup
          id={id}
          name={name || `multi-${question.id}`}
          type="multi"
          options={question.options}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(val) => onChange(val)}
          legend={legend ?? question.label}
          legendSrOnly={legendSrOnly}
          required={question.required}
          disabled={disabled}
          ariaDescribedBy={ariaDescribedBy}
          ariaInvalid={hasError}
        />
      );

    case "checkbox":
      return (
        <label
          htmlFor={id}
          className={twMerge(
            "flex items-start gap-3 text-xs sm:text-sm font-medium text-intake-text-primary cursor-pointer min-h-touch-target",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <Input
            id={id}
            type="checkbox"
            disabled={disabled}
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            aria-required={question.required}
            aria-invalid={hasError}
            aria-describedby={ariaDescribedBy}
            className="mt-0.5 h-4 w-4 accent-intake-primary-action cursor-pointer shrink-0"
          />
          {checkboxLabel ? (
            checkboxLabel
          ) : (
            <span className="leading-snug">
              {question.label}
              {question.required && (
                <span className="ml-1 text-red-600">*</span>
              )}
            </span>
          )}
        </label>
      );
  }
}
