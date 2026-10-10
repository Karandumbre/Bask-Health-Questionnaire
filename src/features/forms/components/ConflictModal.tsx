"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { useClipboard } from "@/lib/hooks/use-clipboard";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useState, useEffect, useMemo } from "react";
import { useBuilder } from "../context/builder-context";
import { loadFormDraft } from "../client/forms-api";
import { compareDrafts, type DraftComparison } from "../domain/draft-diff";
import { threeWayMergeDrafts } from "../domain/three-way-merge";
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
    baseDefinition,
    baseTheme,
    resolveConflictReload,
    resolveConflictForce,
    resolveWithMergedDraft,
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

  const [resolutions, setResolutions] = useState<
    Record<string, "local" | "server">
  >({});

  const mergeResult = useMemo(() => {
    if (!serverDef || !serverDraft) return null;
    return threeWayMergeDrafts({
      baseDefinition,
      localDefinition: definition,
      serverDefinition: serverDef,
      baseTheme,
      localTheme: theme,
      serverTheme: serverDraft.theme,
      resolutions,
    });
  }, [
    baseDefinition,
    definition,
    serverDef,
    baseTheme,
    theme,
    serverDraft,
    resolutions,
  ]);

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

  const handleApplyMerge = async () => {
    if (!mergeResult || !serverDraft) return;
    setIsProcessing(true);
    try {
      await resolveWithMergedDraft(
        mergeResult.mergedDefinition,
        mergeResult.mergedTheme,
        serverDraft.revision,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open
      titleId="conflict-title"
      className="space-y-4 max-w-2xl max-h-conflict-height overflow-y-auto"
    >
      {/* Warning Icon & Title */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
          <AlertTriangleIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 id="conflict-title" className="text-base font-bold text-gray-900">
            {APP_MESSAGES.THREE_WAY_DRAFT_CONFLICT_RESOLUTION}
          </h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {
              APP_MESSAGES.ANOTHER_ADMINISTRATOR_SAVED_CHANGES_TO_THIS_DRAFT_NON_OVERLAPPING
            }
          </p>
        </div>
      </div>

      {/* Revision Comparison Pill */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-gray-400 block text-micro uppercase font-bold">
            {APP_MESSAGES.BASE_ACKNOWLEDGED}
          </span>
          <span className="font-bold text-gray-600">
            {APP_MESSAGES.REV} {conflictDetails.localRevision} (
            {baseDefinition.questions.length} {APP_MESSAGES.FIELDS}
          </span>
        </div>
        <div className="text-gray-300 font-sans">➔</div>
        <div>
          <span className="text-gray-400 block text-micro uppercase font-bold">
            {APP_MESSAGES.YOUR_LOCAL_UNSAVED}
          </span>
          <span className="font-bold text-blue-700">
            {definition.questions.length} {APP_MESSAGES.FIELDS_2}
          </span>
        </div>
        <div className="text-gray-300 font-sans">➔</div>
        <div>
          <span className="text-gray-400 block text-micro uppercase font-bold">
            {APP_MESSAGES.LATEST_SERVER}
          </span>
          <span className="font-bold text-amber-600">
            {APP_MESSAGES.REV} {conflictDetails.serverRevision}{" "}
            {serverDef ? `(${serverDef.questions.length} fields)` : ""}
          </span>
        </div>
      </div>

      {/* Auto-Merge Summary Banner */}
      {mergeResult && (
        <div className="space-y-2">
          {(mergeResult.summary.appliedLocalChanges.length > 0 ||
            mergeResult.summary.appliedServerChanges.length > 0) && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {APP_MESSAGES.AUTO_MERGED_NON_OVERLAPPING_CHANGES}
                  {mergeResult.summary.appliedLocalChanges.length +
                    mergeResult.summary.appliedServerChanges.length}
                  ):
                </span>
              </div>
              <ul className="list-disc list-inside text-caption text-emerald-800 space-y-0.5 pl-1">
                {mergeResult.summary.appliedLocalChanges.map((c, idx) => (
                  <li key={`local-${idx}`}>{c}</li>
                ))}
                {mergeResult.summary.appliedServerChanges.map((c, idx) => (
                  <li key={`server-${idx}`}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {mergeResult.hasConflicts ? (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {mergeResult.conflicts.length}{" "}
                  {APP_MESSAGES.OVERLAPPING_CONFLICT}
                  {mergeResult.conflicts.length > 1 ? "s" : ""}{" "}
                  {APP_MESSAGES.REQUIRE_RESOLUTION}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {mergeResult.conflicts.map((conf) => {
                  const currentPick = resolutions[conf.id] || "local";
                  return (
                    <div
                      key={conf.id}
                      className="p-2.5 rounded-lg bg-white border border-amber-200 text-xs space-y-1.5 shadow-2xs"
                    >
                      <p className="font-semibold text-gray-900">
                        {conf.questionLabel || conf.property || "Conflict"}
                      </p>
                      <p className="text-caption text-gray-600">
                        {conf.description}
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          onClick={() =>
                            setResolutions((prev) => ({
                              ...prev,
                              [conf.id]: "local",
                            }))
                          }
                          className={`text-caption px-2.5 py-1 rounded border font-medium ${
                            currentPick === "local"
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {APP_MESSAGES.KEEP_LOCAL}
                        </Button>
                        <Button
                          type="button"
                          onClick={() =>
                            setResolutions((prev) => ({
                              ...prev,
                              [conf.id]: "server",
                            }))
                          }
                          className={`text-caption px-2.5 py-1 rounded border font-medium ${
                            currentPick === "server"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {APP_MESSAGES.USE_SERVER}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 font-medium">
              {
                APP_MESSAGES.NO_OVERLAPPING_FIELD_COLLISIONS_ALL_CONCURRENT_EDITS_WERE_SAFELY
              }
            </div>
          )}
        </div>
      )}

      {/* Field Comparison by Stable Question IDs */}
      {isLoadingServer ? (
        <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200 animate-pulse">
          {APP_MESSAGES.LOADING_SERVER_DRAFT_COMPARISON}
        </div>
      ) : comparison ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              {APP_MESSAGES.FIELD_DIFFERENCES_BREAKDOWN}
            </h3>
            <div className="flex items-center gap-1.5 text-caption">
              {comparison.summary.modified > 0 && (
                <span className="bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                  {comparison.summary.modified} {APP_MESSAGES.MODIFIED}
                </span>
              )}
              {comparison.summary.addedLocally > 0 && (
                <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                  {comparison.summary.addedLocally}{" "}
                  {APP_MESSAGES.LOCAL_ADDITIONS}
                </span>
              )}
              {comparison.summary.addedOnServer > 0 && (
                <span className="bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                  {comparison.summary.addedOnServer}{" "}
                  {APP_MESSAGES.SERVER_ADDITIONS}
                </span>
              )}
            </div>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
            {comparison.questionDiffs
              .filter((d) => d.status !== "unchanged")
              .map((diff) => (
                <div
                  key={diff.questionId}
                  className="p-2 rounded-lg border bg-white border-gray-200 text-xs space-y-1 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">
                      {diff.label || APP_MESSAGES.UNTITLED_FIELD}
                    </span>
                    <span className="font-mono text-micro text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {APP_MESSAGES.ID} {diff.questionId}
                    </span>
                  </div>
                  {diff.changes.map((c, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded text-caption"
                    >
                      <div>
                        <span className="text-micro text-gray-400 uppercase font-medium">
                          {APP_MESSAGES.LOCAL}
                        </span>
                        <span className="font-semibold text-blue-700">
                          {String(c.localValue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-micro text-gray-400 uppercase font-medium">
                          {APP_MESSAGES.SERVER}
                        </span>
                        <span className="font-semibold text-amber-700">
                          {String(c.serverValue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
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
          <p className="font-semibold">{APP_MESSAGES.PREVENT_DATA_LOSS}</p>
          <p className="text-caption text-blue-700 mt-0.5">
            {
              APP_MESSAGES.COPY_YOUR_LOCAL_DRAFT_JSON_TO_CLIPBOARD_BEFORE_CHOOSING
            }
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
              <span>{APP_MESSAGES.COPIED}</span>
            </>
          ) : (
            <span>{APP_MESSAGES.COPY_JSON}</span>
          )}
        </Button>
      </div>

      {/* Resolution Actions */}
      <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
        <Button
          type="button"
          disabled={isProcessing}
          onClick={handleReload}
          variant="secondary"
        >
          <UndoIcon className="w-4 h-4 text-gray-500" />
          <span>{APP_MESSAGES.DISCARD_LOCAL_ACCEPT_SERVER}</span>
        </Button>

        <Button
          type="button"
          disabled={isProcessing}
          onClick={handleForceOverwrite}
          variant="warning"
        >
          <SaveIcon className="w-4 h-4" />
          <span>{APP_MESSAGES.KEEP_ALL_MINE_OVERWRITE_SERVER}</span>
        </Button>

        {mergeResult && (
          <Button
            type="button"
            disabled={isProcessing}
            onClick={handleApplyMerge}
            variant="primary"
          >
            <CheckIcon className="w-4 h-4" />
            <span>
              {mergeResult.hasConflicts
                ? APP_MESSAGES.APPLY_RESOLVED_MERGE_SAVE_CAS
                : APP_MESSAGES.APPLY_SAFE_3_WAY_MERGE_SAVE_CAS}
            </span>
          </Button>
        )}
      </div>
    </Dialog>
  );
}
