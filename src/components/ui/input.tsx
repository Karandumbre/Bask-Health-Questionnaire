import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

const fieldStyles = "w-full text-xs bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  const styles = type === "checkbox" || type === "radio"
    ? "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
    : fieldStyles;
  return <input type={type} className={twMerge(styles, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={twMerge(fieldStyles, "resize-none", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={twMerge(fieldStyles, className)} {...props} />;
}
