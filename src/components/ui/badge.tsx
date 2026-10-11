import { COMPONENT_STYLES } from "@/design-system/component-styles";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/classes";

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & {
  tone?: keyof typeof COMPONENT_STYLES.badge.tones;
}) {
  const badgeStyles = COMPONENT_STYLES.badge;
  const toneStyle = COMPONENT_STYLES?.badge?.tones?.[tone];
  return (
    <span className={cn(badgeStyles.base, toneStyle, className)} {...props} />
  );
}
