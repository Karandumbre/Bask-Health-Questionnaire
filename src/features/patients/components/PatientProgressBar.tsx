"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div role="status" className="flex items-center gap-2 font-medium">
            <span className="text-intake-text-secondary">
              {answeredCount} of {totalCount} answered ({percentage}%)
            </span>
            {saveStatus === "saving" && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium">
                <Spinner />
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
                {APP_MESSAGES.UNSAVED}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Jump to Next Unanswered button for long forms */}
            {onJumpToNextUnanswered && unansweredRequiredCount > 0 && (
              <Button
                type="button"
                onClick={onJumpToNextUnanswered}
                className="text-xs font-semibold px-2 py-1 rounded-md border border-intake-border-focus bg-intake-surface text-intake-text-primary hover:bg-intake-bg focus-visible:outline-2 focus-visible:outline-intake-focus-ring transition-colors cursor-pointer"
                aria-label={`Jump to next required question (${unansweredRequiredCount} remaining)`}
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
                className="text-xs px-2 py-1 rounded-md border font-medium border-intake-border bg-intake-bg text-intake-text-primary hover:border-intake-border-focus focus-visible:outline-2 focus-visible:outline-intake-focus-ring transition-colors cursor-pointer"
              >
                {themeMode === "light" ? "🌙 Dark" : "☀️ Light"}
              </Button>
            )}

            {onResumeExisting && (
              <Button
                type="button"
                disabled={disabled}
                onClick={onResumeExisting}
                className="text-xs font-medium text-intake-text-secondary hover:text-intake-text-primary underline underline-offset-2 transition-colors cursor-pointer hidden sm:inline"
              >
                Resume with code
              </Button>
            )}
            {onSaveAndResume && (
              <Button
                type="button"
                disabled={disabled}
                loading={saving}
                loadingLabel={APP_MESSAGES.SAVING}
                onClick={onSaveAndResume}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-intake-border bg-intake-bg hover:border-intake-border-focus text-intake-text-primary focus-visible:outline-2 focus-visible:outline-intake-focus-ring transition-colors cursor-pointer"
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
