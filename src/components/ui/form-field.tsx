import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface FormFieldProps {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  labelClassName?: string;
  children: ReactNode;
}

export function FormField({
  id,
  label,
  description,
  required,
  labelClassName,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
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
