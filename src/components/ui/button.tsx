import { COMPONENT_STYLES } from "@/design-system/component-styles";
import type { ComponentProps } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const variants = COMPONENT_STYLES.button.variants;

export function Button({
  className,
  variant = "plain",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants }) {
  return (
    <button
      type={type}
      className={twMerge(
        clsx(COMPONENT_STYLES.button.base, variants[variant], className),
      )}
      {...props}
    />
  );
}
