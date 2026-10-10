import { describe, expect, it } from "vitest";
import {
  THEME_PRESET_OCEAN,
  THEME_PRESETS,
  auditThemeMode,
  getContrastRatio,
  generateShuffledTheme,
  themeToCssVariables,
  ThemeDefinitionSchema,
} from "@/features/themes/domain/theme-tokens";

describe("Theme Architecture — Typed Tokens, Presets & WCAG 2.1 Contrast", () => {
  it("verifies contrast calculation math against WCAG standards", () => {
    // Pure black (#000000) vs pure white (#FFFFFF) is exactly 21:1
    const maxContrast = getContrastRatio("#000000", "#FFFFFF");
    expect(maxContrast).toBeCloseTo(21, 1);

    // Identical colors have contrast 1:1
    const sameContrast = getContrastRatio("#FFFFFF", "#FFFFFF");
    expect(sameContrast).toBeCloseTo(1, 1);

    // Ocean primary action (#0369A1) on White (#FFFFFF)
    const oceanRatio = getContrastRatio("#0369A1", "#FFFFFF");
    expect(oceanRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("validates all 3 clinical presets against WCAG 2.1 Level AA in Light mode", () => {
    for (const [presetName, preset] of Object.entries(THEME_PRESETS)) {
      const audit = auditThemeMode(preset.light);
      expect(
        audit.violations,
        `Preset ${presetName} (Light) failed WCAG AA: ${JSON.stringify(audit.violations)}`,
      ).toHaveLength(0);
      expect(audit.isCompliant).toBe(true);
      expect(audit.scoreRatio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("validates all 3 clinical presets against WCAG 2.1 Level AA in Dark mode", () => {
    for (const [presetName, preset] of Object.entries(THEME_PRESETS)) {
      const audit = auditThemeMode(preset.dark);
      expect(
        audit.violations,
        `Preset ${presetName} (Dark) failed WCAG AA: ${JSON.stringify(audit.violations)}`,
      ).toHaveLength(0);
      expect(audit.isCompliant).toBe(true);
      expect(audit.scoreRatio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("generates deterministic shuffled palettes with guaranteed WCAG AA compliance", () => {
    const seeds = [42, 108, 999, 1337, 2026];

    for (const seed of seeds) {
      const theme = generateShuffledTheme(seed);

      // Matches schema
      expect(() => ThemeDefinitionSchema.parse(theme)).not.toThrow();
      expect(theme.isCustomShuffle).toBe(true);
      expect(theme.presetName).toContain("Shuffle-");

      // Light mode audit
      const lightAudit = auditThemeMode(theme.light);
      expect(
        lightAudit.violations,
        `Shuffled theme seed ${seed} (Light) had WCAG violations`,
      ).toHaveLength(0);
      expect(lightAudit.isCompliant).toBe(true);

      // Dark mode audit
      const darkAudit = auditThemeMode(theme.dark);
      expect(
        darkAudit.violations,
        `Shuffled theme seed ${seed} (Dark) had WCAG violations`,
      ).toHaveLength(0);
      expect(darkAudit.isCompliant).toBe(true);
    }
  });

  it("converts theme tokens to complete CSS variables for patient/preview rendering", () => {
    const varsLight = themeToCssVariables(THEME_PRESET_OCEAN, "light");
    expect(varsLight["--theme-bg"]).toBe("#F8FAFC");
    expect(varsLight["--theme-surface"]).toBe("#FFFFFF");
    expect(varsLight["--theme-primary-action"]).toBe("#0369A1");
    expect(varsLight["--theme-primary-action-fg"]).toBe("#FFFFFF");
    expect(varsLight["--theme-error"]).toBe("#DC2626");

    const varsDark = themeToCssVariables(THEME_PRESET_OCEAN, "dark");
    expect(varsDark["--theme-bg"]).toBe("#0B1120");
    expect(varsDark["--theme-surface"]).toBe("#1E293B");
    expect(varsDark["--theme-primary-action"]).toBe("#38BDF8");
  });
});
