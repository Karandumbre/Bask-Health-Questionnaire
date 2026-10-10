"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { useClipboard } from "@/lib/hooks/use-clipboard";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogHeader, DialogActions } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { apiErrorMessage } from "@/lib/http/api-client";
import { publishForm } from "../client/forms-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useState, useRef } from "react";
import { useBuilder } from "../context/builder-context";
import {
  SendIcon,
  AlertTriangleIcon,
  CheckIcon,
  ExternalIcon,
} from "@/components/ui/icons";

export function PublishModal() {
  const { isPublishModalOpen } = useBuilder();
  return isPublishModalOpen ? <PublishDialog /> : null;
}

function PublishDialog() {
  const {
    formId,
    saveStatus,
    saveForPublish,
    resolveConflictReload,
    definition,
    closePublishModal,
    publishValidationErrors,
    selectQuestion,
  } = useBuilder();

  const busy = useRef(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    versionNumber: number;
    publicSlug: string;
    publicUrl: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { copied, copying, copyError, copy } = useClipboard();

  const [operationId] = useState(() => crypto.randomUUID());

  const handlePublish = async () => {
    if (busy.current) return;
    busy.current = true;
    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const revision = await saveForPublish();
      if (revision === null) {
        setErrorMessage(
          APP_MESSAGES.SAVE_THE_LATEST_CHANGES_AND_RESOLVE_ANY_DRAFT_CONFLICT,
        );
        return;
      }
      const data = await publishForm(formId, revision, operationId);
      // Publication advances the server draft revision. Synchronize before the
      // editor resumes so its next save uses the acknowledged revision.
      if (!(await resolveConflictReload()))
        setErrorMessage(
          APP_MESSAGES.THE_FORM_WAS_PUBLISHED_BUT_THE_DRAFT_COULD_NOT,
        );

      setPublishResult({
        versionNumber: data.versionNumber,
        publicSlug: data.publicSlug,
        publicUrl: new URL(data.publicUrl, window.location.origin).href,
      });
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(
          error,
          APP_MESSAGES.NETWORK_ERROR_DURING_PUBLICATION_PLEASE_RETRY,
        ),
      );
    } finally {
      busy.current = false;
      setIsPublishing(false);
    }
  };

  const handleFixQuestion = (qId?: string) => {
    if (qId) {
      selectQuestion(qId);
      closePublishModal();
    }
  };

  return (
    <Dialog
      open
      titleId="publish-title"
      onClose={isPublishing ? undefined : closePublishModal}
      className="space-y-4"
    >
      {/* Header */}
      <DialogHeader
        titleId="publish-title"
        title={
          publishResult
            ? APP_MESSAGES.FORM_PUBLISHED_SUCCESSFULLY
            : APP_MESSAGES.PUBLISH_IMMUTABLE_VERSION
        }
        description={
          publishResult
            ? APP_MESSAGES.THIS_VERSION_SNAPSHOT_IS_NOW_LOCKED_AND_AVAILABLE_FOR
            : APP_MESSAGES.CREATES_AN_IMMUTABLE_SNAPSHOT_OF_ALL_QUESTIONS_AND_THEME
        }
        onClose={closePublishModal}
        closeLabel={APP_MESSAGES.CLOSE_PUBLISH_DIALOG}
        disabled={isPublishing}
      />

      {errorMessage && publishResult && <Alert>{errorMessage}</Alert>}
      {copyError && (
        <p role="alert" className="text-xs text-red-600">
          {copyError}
        </p>
      )}
      {/* Branch 1: Published Success State */}
      {publishResult ? (
        <div className="space-y-4 pt-2">
          <div
            role="status"
            className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3"
          >
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckIcon className="w-5 h-5" />
            </div>
            <div className="text-xs text-emerald-900">
              <p className="font-bold">
                {APP_MESSAGES.VERSION} {publishResult.versionNumber}{" "}
                {APP_MESSAGES.CREATED}
              </p>
              <p className="mt-0.5 text-emerald-700">
                {
                  APP_MESSAGES.PATIENT_SESSIONS_ON_THIS_VERSION_WILL_REMAIN_BOUND_TO
                }
              </p>
            </div>
          </div>

          <FormField
            id="published-url"
            label={APP_MESSAGES.PUBLIC_PATIENT_URL}
            description={APP_MESSAGES.SHARE_PATIENT_LINK}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="text"
                readOnly
                id="published-url"
                value={publishResult.publicUrl}
                className="flex-1 text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 font-mono text-gray-700"
              />
              <Button
                loading={copying}
                loadingLabel={APP_MESSAGES.COPYING}
                onClick={() => void copy(publishResult.publicUrl)}
                className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? "Copied!" : APP_MESSAGES.COPY_LINK}
              </Button>
              <a
                href={publishResult.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-gray-500 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={APP_MESSAGES.OPEN_INTAKE_IN_NEW_TAB}
                aria-label={APP_MESSAGES.OPEN_INTAKE_IN_NEW_TAB}
              >
                <ExternalIcon className="w-4 h-4" />
              </a>
            </div>
          </FormField>

          <div className="pt-2 flex justify-end">
            <Button
              disabled={isPublishing}
              onClick={closePublishModal}
              className="px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-black"
            >
              {APP_MESSAGES.DONE}
            </Button>
          </div>
        </div>
      ) : (
        /* Branch 2: Pre-Publish Validation & Confirmation State */
        <div className="space-y-4 pt-1">
          {/* Validation Errors List if any */}
          {publishValidationErrors.length > 0 ? (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                <AlertTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  {APP_MESSAGES.CANNOT_PUBLISH} {publishValidationErrors.length}{" "}
                  {APP_MESSAGES.ISSUE}
                  {publishValidationErrors.length > 1 ? "s" : ""}{" "}
                  {APP_MESSAGES.FOUND}
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {publishValidationErrors.map((err, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-red-700 flex items-start justify-between gap-2 p-1.5 rounded bg-white/70 border border-red-200/60"
                  >
                    <span>• {err.issue}</span>
                    {err.questionId && (
                      <Button
                        onClick={() => handleFixQuestion(err.questionId)}
                        className="text-caption font-semibold text-blue-600 hover:underline shrink-0"
                      >
                        {APP_MESSAGES.FIX_FIELD}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Ready to Publish Summary */
            <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4 space-y-2">
              <p className="text-xs font-bold text-blue-900">
                {APP_MESSAGES.PUBLISH_READINESS_SUMMARY}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                <div>
                  • {definition.questions.length}{" "}
                  {APP_MESSAGES.CLINICAL_QUESTIONS}
                </div>
                <div>
                  •{" "}
                  {
                    definition.questions.filter((q) => q.visibility !== null)
                      .length
                  }{" "}
                  {APP_MESSAGES.CONDITIONAL_RULES}
                </div>
                <div>
                  {saveStatus === "saved"
                    ? APP_MESSAGES.ALL_CHANGES_SAVED
                    : APP_MESSAGES.SAVE_REQUIRED_BEFORE_PUBLISH}
                </div>
                <div>{APP_MESSAGES.ALL_CLINICAL_INVARIANTS_VERIFIED}</div>
              </div>
            </div>
          )}

          {errorMessage && <Alert>{errorMessage}</Alert>}

          {/* Actions */}
          <DialogActions>
            <Button
              type="button"
              disabled={isPublishing}
              onClick={closePublishModal}
              variant="secondary"
              className="py-2"
            >
              {APP_MESSAGES.CANCEL}
            </Button>

            <Button
              type="button"
              disabled={publishValidationErrors.length > 0 || isPublishing}
              loading={isPublishing}
              loadingLabel={APP_MESSAGES.PUBLISHING}
              onClick={handlePublish}
              variant="primary"
              className="py-2"
            >
              <SendIcon className="w-3.5 h-3.5" />
              <span>
                {isPublishing ? "Publishing..." : APP_MESSAGES.CONFIRM_PUBLISH}
              </span>
            </Button>
          </DialogActions>
        </div>
      )}
    </Dialog>
  );
}
