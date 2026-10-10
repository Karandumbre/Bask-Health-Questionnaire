import type { ThemeDefinition } from "./theme-types";
export function themeToCssVariables(
  theme: ThemeDefinition,
  mode: "light" | "dark" = "light",
): Record<string, string> {
  const tokens = mode === "light" ? theme.light : theme.dark;
  return {
    "--theme-bg": tokens.background,
    "--theme-surface": tokens.surface,
    "--theme-text-primary": tokens.textPrimary,
    "--theme-text-secondary": tokens.textSecondary,
    "--theme-border": tokens.border,
    "--theme-border-focus": tokens.borderFocus,
    "--theme-primary-action": tokens.primaryAction,
    "--theme-primary-action-fg": tokens.primaryActionForeground,
    "--theme-primary-action-hover": tokens.primaryActionHover,
    "--theme-secondary-action": tokens.secondaryAction,
    "--theme-secondary-action-fg": tokens.secondaryActionForeground,
    "--theme-secondary-action-hover": tokens.secondaryActionHover,
    "--theme-focus-ring": tokens.focusRing,
    "--theme-error": tokens.error,
    "--theme-error-bg": tokens.errorBackground,
    "--theme-error-border": tokens.errorBorder,
    "--theme-success": tokens.success,
    "--theme-success-bg": tokens.successBackground,
    "--theme-success-border": tokens.successBorder,
    "--theme-muted": tokens.muted,
    "--theme-disabled-text": tokens.disabledText,
  };
}
