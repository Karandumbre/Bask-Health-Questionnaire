"use client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useBuilder } from "@/features/forms/context/builder-context";
import { THEME_PRESETS, generateShuffledTheme } from "../domain/theme-tokens";

export function ThemeControls({
  mode,
  onModeChange,
}: {
  mode: "light" | "dark";
  onModeChange: (mode: "light" | "dark") => void;
}) {
  const { theme, updateTheme, activeMode } = useBuilder();
  return (
    <div className="mb-4 flex w-full max-w-2xl flex-wrap items-center gap-2">
      {activeMode === "editor" && (
        <>
          <label htmlFor="theme-preset" className="text-xs font-medium">
            Theme
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
              <option value="custom">Custom Shuffle</option>
            )}
          </Select>
          <Button
            variant="secondary"
            onClick={() => updateTheme(generateShuffledTheme())}
          >
            Shuffle
          </Button>
        </>
      )}
      {activeMode === "preview" && (
        <Button
          variant="secondary"
          onClick={() => onModeChange(mode === "light" ? "dark" : "light")}
        >
          Use {mode === "light" ? "dark" : "light"} mode
        </Button>
      )}
    </div>
  );
}
