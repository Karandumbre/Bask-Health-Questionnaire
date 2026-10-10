import { COMPONENT_STYLES } from "@/design-system/component-styles";
import type { ComponentProps } from "react";
import { ChevronDownIcon } from "./icons";
import { twMerge } from "tailwind-merge";

const fieldStyles = COMPONENT_STYLES.field;

export function Input({
  className,
  type = "text",
  autoFocus,
  ...props
}: ComponentProps<"input">) {
  const styles =
    type === "checkbox" || type === "radio"
      ? COMPONENT_STYLES.choice
      : fieldStyles;
  return (
    <input
      type={type}
      autoFocus={autoFocus}
      data-autofocus={autoFocus ? "true" : undefined}
      className={twMerge(styles, className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={twMerge(fieldStyles, "resize-none", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  wrapperClassName,
  ...props
}: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <span
      className={twMerge(COMPONENT_STYLES.select.wrapper, wrapperClassName)}
    >
      <select
        className={twMerge(
          fieldStyles,
          className,
          COMPONENT_STYLES.select.control,
        )}
        {...props}
      />
      <ChevronDownIcon className={COMPONENT_STYLES.select.arrow} />
    </span>
  );
}
