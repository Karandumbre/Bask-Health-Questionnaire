import { type ReactNode } from "react";
import { Input } from "./input";
import { twMerge } from "tailwind-merge";

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface ChoiceGroupProps {
  id: string;
  name?: string;
  type: "single" | "multi";
  options: readonly ChoiceOption[];
  value: string | readonly string[] | undefined | null;
  onChange: (value: string | string[]) => void;
  legend?: ReactNode;
  legendSrOnly?: boolean;
  required?: boolean;
  disabled?: boolean;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  className?: string;
}

export function ChoiceGroup({
  id,
  name,
  type,
  options,
  value,
  onChange,
  legend,
  legendSrOnly = true,
  required,
  disabled = false,
  ariaDescribedBy,
  ariaInvalid,
  className,
}: ChoiceGroupProps) {
  const isMulti = type === "multi";
  const selectedList =
    isMulti && Array.isArray(value) ? (value as string[]) : [];
  const groupName = name || `choice-${id}`;

  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (disabled) return;
    if (isMulti) {
      if (checked) {
        onChange([...selectedList, optionId]);
      } else {
        onChange(selectedList.filter((item) => item !== optionId));
      }
    } else {
      onChange(optionId);
    }
  };

  return (
    <fieldset
      id={id}
      aria-required={required}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      className={twMerge("space-y-2", className)}
    >
      {legend && (
        <legend
          className={
            legendSrOnly
              ? "sr-only"
              : "text-sm font-semibold text-intake-text-primary"
          }
        >
          {legend}
          {!legendSrOnly && required && (
            <span className="ml-1 text-red-600">*</span>
          )}
        </legend>
      )}

      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = isMulti
            ? selectedList.includes(opt.id)
            : value === opt.id;
          const optionInputId = `${id}-opt-${opt.id}`;

          return (
            <label
              key={opt.id}
              htmlFor={optionInputId}
              className={twMerge(
                "flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-colors min-h-touch-target select-none",
                isSelected
                  ? "border-intake-border-focus bg-intake-surface font-semibold text-intake-text-primary ring-1 ring-intake-border-focus"
                  : "border-intake-border bg-intake-surface hover:border-intake-border-focus text-intake-text-primary",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <Input
                id={optionInputId}
                type={isMulti ? "checkbox" : "radio"}
                name={isMulti ? undefined : groupName}
                value={opt.id}
                disabled={disabled}
                checked={isSelected}
                aria-describedby={ariaDescribedBy}
                aria-invalid={ariaInvalid}
                onChange={(e) => handleOptionChange(opt.id, e.target.checked)}
                className="h-4 w-4 accent-intake-primary-action cursor-pointer"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
