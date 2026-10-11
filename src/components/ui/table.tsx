import { COMPONENT_STYLES } from "@/design-system/component-styles";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/classes";

const styles = COMPONENT_STYLES.table;
type NativeProps<Tag extends "table" | "thead" | "tbody" | "tr" | "th" | "td"> =
  Omit<ComponentProps<Tag>, "className" | "style">;
type CellProps = {
  variant?: keyof typeof styles.cells;
  desktopOnly?: boolean;
  padding?: "normal" | "roomy";
  align?: keyof typeof styles.align;
  truncate?: boolean;
};

export function Table(props: NativeProps<"table">) {
  return <table {...props} className={styles.root} />;
}
export function Thead(props: NativeProps<"thead">) {
  return <thead {...props} className={styles.head} />;
}
export function Tbody(props: NativeProps<"tbody">) {
  return <tbody {...props} className={styles.body} />;
}
export function Tr({
  variant = "body",
  interactive = false,
  selected = false,
  ...props
}: NativeProps<"tr"> & {
  variant?: "body" | "header";
  interactive?: boolean;
  selected?: boolean;
}) {
  return (
    <tr
      {...props}
      aria-selected={interactive ? selected : props["aria-selected"]}
      className={cn(
        variant === "header" ? styles.headerRow : styles.row,
        interactive && styles.interactiveRow,
        selected && styles.selectedRow,
      )}
    />
  );
}
export function Th({
  variant = "default",
  desktopOnly,
  padding,
  align,
  truncate,
  ...props
}: NativeProps<"th"> & CellProps) {
  return (
    <th
      scope="col"
      {...props}
      className={cn(
        styles.th,
        styles.cells[variant],
        desktopOnly && styles.desktop,
        padding === "roomy" && styles.roomy,
        align && styles.align[align],
        truncate && styles.truncate,
      )}
    />
  );
}
export function Td({
  variant = "default",
  desktopOnly,
  padding,
  align,
  truncate,
  ...props
}: NativeProps<"td"> & CellProps) {
  return (
    <td
      {...props}
      className={cn(
        styles.td,
        styles.cells[variant],
        desktopOnly && styles.desktop,
        padding === "roomy" && styles.roomy,
        align && styles.align[align],
        truncate && styles.truncate,
      )}
    />
  );
}
export {
  Thead as TableHead,
  Tbody as TableBody,
  Tr as TableRow,
  Th as TableHeader,
  Td as TableCell,
};
