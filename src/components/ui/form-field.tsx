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
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {description && (
        <p id={`${id}-help`} className="text-xs opacity-80">
          {description}
        </p>
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
      className={twMerge(
        "flex items-center justify-between gap-3",
        className,
      )}
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
          <p className="text-caption text-gray-400">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
