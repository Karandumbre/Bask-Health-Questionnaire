import type { ComponentProps } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const variants = {
  plain: "",
  primary: "inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700",
  secondary: "inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50",
  warning: "inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700",
};

export function Button({ className, variant = "plain", type = "button", ...props }: ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return <button type={type} className={twMerge(clsx(
    "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
    variants[variant], className,
  ))} {...props} />;
}
