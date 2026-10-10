import { COMPONENT_STYLES } from "@/design-system/component-styles";
import type { ComponentProps } from "react";
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

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={twMerge(fieldStyles, className)} {...props} />;
}
