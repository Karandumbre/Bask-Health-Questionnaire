/** Shared primitive recipes. Dimensions and colors resolve through tokens.css. */
export const COMPONENT_STYLES = {
  skeleton:
    "rounded-md bg-gray-200/70 animate-pulse motion-reduce:animate-none",
  spinner:
    "inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none",
  button: {
    base: "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
    variants: {
      plain: "",
      primary:
        "inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700",
      secondary:
        "inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50",
      warning:
        "inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700",
    },
  },
  field:
    "w-full text-xs bg-white border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50",
  intakeField:
    "border-intake-border bg-intake-surface text-intake-text-primary placeholder:text-intake-text-secondary focus:border-intake-border-focus focus:ring-intake-focus-ring",
  select: {
    wrapper: "relative inline-grid w-full min-w-0",
    control: "col-start-1 row-start-1 appearance-none pr-9",
    arrow:
      "pointer-events-none col-start-1 row-start-1 mr-3 h-4 w-4 justify-self-end self-center text-gray-500",
  },
  choice:
    "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50",
  dialog:
    "m-auto w-dialog-width max-w-lg max-h-dialog-height overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-xs",
  table: {
    root: "w-full text-left border-collapse text-xs",
    head: "border-b border-gray-200 bg-gray-50/80 text-caption font-bold uppercase tracking-wider text-gray-500",
    body: "divide-y divide-gray-100",
    row: "hover:bg-gray-50/70 transition-colors group align-middle",
    th: "py-3.5 px-3 whitespace-nowrap",
    td: "py-3.5 px-3 whitespace-nowrap",
  },
  badge: {
    base: "inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-micro font-medium",
    tones: {
      neutral: "bg-gray-100 text-gray-700 border border-gray-200",
      mono: "bg-gray-100 text-gray-600 border border-gray-200 font-mono text-caption",
      success:
        "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-full px-2.5",
      warning:
        "bg-amber-50 text-amber-800 border border-amber-200 font-semibold rounded-full px-2.5",
      info: "bg-blue-50 text-blue-700 border border-blue-200/60 font-medium",
      purple:
        "bg-purple-50 text-purple-700 border border-purple-200/60 font-medium",
    },
  },
} as const;
