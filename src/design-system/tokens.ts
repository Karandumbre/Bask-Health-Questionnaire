/** JS consumers reference the same CSS foundations rather than duplicating values. */
export const DESIGN_TOKENS = {
  spacing: {
    unit: "var(--spacing)",
    field: "calc(var(--spacing) * 2.5)",
    section: "calc(var(--spacing) * 6)",
  },
  typography: {
    family: "var(--font-sans)",
    caption: "var(--text-caption)",
    micro: "var(--text-micro)",
  },
  radius: {
    control: "var(--radius-lg)",
    action: "var(--radius-xl)",
    dialog: "var(--radius-2xl)",
  },
  layout: {
    editorHeight: "var(--spacing-editor-height)",
    dialogWidth: "var(--spacing-dialog-width)",
  },
  motion: {
    duration: "var(--motion-duration)",
    reducedDuration: "var(--motion-reduced-duration)",
  },
} as const;
