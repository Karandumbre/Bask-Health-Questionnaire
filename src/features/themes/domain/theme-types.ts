import { THEME_PRESET_OCEAN } from "./presets";
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

const canonicalThemeSchema = z.object({
  presetName: z.string(),
  isCustomShuffle: z.boolean().default(false),
  light: ThemeModeTokensSchema,
  dark: ThemeModeTokensSchema,
});

// Read older stored snapshots without rewriting their immutable database JSON.
export const ThemeDefinitionSchema = z.preprocess((input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const value = input as Record<string, unknown>;
  const mode = (raw: unknown, defaults: ThemeModeTokens) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
    const tokens = raw as Record<string, unknown>;
    if (tokens.textPrimary !== undefined) return raw;
    return { ...defaults, ...tokens, textPrimary: tokens.text, primaryAction: tokens.primary, primaryActionForeground: tokens.primaryForeground };
  };
  return { ...value, light: mode(value.light, THEME_PRESET_OCEAN.light), dark: mode(value.dark, THEME_PRESET_OCEAN.dark) };
}, canonicalThemeSchema);
export type ThemeDefinition = z.infer<typeof canonicalThemeSchema>;

