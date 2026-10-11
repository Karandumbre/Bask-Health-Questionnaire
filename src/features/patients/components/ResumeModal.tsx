"use client";

import { useState, useRef } from "react";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogHeader, DialogActions } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  resumePatientSession,
  type ResumeSessionData,
} from "../client/patient-api";
import { apiErrorMessage } from "@/lib/http/api-client";

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeSuccess: (data: ResumeSessionData) => void;
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

      onResumeSuccess(response.data);
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
      <DialogHeader
        align="center"
        titleId="resume-title"
        title="Resume Previous Intake Session"
        description="Enter the session reference and recovery code issued during your earlier visit."
      />

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <FormField
          id="resume-session-ref"
          label="Session Reference (e.g. BKS-9A4F-71KQ)"
        >
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
        </FormField>

        <FormField
          id="resume-recovery-code"
          label="Recovery Code (e.g. BK-7M4P-88XZ-11QR)"
        >
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
        </FormField>

        {errorMessage && <Alert>{errorMessage}</Alert>}

        <DialogActions className="pt-2">
          <Button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            loadingLabel={APP_MESSAGES.RESTORING}
            variant="primary"
            size="sm"
          >
            {APP_MESSAGES.RESTORE_PROGRESS}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
