import type { ComponentProps, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { COMPONENT_STYLES } from "@/design-system/component-styles";
import { APP_MESSAGES } from "@/lib/constants/messages";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={twMerge(COMPONENT_STYLES.skeleton, className)}
    />
  );
}

export function SkeletonRegion({
  children,
  className,
  label = APP_MESSAGES.LOADING,
}: {
  children?: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
