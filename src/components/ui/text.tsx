import { COMPONENT_STYLES } from "@/design-system/component-styles";
import { cn } from "@/lib/utils/classes";
import { createElement, type ComponentProps } from "react";

const styles = COMPONENT_STYLES.text;
type TextTag =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "strong"
  | "small"
  | "code";

export type TextProps<Tag extends TextTag = "span"> = Omit<
  ComponentProps<Tag>,
  "className" | "style" | "color"
> & {
  as?: Tag;
  variant?: keyof typeof styles.variants;
  tone?: keyof typeof styles.tones;
  weight?: keyof typeof styles.weights;
  align?: keyof typeof styles.align;
  wrap?: keyof typeof styles.wrap;
  mono?: boolean;
  italic?: boolean;
  uppercase?: boolean;
  truncate?: boolean;
};

export function Text<Tag extends TextTag = "span">({
  as,
  variant = "body",
  tone = variant === "inherit" ? "inherit" : "primary",
  weight,
  align,
  wrap,
  mono,
  italic,
  uppercase,
  truncate,
  ...props
}: TextProps<Tag>) {
  return createElement(as ?? "span", {
    ...props,
    className: cn(
      styles.variants[variant],
      styles.tones[tone],
      weight && styles.weights[weight],
      align && styles.align[align],
      wrap && styles.wrap[wrap],
      mono && styles.mono,
      italic && styles.italic,
      uppercase && styles.uppercase,
      truncate && styles.truncate,
    ),
  });
}
