"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { useClipboard } from "@/lib/hooks/use-clipboard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { apiErrorMessage } from "@/lib/http/api-client";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogHeader, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { useState, useEffect, useMemo, useRef } from "react";
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
  ArrowRightIcon,
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

  const { copied, copying, copyError, copy } = useClipboard();
  const busy = useRef(false);
  const [pendingAction, setPendingAction] = useState<
    "reload" | "overwrite" | "merge" | null
  >(null);
  const isProcessing = pendingAction !== null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
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
      .catch((error: unknown) => {
        if (active)
          setServerError(
            apiErrorMessage(error, APP_MESSAGES.CONFLICT_LOAD_FAILED),
          );
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
  }, [formId, conflictDetails, loadAttempt]);

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

  const runResolution = async (
    action: "reload" | "overwrite" | "merge",
    operation: () => Promise<boolean>,
  ) => {
    if (busy.current) return;
    busy.current = true;
    setPendingAction(action);
    setActionError(null);
    try {
      if (!(await operation()))
        setActionError(APP_MESSAGES.CONFLICT_ACTION_FAILED);
    } catch (error) {
      setActionError(
        apiErrorMessage(error, APP_MESSAGES.CONFLICT_ACTION_FAILED),
      );
    } finally {
      busy.current = false;
      setPendingAction(null);
    }
  };
  const handleReload = () => runResolution("reload", resolveConflictReload);
  const handleForceOverwrite = () =>
    runResolution("overwrite", resolveConflictForce);
  const handleApplyMerge = () => {
    if (!mergeResult || !serverDraft) return;
    return runResolution("merge", () =>
      resolveWithMergedDraft(
        mergeResult.mergedDefinition,
        mergeResult.mergedTheme,
        serverDraft.revision,
      ),
    );
  };

  return (
    <Dialog
      open
      titleId="conflict-title"
      className="space-y-4 max-w-2xl max-h-conflict-height overflow-y-auto"
    >
      {/* Warning Icon & Title */}
      <DialogHeader
        titleId="conflict-title"
        title={APP_MESSAGES.THREE_WAY_DRAFT_CONFLICT_RESOLUTION}
        description={
          APP_MESSAGES.ANOTHER_ADMINISTRATOR_SAVED_CHANGES_TO_THIS_DRAFT_NON_OVERLAPPING
        }
        icon={
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <AlertTriangleIcon className="w-6 h-6" />
          </div>
        }
      />

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
        <ArrowRightIcon className="h-4 w-4 shrink-0 text-gray-300" />
        <div>
          <span className="text-gray-400 block text-micro uppercase font-bold">
            {APP_MESSAGES.YOUR_LOCAL_UNSAVED}
          </span>
          <span className="font-bold text-blue-700">
            {definition.questions.length} {APP_MESSAGES.FIELDS_2}
          </span>
        </div>
        <ArrowRightIcon className="h-4 w-4 shrink-0 text-gray-300" />
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
            <Alert
              tone="success"
              className="rounded-xl text-emerald-900 space-y-1"
            >
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
            </Alert>
          )}

          {mergeResult.hasConflicts ? (
            <Alert
              tone="warning"
              className="rounded-xl text-amber-900 space-y-2"
            >
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
            </Alert>
          ) : (
            <Alert
              tone="info"
              className="rounded-xl bg-blue-50/80 text-blue-900 font-medium"
            >
              {
                APP_MESSAGES.NO_OVERLAPPING_FIELD_COLLISIONS_ALL_CONCURRENT_EDITS_WERE_SAFELY
              }
            </Alert>
          )}
        </div>
      )}

      {actionError && <Alert>{actionError}</Alert>}
      {serverError && (
        <Alert>
          {serverError}
          <Button
            className="ml-2"
            disabled={isProcessing}
            loading={isLoadingServer}
            loadingLabel={APP_MESSAGES.RETRYING}
            onClick={() => {
              setIsLoadingServer(true);
              setServerError(null);
              setLoadAttempt((value) => value + 1);
            }}
          >
            {APP_MESSAGES.RETRY}
          </Button>
        </Alert>
      )}

      {/* Field Comparison by Stable Question IDs */}
      {isLoadingServer ? (
        <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-200 animate-pulse">
          <span role="status" className="inline-flex items-center gap-2">
            <Spinner />
            {APP_MESSAGES.LOADING_SERVER_DRAFT_COMPARISON}
          </span>
        </div>
      ) : comparison ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              {APP_MESSAGES.FIELD_DIFFERENCES_BREAKDOWN}
            </h3>
            <div className="flex items-center gap-1.5 text-caption">
              {comparison.summary.modified > 0 && (
                <Badge
                  tone="warning"
                  className="bg-amber-100 text-amber-800 border-0 rounded px-2 text-caption"
                >
                  {comparison.summary.modified} {APP_MESSAGES.MODIFIED}
                </Badge>
              )}
              {comparison.summary.addedLocally > 0 && (
                <Badge
                  tone="info"
                  className="bg-blue-100 text-blue-800 border-0 rounded px-2 font-semibold text-caption"
                >
                  {comparison.summary.addedLocally}{" "}
                  {APP_MESSAGES.LOCAL_ADDITIONS}
                </Badge>
              )}
              {comparison.summary.addedOnServer > 0 && (
                <Badge
                  tone="purple"
                  className="bg-purple-100 text-purple-800 border-0 rounded px-2 font-semibold text-caption"
                >
                  {comparison.summary.addedOnServer}{" "}
                  {APP_MESSAGES.SERVER_ADDITIONS}
                </Badge>
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
                    <Badge
                      tone="mono"
                      className="text-micro text-gray-400 border-0"
                    >
                      {APP_MESSAGES.ID} {diff.questionId}
                    </Badge>
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

      {copyError && <Alert>{copyError}</Alert>}

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
          loading={copying}
          loadingLabel={APP_MESSAGES.COPYING}
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
      <DialogActions className="flex-col sm:flex-row">
        <Button
          type="button"
          disabled={isProcessing}
          loading={pendingAction === "reload"}
          loadingLabel={APP_MESSAGES.LOADING}
          onClick={handleReload}
          variant="secondary"
        >
          <UndoIcon className="w-4 h-4 text-gray-500" />
          <span>{APP_MESSAGES.DISCARD_LOCAL_ACCEPT_SERVER}</span>
        </Button>

        <Button
          type="button"
          disabled={isProcessing}
          loading={pendingAction === "overwrite"}
          loadingLabel={APP_MESSAGES.SAVING}
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
            loading={pendingAction === "merge"}
            loadingLabel={APP_MESSAGES.SAVING}
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
      </DialogActions>
    </Dialog>
  );
}
