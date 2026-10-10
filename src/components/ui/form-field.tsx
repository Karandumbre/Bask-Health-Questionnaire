import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface FormFieldProps {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  srOnlyLabel?: boolean;
  className?: string;
  labelClassName?: string;
  helpClassName?: string;
  errorClassName?: string;
  children: ReactNode;
}

export function FormField({
  id,
  label,
  description,
  error,
  required,
  srOnlyLabel = false,
  className,
  labelClassName,
  helpClassName,
  errorClassName,
  children,
}: FormFieldProps) {
  return (
    <div className={twMerge("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className={twMerge(
          srOnlyLabel ? "sr-only" : "block text-xs font-semibold",
          labelClassName,
        )}
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {description && (
        <p
          id={`${id}-help`}
          className={twMerge("text-xs opacity-80", helpClassName)}
        >
          {description}
        </p>
      )}
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className={twMerge("text-xs text-red-600", errorClassName)}
        >
          {error}
        </p>
      )}
    </div>
  );
}
