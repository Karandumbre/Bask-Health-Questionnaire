import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const styles = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};
export function Alert({
  children,
  tone = "error",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof styles;
  className?: string;
}) {
  return (
    <div
      role={tone === "success" ? "status" : "alert"}
      className={twMerge(
        "rounded-lg border p-3 text-xs",
        styles[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
