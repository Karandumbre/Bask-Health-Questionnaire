import { COMPONENT_STYLES } from "@/design-system/component-styles";
import type { ComponentProps } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Spinner } from "./spinner";

const variants = COMPONENT_STYLES.button.variants;

export function Button({
  className,
  variant = "plain",
  type = "button",
  loading = false,
  loadingLabel,
  disabled,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={twMerge(
        clsx(
          COMPONENT_STYLES.button.base,
          variants[variant],
          loading && "inline-flex items-center justify-center gap-1.5",
          className,
        ),
      )}
      {...props}
    >
      {loading && <Spinner />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
