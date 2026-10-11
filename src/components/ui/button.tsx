import { COMPONENT_STYLES } from "@/design-system/component-styles";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/classes";
import { Spinner } from "./spinner";

const styles = COMPONENT_STYLES.button;

export type ButtonProps = Omit<
  ComponentProps<"button">,
  "className" | "style"
> & {
  variant?: keyof typeof styles.variants;
  tone?: keyof typeof styles.tones;
  size?: keyof typeof styles.sizes;
  fullWidth?: boolean;
  theme?: "admin" | "intake";
  selected?: boolean;
  loading?: boolean;
  loadingLabel?: string;
};

export function Button({
  variant = "secondary",
  tone = variant === "primary" || variant === "link" ? "primary" : "neutral",
  size = "sm",
  fullWidth = false,
  theme = "admin",
  selected = false,
  type = "button",
  loading = false,
  loadingLabel,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const palette = styles.tones[tone];
  const colorStyle =
    theme === "intake" && variant in styles.intake
      ? styles.intake[variant as keyof typeof styles.intake]
      : variant === "primary"
        ? palette.solid
        : variant === "secondary"
          ? palette.outline
          : variant === "segment" && selected
            ? styles.selected
            : palette.text;

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={variant === "segment" ? selected : props["aria-pressed"]}
      className={cn(
        styles.base,
        styles.variants[variant],
        styles.sizes[size],
        colorStyle,
        fullWidth && styles.fullWidth,
      )}
    >
      {loading && <Spinner />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
