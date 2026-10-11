/** Shared primitive recipes. Dimensions and colors resolve through tokens.css. */
export const COMPONENT_STYLES = {
  skeleton:
    "rounded-md bg-gray-200/70 animate-pulse motion-reduce:animate-none",
  spinner:
    "inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none",
  button: {
    base: "inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
    variants: {
      primary: "border border-transparent font-semibold shadow-xs",
      secondary: "border bg-white shadow-2xs",
      ghost: "border border-transparent",
      link: "border border-transparent underline underline-offset-2",
      menu: "w-full justify-start rounded-none border border-transparent text-left group",
      segment: "border border-transparent",
    },
    sizes: {
      xs: "min-h-8 px-2.5 py-1 text-caption",
      sm: "min-h-8 px-3 py-1.5 text-xs",
      md: "min-h-touch-target px-4 py-2.5 text-sm rounded-xl",
      lg: "min-h-touch-target px-8 py-3 text-sm rounded-xl",
      icon: "h-8 w-8 p-1.5 text-sm",
      "icon-sm": "h-6 w-6 p-1 text-xs",
    },
    tones: {
      primary: {
        solid: "bg-blue-600 text-white hover:bg-blue-700",
        outline: "border-blue-200 text-blue-700 hover:bg-blue-50",
        text: "text-blue-700 hover:text-blue-800 hover:bg-blue-50",
      },
      neutral: {
        solid: "bg-gray-900 text-white hover:bg-black",
        outline: "border-gray-300 text-gray-700 hover:bg-gray-50",
        text: "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
      },
      success: {
        solid: "bg-emerald-600 text-white hover:bg-emerald-700",
        outline: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
        text: "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50",
      },
      warning: {
        solid: "bg-amber-600 text-white hover:bg-amber-700",
        outline: "border-amber-300 text-amber-700 hover:bg-amber-50",
        text: "text-amber-700 hover:text-amber-800 hover:bg-amber-50",
      },
      danger: {
        solid: "bg-red-600 text-white hover:bg-red-700",
        outline: "border-red-300 text-red-700 hover:bg-red-50",
        text: "text-red-600 hover:text-red-700 hover:bg-red-50",
      },
    },
    intake: {
      primary:
        "bg-intake-primary-action text-intake-primary-action-fg hover:bg-intake-primary-action-hover focus-visible:outline-intake-focus-ring",
      secondary:
        "bg-intake-surface border-intake-border text-intake-text-primary hover:bg-intake-bg hover:border-intake-border-focus focus-visible:outline-intake-focus-ring",
      ghost:
        "text-intake-text-secondary hover:text-intake-text-primary hover:bg-intake-bg focus-visible:outline-intake-focus-ring",
      link: "text-intake-text-secondary hover:text-intake-text-primary focus-visible:outline-intake-focus-ring",
    },
    selected: "bg-white text-gray-900 shadow-sm",
    fullWidth: "w-full",
  },
  text: {
    variants: {
      title: "text-2xl font-bold tracking-tight",
      section: "text-xl font-bold tracking-tight",
      heading: "text-base font-semibold",
      body: "text-sm",
      small: "text-xs",
      caption: "text-caption",
      micro: "text-micro",
      inherit: "",
    },
    tones: {
      primary: "text-gray-900",
      secondary: "text-gray-600",
      muted: "text-gray-500",
      subtle: "text-gray-400",
      info: "text-blue-700",
      success: "text-emerald-700",
      warning: "text-amber-700",
      danger: "text-red-600",
      intake: "text-intake-text-primary",
      intakeSecondary: "text-intake-text-secondary",
      intakeError: "text-intake-error",
      inherit: "",
    },
    weights: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    align: { left: "text-left", center: "text-center", right: "text-right" },
    wrap: {
      normal: "whitespace-normal",
      nowrap: "whitespace-nowrap",
      preserve: "whitespace-pre-wrap",
    },
    mono: "font-mono",
    italic: "italic",
    uppercase: "uppercase tracking-wider",
    truncate: "truncate",
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
    body: "divide-y divide-gray-100 text-gray-800",
    row: "hover:bg-gray-50/70 transition-colors group align-middle",
    headerRow: "align-middle",
    interactiveRow:
      "cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-500",
    selectedRow: "bg-blue-50 hover:bg-blue-100/40",
    th: "py-3.5 px-3 whitespace-nowrap first:rounded-tl-2xl last:rounded-tr-2xl",
    td: "py-3.5 px-3 whitespace-nowrap",
    cells: {
      default: "",
      title: "pl-4 sm:pl-5 pr-3 w-full max-w-0 whitespace-normal",
      meta: "w-px",
      actions: "pl-3 pr-4 sm:pr-5 text-right w-px",
    },
    desktop: "hidden lg:table-cell",
    roomy: "px-5",
    align: { left: "text-left", center: "text-center", right: "text-right" },
    truncate: "truncate max-w-xs",
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
