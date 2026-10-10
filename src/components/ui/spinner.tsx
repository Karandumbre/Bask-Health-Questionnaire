import { COMPONENT_STYLES } from "@/design-system/component-styles";
import { twMerge } from "tailwind-merge";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={twMerge(COMPONENT_STYLES.spinner, className)}
    />
  );
}
