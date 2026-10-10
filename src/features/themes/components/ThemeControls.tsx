"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { THEME_PRESETS, generateShuffledTheme } from "../domain/theme-tokens";
import type { ThemeDefinition } from "../domain/theme-tokens";

export function ThemeControls({
  mode,
  onModeChange,
  theme,
  onThemeChange: updateTheme,
  editable,
}: {
  theme: ThemeDefinition;
  onThemeChange: (theme: ThemeDefinition) => void;
  editable: boolean;
  mode: "light" | "dark";
  onModeChange: (mode: "light" | "dark") => void;
}) {
  return (
    <div className="mb-4 flex w-full max-w-2xl flex-wrap items-center gap-2">
      {editable && (
        <>
          <label htmlFor="theme-preset" className="text-xs font-medium">
            {APP_MESSAGES.THEME_2}
          </label>
          <Select
            id="theme-preset"
            className="w-auto"
            value={theme.isCustomShuffle ? "custom" : theme.presetName}
            onChange={(event) => {
              const preset = THEME_PRESETS[event.target.value];
              if (preset) updateTheme(preset);
            }}
          >
            {Object.keys(THEME_PRESETS).map((name) => (
              <option key={name}>{name}</option>
            ))}
            {theme.isCustomShuffle && (
              <option value="custom">{APP_MESSAGES.CUSTOM_SHUFFLE}</option>
            )}
          </Select>
          <Button
            variant="secondary"
            onClick={() => updateTheme(generateShuffledTheme())}
          >
            {APP_MESSAGES.SHUFFLE}
          </Button>
        </>
      )}
      {!editable && (
        <Button
          variant="secondary"
          onClick={() => onModeChange(mode === "light" ? "dark" : "light")}
        >
          {APP_MESSAGES.USE} {mode === "light" ? "dark" : "light"}{" "}
          {APP_MESSAGES.MODE}
        </Button>
      )}
    </div>
  );
}
