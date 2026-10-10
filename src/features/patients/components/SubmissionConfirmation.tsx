"use client";

import { CheckIcon, InfoIcon } from "@/components/ui/icons";
import { formatStandardDateTime } from "@/lib/utils/date";

interface SubmissionConfirmationProps {
  formTitle: string;
  submissionId: string;
  submittedAt: string | Date;
  isIdempotentReplay?: boolean;
}

export function SubmissionConfirmation({
  formTitle,
  submissionId,
  submittedAt,
  isIdempotentReplay = false,
}: SubmissionConfirmationProps) {
  const formattedDate = formatStandardDateTime(submittedAt);

  return (
    <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 text-center space-y-6">
      {/* Success Badge */}
      <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
        <CheckIcon className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Intake Submitted Successfully
        </h1>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Thank you for completing the{" "}
          <span className="font-semibold text-gray-800">{formTitle}</span>. Your
          responses have been securely received and recorded.
        </p>
      </div>

      {isIdempotentReplay && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 max-w-sm mx-auto flex items-start gap-2 text-left">
          <InfoIcon className="h-4 w-4 shrink-0" />
          <span>Your responses were previously submitted and confirmed.</span>
        </div>
      )}

      {/* Confirmation Metadata Box */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs max-w-sm mx-auto text-left space-y-3">
        <div>
          <span className="text-caption font-bold text-gray-400 uppercase tracking-wider block">
            Submission Reference ID
          </span>
          <span className="font-mono text-xs text-gray-800 break-all select-all font-semibold">
            {submissionId}
          </span>
        </div>
        <div>
          <span className="text-caption font-bold text-gray-400 uppercase tracking-wider block">
            Submitted On
          </span>
          <span className="text-xs text-gray-700 font-medium">
            {formattedDate}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 pt-4">
        You may safely close this browser window.
      </p>
    </div>
  );
}
