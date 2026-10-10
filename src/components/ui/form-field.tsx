import type { ReactNode } from "react";

export function FormField({
  id,
  label,
  description,
  error,
  required,
  children,
}: {
  id: string;
  label: ReactNode;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold">
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
