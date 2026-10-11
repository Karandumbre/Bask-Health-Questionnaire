import { COMPONENT_STYLES } from "@/design-system/component-styles";
import type { ComponentProps } from "react";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["micro", "caption", "preview-title"] }],
    },
  },
});

const tableStyles = COMPONENT_STYLES.table;

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table className={twMerge(tableStyles.root, className)} {...props} />;
}

export function Thead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={twMerge(tableStyles.head, className)} {...props} />;
}

export function Tbody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={twMerge(tableStyles.body, className)} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={twMerge(tableStyles.row, className)} {...props} />;
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th className={twMerge(tableStyles.th, className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={twMerge(tableStyles.td, className)} {...props} />;
}

export {
  Thead as TableHead,
  Tbody as TableBody,
  Tr as TableRow,
  Th as TableHeader,
  Td as TableCell,
};

