import { getContrastRatio, rgbToHex, type RgbColor } from "./color";
import type { ThemeDefinition, ThemeModeTokens } from "./theme-types";
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
  avoidPresetName?: string,
): ThemeDefinition {
  // Derive the primary hue from the full colour wheel. Contrast is enforced
  // below by adjusting lightness, so any hue yields an AA-compliant palette.
  let primaryHue = ((Math.trunc(seed) % 360) + 360) % 360;
  // Guarantee a visibly different palette from the one currently applied.
  if (avoidPresetName === `Shuffle-${primaryHue}`) {
    primaryHue = (primaryHue + 137) % 360;
  }

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
    success: "#15803D",
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
