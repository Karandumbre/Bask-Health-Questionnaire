import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface FormFieldProps {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}

export function FormField({
  id,
  label,
  description,
  error,
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
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
