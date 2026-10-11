"use client";

import { Text } from "@/components/ui/text";
import { Alert } from "@/components/ui/alert";
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
        <Text as="h1" variant="title" tone="primary" weight="bold">
          Intake Submitted Successfully
        </Text>
        <div className="max-w-md mx-auto">
          <Text as="p" variant="body" tone="secondary">
            Thank you for completing the{" "}
            <Text variant="inherit" tone="primary" weight="semibold">
              {formTitle}
            </Text>
            . Your responses have been securely received and recorded.
          </Text>
        </div>
      </div>

      {isIdempotentReplay && (
        <Alert
          tone="info"
          className="rounded-xl max-w-sm mx-auto flex items-start gap-2 text-left"
        >
          <InfoIcon className="h-4 w-4 shrink-0" />
          <Text variant="inherit">
            Your responses were previously submitted and confirmed.
          </Text>
        </Alert>
      )}

      {/* Confirmation Metadata Box */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs max-w-sm mx-auto text-left space-y-3">
        <div>
          <span className="block">
            <Text variant="caption" tone="subtle" uppercase weight="bold">
              Submission Reference ID
            </Text>
          </span>
          <span className="break-all select-all">
            <Text variant="small" tone="primary" mono weight="semibold">
              {submissionId}
            </Text>
          </span>
        </div>
        <div>
          <span className="block">
            <Text variant="caption" tone="subtle" uppercase weight="bold">
              Submitted On
            </Text>
          </span>
          <Text variant="small" tone="secondary" weight="medium">
            {formattedDate}
          </Text>
        </div>
      </div>

      <div className="pt-4">
        <Text as="p" variant="small" tone="subtle">
          You may safely close this browser window.
        </Text>
      </div>
    </div>
  );
}
