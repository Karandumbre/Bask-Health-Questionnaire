import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

const styles = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};
export function Alert({
  children,
  tone = "error",
  className,
  role,
  ...props
}: ComponentProps<"div"> & {
  tone?: keyof typeof styles;
}) {
  return (
    <div
      role={
        role ?? (tone === "success" || tone === "info" ? "status" : "alert")
      }
      className={twMerge(
        "rounded-lg border p-3 text-xs",
        styles[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
