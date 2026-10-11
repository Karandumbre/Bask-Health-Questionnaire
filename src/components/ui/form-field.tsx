import { Text } from "@/components/ui/text";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface FormFieldProps {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children?: ReactNode;
}

export function FormField({
  id,
  label,
  description,
  required,
  className,
  labelClassName,
  children,
}: FormFieldProps) {
  return (
    <div className={twMerge("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className={twMerge("block text-xs font-semibold", labelClassName)}
      >
        {label}
        {required && (
          <span className="ml-1">
            <Text variant="inherit" tone="danger">
              *
            </Text>
          </span>
        )}
      </label>
      {description && (
        <div className="opacity-80">
          <Text id={`${id}-help`} as="p" variant="small" tone="inherit">
            {description}
          </Text>
        </div>
      )}
      {children}
    </div>
  );
}

export interface CheckboxFieldProps {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  className?: string;
  labelClassName?: string;
  children?: ReactNode;
}

export function CheckboxField({
  id,
  label,
  description,
  className,
  labelClassName,
  children,
}: CheckboxFieldProps) {
  return (
    <div
      className={twMerge("flex items-center justify-between gap-3", className)}
    >
      <div>
        <label
          htmlFor={id}
          className={twMerge(
            "block text-xs font-semibold text-gray-900 cursor-pointer",
            labelClassName,
          )}
        >
          {label}
        </label>
        {description && (
          <Text as="p" variant="caption" tone="subtle">
            {description}
          </Text>
        )}
      </div>
      {children}
    </div>
  );
}
