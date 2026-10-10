"use client";

import { useMemo } from "react";

interface PatientProgressBarProps {
  answeredCount: number;
  totalCount: number;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  onSaveAndResume?: () => void;
  onResumeExisting?: () => void;
}

export function PatientProgressBar({
  answeredCount,
  totalCount,
  saveStatus = "idle",
  onSaveAndResume,
  onResumeExisting,
}: PatientProgressBarProps) {
  const percentage = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.min(100, Math.round((answeredCount / totalCount) * 100));
  }, [answeredCount, totalCount]);

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-gray-200/80 px-4 py-3 sm:px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <span>
              {answeredCount} of {totalCount} answered ({percentage}%)
            </span>
            {saveStatus === "saving" && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                <svg
                  className="animate-spin h-3 w-3 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
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
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                Unsaved (offline)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onResumeExisting && (
              <button
                type="button"
                onClick={onResumeExisting}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Resume with code
              </button>
            )}
            {onSaveAndResume && (
              <button
                type="button"
                onClick={onSaveAndResume}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
              >
                Save &amp; Exit
              </button>
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
          className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
