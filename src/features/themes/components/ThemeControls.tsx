"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { CheckboxField } from "@/components/ui/form-field";
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
    <div className="mb-4 flex w-full max-w-2xl flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
      <div className="flex items-center gap-2">
        <CheckboxField
          id="theme-preset"
          label={`${APP_MESSAGES.THEME_2}:`}
          className="gap-2"
          labelClassName="font-medium text-gray-700"
        >
          <Select
            id="theme-preset"
            wrapperClassName="w-auto"
            className="w-auto text-xs py-1.5"
            disabled={!editable}
            value={theme.isCustomShuffle ? "custom" : theme.presetName}
            onChange={(event) => {
              const preset = THEME_PRESETS[event.target.value];
              if (preset) updateTheme(preset);
            }}
          >
            {Object.keys(THEME_PRESETS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {theme.isCustomShuffle && (
              <option value="custom">{APP_MESSAGES.CUSTOM_SHUFFLE}</option>
            )}
          </Select>
        </CheckboxField>
        <Button
          disabled={!editable}
          onClick={() =>
            updateTheme(
              generateShuffledTheme(
                Math.floor(Math.random() * 360),
                theme.presetName,
              ),
            )
          }
          variant="secondary"
          size="sm"
        >
          {APP_MESSAGES.SHUFFLE}
        </Button>
      </div>

      <Button
        onClick={() => onModeChange(mode === "light" ? "dark" : "light")}
        variant="secondary"
        size="sm"
      >
        {APP_MESSAGES.USE} {mode === "light" ? "dark" : "light"}{" "}
        {APP_MESSAGES.MODE}
      </Button>
    </div>
  );
}
