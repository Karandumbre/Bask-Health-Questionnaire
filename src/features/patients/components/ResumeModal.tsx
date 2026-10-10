"use client";

import { useState, useRef } from "react";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resumePatientSession } from "../client/patient-api";
import { apiErrorMessage } from "@/lib/http/api-client";
import type {
  FormDefinition,
  ThemeDefinition,
} from "@/features/forms/domain/types";
import type { PatientAnswers } from "../domain/types";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeSuccess: (data: {
    sessionId: string;
    sessionReference: string;
    newRecoveryCode: string;
    currentAnswers: PatientAnswers;
    sessionRevision: number;
    publicSlug: string;
    versionNumber: number;
    definition: FormDefinition;
    theme: ThemeDefinition;
  }) => void;
}

export function ResumeModal({
  isOpen,
  onClose,
  onResumeSuccess,
}: ResumeModalProps) {
  const busy = useRef(false);
  const [sessionReference, setSessionReference] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    if (!sessionReference.trim() || !recoveryCode.trim()) {
      setErrorMessage(APP_MESSAGES.RESUME_REQUIRED);
      return;
    }

    busy.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await resumePatientSession(
        sessionReference.trim(),
        recoveryCode.trim(),
      );

      onResumeSuccess({
        publicSlug: response.data.publicSlug,
        versionNumber: response.data.versionNumber,
        definition: response.data.definition,
        theme: response.data.theme,
        sessionId: response.data.sessionId,
        sessionReference: response.data.sessionReference,
        newRecoveryCode: response.data.newRecoveryCode,
        currentAnswers: response.data.currentAnswers as PatientAnswers,
        sessionRevision: response.data.sessionRevision,
      });
      onClose();
    } catch (err) {
      setErrorMessage(apiErrorMessage(err, APP_MESSAGES.RESUME_FAILED));
    } finally {
      busy.current = false;
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={isLoading ? undefined : onClose}
      titleId="resume-title"
      className="space-y-4 max-w-md"
    >
      <div className="text-center space-y-1 pt-1">
        <h2 id="resume-title" className="text-base font-bold text-gray-900">
          Resume Previous Intake Session
        </h2>
        <p className="text-xs text-gray-500">
          Enter the session reference and recovery code issued during your
          earlier visit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="resume-session-ref"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Session Reference (e.g. BKS-9A4F-71KQ)
          </label>
          <Input
            id="resume-session-ref"
            type="text"
            required
            disabled={isLoading}
            value={sessionReference}
            onChange={(e) => setSessionReference(e.target.value)}
            placeholder="BKS-XXXX-XXXX"
            className="uppercase font-mono text-xs py-2 px-3 rounded-lg"
          />
        </div>

        <div>
          <label
            htmlFor="resume-recovery-code"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Recovery Code (e.g. BK-7M4P-88XZ-11QR)
          </label>
          <Input
            id="resume-recovery-code"
            type="text"
            required
            disabled={isLoading}
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            placeholder="BK-XXXX-XXXX-XXXX-XXXX"
            className="uppercase font-mono text-xs py-2 px-3 rounded-lg"
          />
        </div>

        {errorMessage && <Alert>{errorMessage}</Alert>}

        <div className="flex gap-2 pt-2 justify-end">
          <Button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            loadingLabel={APP_MESSAGES.RESTORING}
            variant="primary"
          >
            {APP_MESSAGES.RESTORE_PROGRESS}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
