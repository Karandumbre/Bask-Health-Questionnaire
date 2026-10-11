"use client";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/constants/application";
import { APP_MESSAGES } from "@/lib/constants/messages";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tr, Td } from "@/components/ui/table";
import {
  CheckIcon,
  ChevronDownIcon,
  EditIcon,
  DeleteIcon,
  ShareIcon,
  ExternalIcon,
  ViewIcon,
} from "@/components/ui/icons";
import { formatShortDateTime } from "@/lib/utils/date";
import { useClipboard } from "@/lib/hooks/use-clipboard";
import type { useFormDashboard } from "../hooks/use-form-dashboard";
import type { FormListItem } from "../domain/dashboard-types";

export function FormRow({
  form,
  model,
}: {
  form: FormListItem;
  model: ReturnType<typeof useFormDashboard>;
}) {
  const {
    renamingFormId,
    renamingName,
    setRenamingName,
    setRenamingFormId,
    handleSaveRename,
    handleStartRename,
    handleDeleteForm,
    isMutating,
    pendingAction,
  } = model;

  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { copied, copy } = useClipboard();
  const isPublished = Boolean(form.latestPublishedVersionNumber);
  const publicSlug = form.publicSlug || form.id;

  useEffect(() => {
    if (!isActionsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setIsActionsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionsOpen]);

  const handleCopyLink = () => {
    if (!isPublished) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/intake/${publicSlug}`;
    void copy(publicUrl);
  };

  const isRenamingThisForm = renamingFormId === form.id;
  const isDeletingThisForm =
    pendingAction?.type === "delete" && pendingAction.formId === form.id;

  return (
    <Tr key={form.id}>
      {/* Title (Desktop) + Responsive Summary (Mobile: Ellipsis Name + Status + Last Edited) */}
      <Td className="pl-4 sm:pl-5 pr-3 font-medium text-gray-900 w-full max-w-0 whitespace-normal">
        {isRenamingThisForm ? (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              disabled={isMutating}
              aria-label={APP_MESSAGES.FORM_TITLE}
              value={renamingName}
              onChange={(e) => setRenamingName(e.target.value)}
              className="border border-blue-500 rounded-lg px-2.5 py-1 text-xs outline-none min-w-0 flex-1"
              autoFocus
            />
            <Button
              disabled={isMutating}
              loading={
                pendingAction?.type === "rename" &&
                pendingAction.formId === form.id
              }
              loadingLabel={APP_MESSAGES.SAVING}
              onClick={() => handleSaveRename(form.id)}
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0"
            >
              {APP_MESSAGES.SAVE}
            </Button>
            <Button
              disabled={isMutating}
              onClick={() => setRenamingFormId(null)}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100 whitespace-nowrap shrink-0"
            >
              {APP_MESSAGES.CANCEL}
            </Button>
          </div>
        ) : (
          <div className="min-w-0">
            {/* Top line: Form name with ellipsis + Mobile status badge */}
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={ROUTES.editForm(form.id)}
                title={form.name}
                className="truncate block font-semibold text-gray-900 hover:text-blue-600 transition-colors min-w-0"
              >
                {form.name}
              </Link>

              {/* Compact Status Badge beside truncated name (< md) */}
              <div className="md:hidden shrink-0">
                {isPublished ? (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-micro font-semibold text-emerald-700">
                    <CheckIcon className="w-3 h-3 shrink-0 text-emerald-600" />
                    <span>
                      {APP_MESSAGES.PUBLISHED_V}
                      {form.latestPublishedVersionNumber}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-micro font-semibold text-amber-800">
                    {APP_MESSAGES.UNPUBLISHED_DRAFT}
                  </span>
                )}
              </div>
            </div>

            {/* Compact Second line: Last edited timestamp + revision (< md) */}
            <div className="md:hidden mt-1 flex items-center gap-1.5 text-caption text-gray-500 truncate">
              <span className="truncate">
                {APP_MESSAGES.LAST_EDITED} {formatShortDateTime(form.updatedAt)}
              </span>
              <span aria-hidden="true" className="text-gray-300">
                ·
              </span>
              <span className="font-mono text-gray-400 shrink-0">
                {APP_MESSAGES.REV} {form.draftRevision ?? 0}
              </span>
            </div>
          </div>
        )}
      </Td>

      {/* Desktop Status Badge */}
      <Td className="hidden md:table-cell w-px">
        {isPublished ? (
          <Button
            onClick={handleCopyLink}
            title={APP_MESSAGES.CLICK_TO_COPY_DEPLOYED_LINK}
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer"
          >
            <CheckIcon className="w-3 h-3 shrink-0 text-emerald-600" />
            <span>
              {APP_MESSAGES.PUBLISHED_V}
              {form.latestPublishedVersionNumber}
            </span>
            {copied && (
              <span className="text-micro text-emerald-600 font-normal">
                ({APP_MESSAGES.COPIED})
              </span>
            )}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            {APP_MESSAGES.UNPUBLISHED_DRAFT}
          </span>
        )}
      </Td>

      {/* Desktop Draft Revision */}
      <Td className="hidden md:table-cell w-px">
        <span className="inline-flex items-center rounded-md bg-gray-100 border border-gray-200/80 px-2 py-0.5 font-mono text-caption font-medium text-gray-600 whitespace-nowrap">
          {APP_MESSAGES.REV} {form.draftRevision ?? 0}
        </span>
      </Td>

      {/* Desktop Updated At */}
      <Td className="hidden md:table-cell text-gray-500 text-caption w-px">
        {formatShortDateTime(form.updatedAt)}
      </Td>

      {/* Actions: Inline on Desktop, Dropdown Menu on Mobile */}
      <Td className="pl-3 pr-4 sm:pr-5 text-right w-px">
        {/* Desktop Inline Actions */}
        <div className="hidden md:inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
          {isPublished && (
            <>
              <Button
                type="button"
                onClick={handleCopyLink}
                className="text-caption font-semibold px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300"
                title={APP_MESSAGES.COPY_DEPLOYED_LINK}
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-3 h-3 shrink-0 text-emerald-600" />
                    <span>{APP_MESSAGES.COPIED}</span>
                  </>
                ) : (
                  <>
                    <ShareIcon className="w-3 h-3 shrink-0 text-emerald-600" />
                    <span>{APP_MESSAGES.COPY_LINK}</span>
                  </>
                )}
              </Button>
              <Link
                href={`/intake/${publicSlug}`}
                prefetch={false}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 shrink-0 text-gray-500 hover:text-emerald-700 rounded-lg border border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50 transition-colors inline-flex items-center justify-center"
                title={APP_MESSAGES.OPEN_LIVE_FORM_NEW_TAB}
                aria-label={APP_MESSAGES.OPEN_LIVE_FORM_NEW_TAB}
              >
                <ExternalIcon className="w-3.5 h-3.5" />
              </Link>
            </>
          )}

          <Link
            href={ROUTES.formResponses(form.id)}
            className="inline-flex items-center justify-center whitespace-nowrap shrink-0 text-caption font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
          >
            {APP_MESSAGES.RESPONSES}
          </Link>

          <Link
            href={ROUTES.editForm(form.id)}
            className="inline-flex items-center justify-center whitespace-nowrap shrink-0 text-caption font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1 rounded-lg transition-colors"
          >
            {APP_MESSAGES.OPEN_EDITOR}
          </Link>

          <Button
            disabled={isMutating}
            onClick={() => handleStartRename(form)}
            className="p-1.5 shrink-0 inline-flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={APP_MESSAGES.RENAME_FORM}
            title={APP_MESSAGES.RENAME_FORM}
          >
            <EditIcon className="w-3.5 h-3.5" />
          </Button>

          <Button
            disabled={isMutating}
            onClick={() => handleDeleteForm(form.id, form.name)}
            className="p-1.5 shrink-0 inline-flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            loading={isDeletingThisForm}
            aria-label={
              isDeletingThisForm
                ? APP_MESSAGES.DELETING
                : APP_MESSAGES.ARCHIVE_OR_DELETE_FORM
            }
            title={APP_MESSAGES.ARCHIVE_OR_DELETE_FORM}
          >
            <DeleteIcon className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Mobile Actions Dropdown */}
        <div
          className="md:hidden relative inline-block text-left"
          ref={menuRef}
        >
          <Button
            type="button"
            disabled={isMutating}
            aria-haspopup="menu"
            aria-expanded={isActionsOpen}
            onClick={() => setIsActionsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs whitespace-nowrap"
          >
            <span>{APP_MESSAGES.ACTIONS}</span>
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
          </Button>

          {isActionsOpen && (
            <div
              role="menu"
              aria-label={APP_MESSAGES.ACTIONS}
              className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-gray-200 shadow-lg py-1.5 z-30 text-left"
            >
              <Link
                role="menuitem"
                href={ROUTES.editForm(form.id)}
                onClick={() => setIsActionsOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <EditIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{APP_MESSAGES.OPEN_EDITOR}</span>
              </Link>

              <Link
                role="menuitem"
                href={ROUTES.formResponses(form.id)}
                onClick={() => setIsActionsOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ViewIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                <span>{APP_MESSAGES.RESPONSES}</span>
              </Link>

              {isPublished && (
                <>
                  <Button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      handleCopyLink();
                      setIsActionsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-left"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span>{APP_MESSAGES.COPIED}</span>
                      </>
                    ) : (
                      <>
                        <ShareIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span>{APP_MESSAGES.COPY_LINK}</span>
                      </>
                    )}
                  </Button>

                  <Link
                    role="menuitem"
                    href={`/intake/${publicSlug}`}
                    prefetch={false}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsActionsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                    <span>{APP_MESSAGES.OPEN_LIVE_FORM}</span>
                  </Link>
                </>
              )}

              <div className="my-1 border-t border-gray-100" />

              <Button
                role="menuitem"
                type="button"
                disabled={isMutating}
                onClick={() => {
                  setIsActionsOpen(false);
                  handleStartRename(form);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <EditIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                <span>{APP_MESSAGES.RENAME_FORM}</span>
              </Button>

              <Button
                role="menuitem"
                type="button"
                disabled={isMutating}
                loading={isDeletingThisForm}
                onClick={() => {
                  setIsActionsOpen(false);
                  handleDeleteForm(form.id, form.name);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <DeleteIcon className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <span>
                  {isDeletingThisForm
                    ? APP_MESSAGES.DELETING
                    : APP_MESSAGES.ARCHIVE_OR_DELETE_FORM}
                </span>
              </Button>
            </div>
          )}
        </div>
      </Td>
    </Tr>
  );
}
