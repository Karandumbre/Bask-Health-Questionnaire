"use client";

import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { useMemo } from "react";

interface PatientProgressBarProps {
  answeredCount: number;
  totalCount: number;
  saving?: boolean;
  disabled?: boolean;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  onSaveAndResume?: () => void;
  onResumeExisting?: () => void;
  themeMode?: "light" | "dark";
  onToggleThemeMode?: () => void;
  onJumpToNextUnanswered?: () => void;
  unansweredRequiredCount?: number;
}

export function PatientProgressBar({
  answeredCount,
  totalCount,
  saveStatus = "idle",
  saving = false,
  disabled = false,
  onSaveAndResume,
  onResumeExisting,
  themeMode = "light",
  onToggleThemeMode,
  onJumpToNextUnanswered,
  unansweredRequiredCount = 0,
}: PatientProgressBarProps) {
  const percentage = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.min(100, Math.round((answeredCount / totalCount) * 100));
  }, [answeredCount, totalCount]);

  return (
    <div
      data-patient-progress-bar
      data-theme-mode={themeMode}
      className="sticky top-0 z-30 backdrop-blur-xs border-b px-4 py-3 sm:px-6 transition-colors bg-intake-surface/95 border-intake-border text-intake-text-primary"
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs sm:text-sm">
          <div
            role="status"
            className="flex items-center gap-2 font-medium whitespace-nowrap shrink-0"
          >
            <Text variant="inherit" tone="intakeSecondary" wrap="nowrap">
              {answeredCount} of {totalCount} answered ({percentage}%)
            </Text>
            {saveStatus === "saving" && (
              <span className="inline-flex items-center gap-1 shrink-0">
                <Spinner />
                <Text
                  variant="small"
                  tone="intakeSecondary"
                  wrap="nowrap"
                  weight="medium"
                >
                  Saving...
                </Text>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="inline-flex items-center gap-1 shrink-0">
                <CheckIcon className="h-3 w-3 shrink-0" />
                <Text
                  variant="small"
                  tone="intakeSecondary"
                  wrap="nowrap"
                  weight="medium"
                >
                  Saved
                </Text>
              </span>
            )}
            {saveStatus === "error" && (
              <span className="inline-flex items-center gap-1 shrink-0">
                <Text
                  variant="small"
                  tone="intakeSecondary"
                  wrap="nowrap"
                  weight="medium"
                >
                  {APP_MESSAGES.UNSAVED}
                </Text>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Jump to Next Unanswered button for long forms */}
            {onJumpToNextUnanswered && unansweredRequiredCount > 0 && (
              <Button
                type="button"
                onClick={onJumpToNextUnanswered}
                aria-label={`Jump to next required question (${unansweredRequiredCount} remaining)`}
                theme="intake"
                variant="secondary"
                size="xs"
              >
                Next Required ({unansweredRequiredCount})
              </Button>
            )}

            {/* Light/Dark Mode Switcher */}
            {onToggleThemeMode && (
              <Button
                type="button"
                onClick={onToggleThemeMode}
                aria-label={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
                aria-pressed={themeMode === "dark"}
                theme="intake"
                variant="secondary"
                size="xs"
              >
                {themeMode === "light" ? (
                  <MoonIcon className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <SunIcon className="h-3.5 w-3.5 shrink-0" />
                )}
                <Text variant="inherit">
                  {themeMode === "light" ? "Dark" : "Light"}
                </Text>
              </Button>
            )}

            {onResumeExisting && (
              <div className="hidden sm:inline-flex">
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={onResumeExisting}
                  theme="intake"
                  variant="link"
                  size="xs"
                >
                  Resume with code
                </Button>
              </div>
            )}
            {onSaveAndResume && (
              <Button
                type="button"
                disabled={disabled}
                loading={saving}
                loadingLabel={APP_MESSAGES.SAVING}
                onClick={onSaveAndResume}
                theme="intake"
                variant="secondary"
                size="xs"
              >
                Save &amp; Exit
              </Button>
            )}
          </div>
        </div>

        {/* Accessible Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Intake completion progress"
          className="h-1.5 w-full bg-intake-border rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-intake-primary-action transition-all duration-300 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
