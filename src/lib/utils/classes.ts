import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["micro", "caption", "preview-title"] }],
    },
  },
});

export function cn(...values: ClassValue[]) {
  return merge(clsx(values));
}
