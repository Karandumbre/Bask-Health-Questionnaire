import { APP_MESSAGES } from "@/lib/constants/messages";
import { getContrastRatio } from "./color";
import type { ThemeModeTokens } from "./theme-types";
export interface WcagAuditResult {
  isCompliant: boolean;
  scoreRatio: number;
  violations: Array<{ pair: string; ratio: number; required: number }>;
}

/**
 * Audits a theme mode token set against WCAG 2.1 Level AA requirements.
 */
export function auditThemeMode(tokens: ThemeModeTokens): WcagAuditResult {
  const violations: Array<{ pair: string; ratio: number; required: number }> =
    [];

  const checks = [
    {
      pair: APP_MESSAGES.PRIMARY_TEXT_ON_BACKGROUND,
      foreground: tokens.textPrimary,
      background: tokens.background,
      required: 4.5,
    },
    {
      pair: APP_MESSAGES.PRIMARY_TEXT_ON_SURFACE,
      foreground: tokens.textPrimary,
      background: tokens.surface,
      required: 4.5,
    },
    {
      pair: APP_MESSAGES.SECONDARY_TEXT_ON_SURFACE,
      foreground: tokens.textSecondary,
      background: tokens.surface,
      required: 4.5,
    },
    {
      pair: APP_MESSAGES.PRIMARY_ACTION_FOREGROUND_ON_ACTION_BG,
      foreground: tokens.primaryActionForeground,
      background: tokens.primaryAction,
      required: 4.5,
    },
    {
      pair: APP_MESSAGES.SECONDARY_ACTION_FOREGROUND_ON_SECONDARY_ACTION_BG,
      foreground: tokens.secondaryActionForeground,
      background: tokens.secondaryAction,
      required: 4.5,
    },
    {
      pair: APP_MESSAGES.ERROR_TEXT_ON_SURFACE,
      foreground: tokens.error,
      background: tokens.surface,
      required: 4.5,
    },
  ];

  let minRatio = 21;
  for (const check of checks) {
    const ratio = getContrastRatio(check.foreground, check.background);
    if (ratio < minRatio) minRatio = ratio;
    if (ratio < check.required) {
      violations.push({
        pair: check.pair,
        ratio: Math.round(ratio * 100) / 100,
        required: check.required,
      });
    }
  }

  return {
    isCompliant: violations.length === 0,
    scoreRatio: Math.round(minRatio * 100) / 100,
    violations,
  };
}

// ---------------------------------------------------------------------------
// 3 Named Clinical Theme Presets
// ---------------------------------------------------------------------------
