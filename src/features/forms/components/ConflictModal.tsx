"use client";

import { useClipboard } from "@/lib/hooks/use-clipboard";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useState, useEffect } from "react";
import { useBuilder } from "../context/builder-context";
import { loadFormDraft } from "../client/forms-api";
import { compareDrafts, type DraftComparison } from "../domain/draft-diff";
import type { FormDefinition, ThemeDefinition } from "../domain/types";
import {
  AlertTriangleIcon,
  UndoIcon,
  SaveIcon,
  CheckIcon,
} from "@/components/ui/icons";

export function ConflictModal() {
  const { conflictDetails } = useBuilder();
  return conflictDetails ? (
    <ConflictDialog key={conflictDetails.serverRevision} />
  ) : null;
}

function ConflictDialog() {
  const {
    formId,
    conflictDetails,
    definition,
    theme,
    resolveConflictReload,
    resolveConflictForce,
  } = useBuilder();

  const { copied, copyError, copy } = useClipboard();
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverDraft, setServerDraft] = useState<{
    definition: FormDefinition;
    theme: ThemeDefinition;
    revision: number;
  } | null>(null);
  const serverDef = serverDraft?.definition;
  const [isLoadingServer, setIsLoadingServer] = useState(true);

  useEffect(() => {
    if (!conflictDetails) {
      return;
    }

    let active = true;
    const controller = new AbortController();
    loadFormDraft(formId, controller.signal)
      .then((data) => {
        if (active) {
          setServerDraft({
            definition: data.definition,
            theme: data.theme,
            revision: data.draft.revision,
          });
        }
      })
      .catch(() => {
        // Fallback: server definition unavailable
      })
      .finally(() => {
        if (active) {
          setIsLoadingServer(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [formId, conflictDetails]);

  if (!conflictDetails) return null;

  const comparison: DraftComparison | null = serverDef
    ? compareDrafts(
        definition,
        serverDef,
        conflictDetails.localRevision,
        serverDraft?.revision ?? conflictDetails.serverRevision,
        { localTheme: theme, serverTheme: serverDraft?.theme },
      )
    : null;

  const handleCopy = () =>
    void copy(JSON.stringify({ definition, theme }, null, 2));

  const handleReload = async () => {
    setIsProcessing(true);
    try {
      await resolveConflictReload();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceOverwrite = async () => {
    setIsProcessing(true);
    try {
      await resolveConflictForce();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open
      titleId="conflict-title"
      className="space-y-4 max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      {/* Warning Icon & Title */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
          <AlertTriangleIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 id="conflict-title" className="text-base font-bold text-gray-900">
            Revision Conflict (HTTP 409)
          </h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Another administrator committed changes to this draft while you were
            editing. To prevent accidental overwrites, your changes have been
            held safely in your browser. Review the field differences below
            before deciding how to resolve.
          </p>
        </div>
      </div>

      {/* Revision Comparison Pill */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-gray-400 block text-[10px] uppercase font-bold">
            Your Local Draft
          </span>
          <span className="font-bold text-gray-800">
            rev {conflictDetails.localRevision} ({definition.questions.length}{" "}
            fields)
          </span>
        </div>
        <div className="text-gray-300 font-sans">➔</div>
        <div>
          <span className="text-gray-400 block text-[10px] uppercase font-bold">
            Server Database Draft
          </span>
          <span className="font-bold text-amber-600">
            rev {conflictDetails.serverRevision}{" "}
            {serverDef ? `(${serverDef.questions.length} fields)` : ""}
          </span>
        </div>
      </div>

      {/* Field Comparison by Stable Question IDs */}
      {isLoadingServer ? (
        <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200 animate-pulse">
          Loading server draft comparison...
        </div>
      ) : comparison ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Field Comparison (by Stable ID)
            </h3>
            <div className="flex items-center gap-1.5 text-[11px]">
              {comparison.summary.modified > 0 && (
                <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                  {comparison.summary.modified} modified
                </span>
              )}
              {comparison.summary.addedLocally > 0 && (
                <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                  {comparison.summary.addedLocally} only local
                </span>
              )}
              {comparison.summary.addedOnServer > 0 && (
                <span className="bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                  {comparison.summary.addedOnServer} only server
                </span>
              )}
            </div>
          </div>

          {comparison.hasTitleChange && (
            <p className="text-xs">
              Title: {comparison.localTitle} → {comparison.serverTitle}
            </p>
          )}
          {comparison.metadataChanges.map((change) => (
            <div key={change.property} className="text-xs break-all">
              <strong>{change.property}:</strong> {String(change.localValue)} →{" "}
              {String(change.serverValue)}
            </div>
          ))}
          <div className="max-h-56 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
            {comparison.questionDiffs.filter((d) => d.status !== "unchanged")
              .length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-2">
                No question property differences detected (metadata or ordering
                conflict).
              </p>
            ) : (
              comparison.questionDiffs
                .filter((d) => d.status !== "unchanged")
                .map((diff) => (
                  <div
                    key={diff.questionId}
                    className="p-2.5 rounded-lg border bg-white border-gray-200 text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        {diff.label || "Untitled Field"}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        ID: {diff.questionId}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      {diff.changes.map((c, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded border border-gray-100 font-sans"
                        >
                          <div>
                            <span className="text-[10px] text-gray-400 block font-medium uppercase">
                              Your Local ({c.property}):
                            </span>
                            <span className="font-semibold text-blue-700">
                              {String(c.localValue)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-medium uppercase">
                              Server ({c.property}):
                            </span>
                            <span className="font-semibold text-amber-700">
                              {String(c.serverValue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : null}

      {copyError && (
        <p role="alert" className="text-xs text-red-600">
          {copyError}
        </p>
      )}
      {/* Copy Backup Option */}
      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
        <div className="text-xs text-blue-900">
          <p className="font-semibold">Prevent Data Loss</p>
          <p className="text-[11px] text-blue-700 mt-0.5">
            Copy your local draft JSON to clipboard before choosing an action.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium bg-white text-blue-700 border border-blue-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-blue-50 transition-colors"
        >
          {copied ? (
            <>
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Copied!</span>
            </>
          ) : (
            <span>Copy JSON</span>
          )}
        </Button>
      </div>

      {/* Resolution Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
        <Button
          type="button"
          disabled={isProcessing}
          onClick={handleReload}
          variant="secondary"
        >
          <UndoIcon className="w-4 h-4 text-gray-500" />
          <span>
            Discard Local & Accept Server (rev {conflictDetails.serverRevision})
          </span>
        </Button>

        <Button
          type="button"
          disabled={isProcessing}
          onClick={handleForceOverwrite}
          variant="warning"
        >
          <SaveIcon className="w-4 h-4" />
          <span>
            Keep Mine (CAS Save against rev {conflictDetails.serverRevision})
          </span>
        </Button>
      </div>
    </Dialog>
  );
}
