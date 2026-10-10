"use client";

import { Dialog } from "@/components/ui/dialog";
import { apiErrorMessage } from "@/lib/http/api-client";
import { publishForm } from "../client/forms-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useState } from "react";
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
    draftRevision,
    saveForPublish,
    resolveConflictReload,
    definition,
    closePublishModal,
    publishValidationErrors,
    selectQuestion,
  } = useBuilder();

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    versionNumber: number;
    publicSlug: string;
    publicUrl: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [operationId] = useState(() => crypto.randomUUID());

  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const revision = await saveForPublish();
      if (revision === null) {
        setErrorMessage("Save the latest changes and resolve any draft conflict before publishing.");
        return;
      }
      const data = await publishForm(formId, revision, operationId);
      // Publication advances the server draft revision. Synchronize before the
      // editor resumes so its next save uses the acknowledged revision.
      await resolveConflictReload();

      setPublishResult({
        versionNumber: data.versionNumber,
        publicSlug: data.publicSlug,
        publicUrl: data.publicUrl,
      });
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Network error during publication. Please retry."));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFixQuestion = (qId?: string) => {
    if (qId) {
      selectQuestion(qId);
      closePublishModal();
    }
  };

  return (
    <Dialog open titleId="publish-title" onClose={isPublishing ? undefined : closePublishModal} className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 id="publish-title" className="text-base font-bold text-gray-900">
              {publishResult ? "Form Published Successfully!" : "Publish Immutable Version"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {publishResult
                ? "This version snapshot is now locked and available for patient intake."
                : "Creates an immutable snapshot of all questions and theme settings."}
            </p>
          </div>
          <Button
            disabled={isPublishing}
            onClick={closePublishModal}
            aria-label="Close publish dialog"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            ✕
          </Button>
        </div>

        {/* Branch 1: Published Success State */}
        {publishResult ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <CheckIcon className="w-5 h-5" />
              </div>
              <div className="text-xs text-emerald-900">
                <p className="font-bold">Version {publishResult.versionNumber} Created</p>
                <p className="mt-0.5 text-emerald-700">
                  Patient sessions on this version will remain bound to its exact questions forever.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="published-url" className="block text-xs font-semibold text-gray-700 mb-1">
                Public Patient URL
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  readOnly
                  id="published-url"
                  value={publishResult.publicUrl}
                  className="flex-1 text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 font-mono text-gray-700"
                />
                <Button
                  onClick={() => handleCopyUrl(publishResult.publicUrl)}
                  className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                <a
                  href={publishResult.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-gray-500 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Open intake in new tab"
                >
                  <ExternalIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                disabled={isPublishing}
                onClick={closePublishModal}
                className="px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-black"
              >
                Done
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
                    Cannot Publish — {publishValidationErrors.length} Issue
                    {publishValidationErrors.length > 1 ? "s" : ""} Found:
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
                          className="text-[11px] font-semibold text-blue-600 hover:underline shrink-0"
                        >
                          Fix Field
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Ready to Publish Summary */
              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4 space-y-2">
                <p className="text-xs font-bold text-blue-900">Publish Readiness Summary</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                  <div>• {definition.questions.length} clinical questions</div>
                  <div>
                    •{" "}
                    {
                      definition.questions.filter((q) => q.visibility !== null).length
                    }{" "}
                    conditional rules
                  </div>
                  <div>• Draft revision: {draftRevision}</div>
                  <div>• All clinical invariants verified</div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                disabled={isPublishing}
                onClick={closePublishModal}
                variant="secondary" className="py-2"
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={publishValidationErrors.length > 0 || isPublishing}
                onClick={handlePublish}
                variant="primary" className="py-2"
              >
                <SendIcon className="w-3.5 h-3.5" />
                <span>{isPublishing ? "Publishing..." : "Confirm & Publish"}</span>
              </Button>
            </div>
          </div>
        )}
    </Dialog>
  );
}
