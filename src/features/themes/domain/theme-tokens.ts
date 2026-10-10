import { z } from "zod";

/**
 * Granular design tokens for a single theme mode (light or dark).
 * Provides unambiguous contrast for backgrounds, surfaces, text, actions, and states.
 */
export const ThemeModeTokensSchema = z.object({
  // Backgrounds & Surfaces
  background: z.string(),
  surface: z.string(),

  // Typography
  textPrimary: z.string(),
  textSecondary: z.string(),

  // Outlines & Borders
  border: z.string(),
  borderFocus: z.string(),

  // Primary Action (Continue, Submit, Radio Selected)
  primaryAction: z.string(),
  primaryActionForeground: z.string(),
  primaryActionHover: z.string(),

  // Secondary Action (Back, Save Progress, Secondary Buttons)
  secondaryAction: z.string(),
  secondaryActionForeground: z.string(),
  secondaryActionHover: z.string(),

  // Focus & Accessibility
  focusRing: z.string(),

  // Validation & Status States
  error: z.string(),
  errorBackground: z.string(),
  errorBorder: z.string(),
  success: z.string(),
  successBackground: z.string(),
  successBorder: z.string(),

  // Muted & Disabled States
  muted: z.string(),
  disabledText: z.string(),

  // Backwards compatibility aliases for Phase 1 schemas
  text: z.string().optional(),
  textMuted: z.string().optional(),
  primary: z.string().optional(),
  primaryForeground: z.string().optional(),
});

export type ThemeModeTokens = z.infer<typeof ThemeModeTokensSchema>;

export const ThemeDefinitionSchema = z.object({
  presetName: z.string(),
  isCustomShuffle: z.boolean().default(false),
  light: ThemeModeTokensSchema,
  dark: ThemeModeTokensSchema,
});

export type ThemeDefinition = z.infer<typeof ThemeDefinitionSchema>;

// ---------------------------------------------------------------------------
// WCAG 2.1 Contrast Calculations
// ---------------------------------------------------------------------------

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function parseHexColor(hex: string): RgbColor {
  const clean = hex.replace("#", "").trim();
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean))
    throw new Error("Invalid hex color.");
  if (clean.length === 3) {
    const r = clean.charAt(0);
    const g = clean.charAt(1);
    const b = clean.charAt(2);
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
    };
  }
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`.toUpperCase();
}

/**
 * Calculates relative luminance per WCAG 2.1 formula.
 */
export function getRelativeLuminance(rgb: RgbColor): number {
  const normalize = (val: number) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * normalize(rgb.r) +
    0.7152 * normalize(rgb.g) +
    0.0722 * normalize(rgb.b)
  );
}

/**
 * Calculates contrast ratio between two hex colors (e.g. 4.5:1 -> returns 4.5).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(parseHexColor(hex1));
  const lum2 = getRelativeLuminance(parseHexColor(hex2));
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

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
      pair: "Primary Text on Background",
      foreground: tokens.textPrimary,
      background: tokens.background,
      required: 4.5,
    },
    {
      pair: "Primary Text on Surface",
      foreground: tokens.textPrimary,
      background: tokens.surface,
      required: 4.5,
    },
    {
      pair: "Secondary Text on Surface",
      foreground: tokens.textSecondary,
      background: tokens.surface,
      required: 4.5,
    },
    {
      pair: "Primary Action Foreground on Action BG",
      foreground: tokens.primaryActionForeground,
      background: tokens.primaryAction,
      required: 4.5,
    },
    {
      pair: "Secondary Action Foreground on Secondary Action BG",
      foreground: tokens.secondaryActionForeground,
      background: tokens.secondaryAction,
      required: 4.5,
    },
    {
      pair: "Error Text on Surface",
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

export const THEME_PRESET_OCEAN: ThemeDefinition = {
  presetName: "Ocean",
  isCustomShuffle: false,
  light: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    border: "#E2E8F0",
    borderFocus: "#0284C7",
    primaryAction: "#0369A1",
    primaryActionForeground: "#FFFFFF",
    primaryActionHover: "#075985",
    secondaryAction: "#F1F5F9",
    secondaryActionForeground: "#334155",
    secondaryActionHover: "#E2E8F0",
    focusRing: "#38BDF8",
    error: "#DC2626",
    errorBackground: "#FEF2F2",
    errorBorder: "#FCA5A5",
    success: "#16A34A",
    successBackground: "#F0FDF4",
    successBorder: "#86EFAC",
    muted: "#94A3B8",
    disabledText: "#94A3B8",
    // Backwards compatibility
    text: "#0F172A",
    textMuted: "#475569",
    primary: "#0369A1",
    primaryForeground: "#FFFFFF",
  },
  dark: {
    background: "#0B1120",
    surface: "#1E293B",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    border: "#334155",
    borderFocus: "#38BDF8",
    primaryAction: "#38BDF8",
    primaryActionForeground: "#0B1120",
    primaryActionHover: "#7DD3FC",
    secondaryAction: "#334155",
    secondaryActionForeground: "#F1F5F9",
    secondaryActionHover: "#475569",
    focusRing: "#7DD3FC",
    error: "#F87171",
    errorBackground: "#450A0A",
    errorBorder: "#7F1D1D",
    success: "#4ADE80",
    successBackground: "#052E16",
    successBorder: "#14532D",
    muted: "#64748B",
    disabledText: "#64748B",
    // Backwards compatibility
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    primary: "#38BDF8",
    primaryForeground: "#0B1120",
  },
};

export const THEME_PRESET_EMERALD: ThemeDefinition = {
  presetName: "Emerald",
  isCustomShuffle: false,
  light: {
    background: "#F7FAF8",
    surface: "#FFFFFF",
    textPrimary: "#064E3B",
    textSecondary: "#374151",
    border: "#D1FAE5",
    borderFocus: "#047857",
    primaryAction: "#047857",
    primaryActionForeground: "#FFFFFF",
    primaryActionHover: "#065F46",
    secondaryAction: "#ECFDF5",
    secondaryActionForeground: "#065F46",
    secondaryActionHover: "#D1FAE5",
    focusRing: "#34D399",
    error: "#DC2626",
    errorBackground: "#FEF2F2",
    errorBorder: "#FCA5A5",
    success: "#059669",
    successBackground: "#ECFDF5",
    successBorder: "#A7F3D0",
    muted: "#9CA3AF",
    disabledText: "#9CA3AF",
    // Backwards compatibility
    text: "#064E3B",
    textMuted: "#374151",
    primary: "#059669",
    primaryForeground: "#FFFFFF",
  },
  dark: {
    background: "#022C22",
    surface: "#064E3B",
    textPrimary: "#ECFDF5",
    textSecondary: "#A7F3D0",
    border: "#047857",
    borderFocus: "#34D399",
    primaryAction: "#34D399",
    primaryActionForeground: "#022C22",
    primaryActionHover: "#6EE7B7",
    secondaryAction: "#047857",
    secondaryActionForeground: "#ECFDF5",
    secondaryActionHover: "#065F46",
    focusRing: "#6EE7B7",
    error: "#FCA5A5",
    errorBackground: "#450A0A",
    errorBorder: "#7F1D1D",
    success: "#34D399",
    successBackground: "#022C22",
    successBorder: "#047857",
    muted: "#6B7280",
    disabledText: "#6B7280",
    // Backwards compatibility
    text: "#ECFDF5",
    textMuted: "#A7F3D0",
    primary: "#34D399",
    primaryForeground: "#022C22",
  },
};

export const THEME_PRESET_SLATE: ThemeDefinition = {
  presetName: "Slate",
  isCustomShuffle: false,
  light: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    border: "#CBD5E1",
    borderFocus: "#0F172A",
    primaryAction: "#0F172A",
    primaryActionForeground: "#FFFFFF",
    primaryActionHover: "#1E293B",
    secondaryAction: "#F1F5F9",
    secondaryActionForeground: "#0F172A",
    secondaryActionHover: "#E2E8F0",
    focusRing: "#64748B",
    error: "#DC2626",
    errorBackground: "#FEF2F2",
    errorBorder: "#FCA5A5",
    success: "#16A34A",
    successBackground: "#F0FDF4",
    successBorder: "#86EFAC",
    muted: "#94A3B8",
    disabledText: "#94A3B8",
    // Backwards compatibility
    text: "#0F172A",
    textMuted: "#475569",
    primary: "#0F172A",
    primaryForeground: "#FFFFFF",
  },
  dark: {
    background: "#020617",
    surface: "#0F172A",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    border: "#334155",
    borderFocus: "#F8FAFC",
    primaryAction: "#F8FAFC",
    primaryActionForeground: "#020617",
    primaryActionHover: "#E2E8F0",
    secondaryAction: "#1E293B",
    secondaryActionForeground: "#F8FAFC",
    secondaryActionHover: "#334155",
    focusRing: "#94A3B8",
    error: "#F87171",
    errorBackground: "#450A0A",
    errorBorder: "#7F1D1D",
    success: "#4ADE80",
    successBackground: "#052E16",
    successBorder: "#14532D",
    muted: "#64748B",
    disabledText: "#64748B",
    // Backwards compatibility
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    primary: "#F8FAFC",
    primaryForeground: "#020617",
  },
};

export const THEME_PRESETS: Record<string, ThemeDefinition> = {
  Ocean: THEME_PRESET_OCEAN,
  Emerald: THEME_PRESET_EMERALD,
  Slate: THEME_PRESET_SLATE,
};

// ---------------------------------------------------------------------------
// Shuffle Palette Generator (Deterministic HSL with Guaranteed WCAG AA)
// ---------------------------------------------------------------------------

function hslToRgb(h: number, s: number, l: number): RgbColor {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return { r: f(0), g: f(8), b: f(4) };
}

/**
 * Generates an accessible, clinical-grade color palette using HSL harmonics.
 * Guarantees WCAG 2.1 Level AA contrast compliance for both light and dark modes.
 */
export function generateShuffledTheme(
  seed: number = Date.now(),
): ThemeDefinition {
  // Derive primary hue from seed: select harmonic clinical hues (blue, teal, green, purple, slate)
  const baseHues = [200, 215, 160, 175, 260, 280, 210, 190];
  const primaryHue = baseHues[Math.abs(seed) % baseHues.length] ?? 210;

  // Dynamically compute light primary: decrease lightness until contrast on white >= 4.5:1
  let lLight = 32;
  let lightPrimaryRgb = hslToRgb(primaryHue, 85, lLight);
  let lightPrimaryHex = rgbToHex(
    lightPrimaryRgb.r,
    lightPrimaryRgb.g,
    lightPrimaryRgb.b,
  );
  while (getContrastRatio(lightPrimaryHex, "#FFFFFF") < 4.5 && lLight > 12) {
    lLight -= 2;
    lightPrimaryRgb = hslToRgb(primaryHue, 85, lLight);
    lightPrimaryHex = rgbToHex(
      lightPrimaryRgb.r,
      lightPrimaryRgb.g,
      lightPrimaryRgb.b,
    );
  }

  const lightActionHoverRgb = hslToRgb(
    primaryHue,
    90,
    Math.max(10, lLight - 8),
  );
  const lightActionHoverHex = rgbToHex(
    lightActionHoverRgb.r,
    lightActionHoverRgb.g,
    lightActionHoverRgb.b,
  );

  // Dynamically compute dark primary: increase lightness until contrast on #0B1120 >= 4.5:1
  let lDark = 65;
  let darkPrimaryRgb = hslToRgb(primaryHue, 85, lDark);
  let darkPrimaryHex = rgbToHex(
    darkPrimaryRgb.r,
    darkPrimaryRgb.g,
    darkPrimaryRgb.b,
  );
  while (getContrastRatio(darkPrimaryHex, "#0B1120") < 4.5 && lDark < 90) {
    lDark += 2;
    darkPrimaryRgb = hslToRgb(primaryHue, 85, lDark);
    darkPrimaryHex = rgbToHex(
      darkPrimaryRgb.r,
      darkPrimaryRgb.g,
      darkPrimaryRgb.b,
    );
  }

  const darkActionHoverRgb = hslToRgb(primaryHue, 90, Math.min(95, lDark + 8));
  const darkActionHoverHex = rgbToHex(
    darkActionHoverRgb.r,
    darkActionHoverRgb.g,
    darkActionHoverRgb.b,
  );

  const light: ThemeModeTokens = {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    border: "#E2E8F0",
    borderFocus: lightPrimaryHex,
    primaryAction: lightPrimaryHex,
    primaryActionForeground: "#FFFFFF",
    primaryActionHover: lightActionHoverHex,
    secondaryAction: "#F1F5F9",
    secondaryActionForeground: "#1E293B",
    secondaryActionHover: "#E2E8F0",
    focusRing: lightPrimaryHex,
    error: "#DC2626",
    errorBackground: "#FEF2F2",
    errorBorder: "#FCA5A5",
    success: "#16A34A",
    successBackground: "#F0FDF4",
    successBorder: "#86EFAC",
    muted: "#94A3B8",
    disabledText: "#94A3B8",
    // Backwards compatibility
    text: "#0F172A",
    textMuted: "#475569",
    primary: lightPrimaryHex,
    primaryForeground: "#FFFFFF",
  };

  const dark: ThemeModeTokens = {
    background: "#0B1120",
    surface: "#1E293B",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    border: "#334155",
    borderFocus: darkPrimaryHex,
    primaryAction: darkPrimaryHex,
    primaryActionForeground: "#0B1120",
    primaryActionHover: darkActionHoverHex,
    secondaryAction: "#334155",
    secondaryActionForeground: "#F1F5F9",
    secondaryActionHover: "#475569",
    focusRing: darkPrimaryHex,
    error: "#F87171",
    errorBackground: "#450A0A",
    errorBorder: "#7F1D1D",
    success: "#4ADE80",
    successBackground: "#052E16",
    successBorder: "#14532D",
    muted: "#64748B",
    disabledText: "#64748B",
    // Backwards compatibility
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    primary: darkPrimaryHex,
    primaryForeground: "#0B1120",
  };

  return {
    presetName: `Shuffle-${primaryHue}`,
    isCustomShuffle: true,
    light,
    dark,
  };
}

/**
 * Converts a ThemeDefinition into CSS variables for inline styling or iframe previews.
 */
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
