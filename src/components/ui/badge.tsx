import { COMPONENT_STYLES } from "@/design-system/component-styles";
import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

const tones = COMPONENT_STYLES.badge.tones;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & {
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={twMerge(COMPONENT_STYLES.badge.base, tones[tone], className)}
      {...props}
    />
  );
}
