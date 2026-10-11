"use client";
import { Text } from "@/components/ui/text";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/constants/application";
import { APP_MESSAGES } from "@/lib/constants/messages";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
      <Td variant="title">
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
              variant="primary"
              size="xs"
            >
              {APP_MESSAGES.SAVE}
            </Button>
            <Button
              disabled={isMutating}
              onClick={() => setRenamingFormId(null)}
              variant="ghost"
              tone="neutral"
              size="xs"
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

              {/* Compact Status Badge beside truncated name (< lg) */}
              <div className="lg:hidden shrink-0">
                {isPublished ? (
                  <Badge tone="success" className="px-2">
                    <CheckIcon className="w-3 h-3 shrink-0 text-emerald-600" />
                    <Text variant="inherit">{APP_MESSAGES.PUBLISHED}</Text>
                  </Badge>
                ) : (
                  <Badge tone="warning" className="px-2">
                    {APP_MESSAGES.UNPUBLISHED_DRAFT}
                  </Badge>
                )}
              </div>
            </div>

            {/* Compact Second line: Last edited timestamp + version + revision (< lg) */}
            <div className="lg:hidden mt-1 flex items-center gap-1.5 text-caption text-gray-500 truncate">
              <span className="truncate">
                {APP_MESSAGES.LAST_EDITED} {formatShortDateTime(form.updatedAt)}
              </span>
              {isPublished && (
                <>
                  <Text
                    aria-hidden="true"

                    variant="inherit"
                    tone="subtle"
                  >
                    ·
                  </Text>
                  <span className="shrink-0">
                    <Text variant="inherit" tone="muted" mono>
                      v{form.latestPublishedVersionNumber}
                    </Text>
                  </span>
                </>
              )}
              <Text
                aria-hidden="true"

                variant="inherit"
                tone="subtle"
              >
                ·
              </Text>
              <span className="shrink-0">
                <Text variant="inherit" tone="subtle" mono>
                  {APP_MESSAGES.REV} {form.draftRevision ?? 0}
                </Text>
              </span>
            </div>
          </div>
        )}
      </Td>

      {/* Desktop Status Badge */}
      <Td variant="meta" desktopOnly>
        {isPublished ? (
          <Badge tone="success" className="text-caption gap-1.5">
            <CheckIcon className="w-3 h-3 shrink-0 text-emerald-600" />
            <Text variant="inherit">{APP_MESSAGES.PUBLISHED}</Text>
          </Badge>
        ) : (
          <Badge tone="warning" className="text-caption gap-1.5">
            {APP_MESSAGES.UNPUBLISHED_DRAFT}
          </Badge>
        )}
      </Td>

      {/* Desktop Published Version */}
      <Td variant="meta" desktopOnly>
        {isPublished ? (
          <Badge tone="mono" className="rounded-md px-2">
            v{form.latestPublishedVersionNumber}
          </Badge>
        ) : (
          <Text variant="caption" tone="subtle">
            —
          </Text>
        )}
      </Td>

      {/* Desktop Draft Revision */}
      <Td variant="meta" desktopOnly>
        <Badge tone="mono" className="rounded-md px-2">
          {APP_MESSAGES.REV} {form.draftRevision ?? 0}
        </Badge>
      </Td>

      {/* Desktop Updated At */}
      <Td variant="meta" desktopOnly>
        <Text variant="caption" tone="muted">
          {formatShortDateTime(form.updatedAt)}
        </Text>
      </Td>

      {/* Actions: Inline on Desktop, Dropdown Menu on Mobile */}
      <Td variant="actions">
        {/* Desktop Inline Actions */}
        <div className="hidden lg:inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
          {isPublished && (
            <>
              <Button
                type="button"
                onClick={handleCopyLink}
                title={APP_MESSAGES.COPY_DEPLOYED_LINK}
                variant="secondary"
                tone="success"
                size="xs"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-3 h-3 shrink-0 text-emerald-600" />
                    <Text variant="inherit">{APP_MESSAGES.COPIED}</Text>
                  </>
                ) : (
                  <>
                    <ShareIcon className="w-3 h-3 shrink-0 text-emerald-600" />
                    <Text variant="inherit">{APP_MESSAGES.COPY_LINK}</Text>
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
            aria-label={APP_MESSAGES.RENAME_FORM}
            title={APP_MESSAGES.RENAME_FORM}
            variant="ghost"
            tone="neutral"
            size="icon"
          >
            <EditIcon className="w-3.5 h-3.5" />
          </Button>

          <Button
            disabled={isMutating}
            onClick={() => handleDeleteForm(form.id, form.name)}
            loading={isDeletingThisForm}
            aria-label={
              isDeletingThisForm
                ? APP_MESSAGES.DELETING
                : APP_MESSAGES.ARCHIVE_OR_DELETE_FORM
            }
            title={APP_MESSAGES.ARCHIVE_OR_DELETE_FORM}
            variant="ghost"
            tone="danger"
            size="icon"
          >
            <DeleteIcon className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Mobile Actions Dropdown */}
        <div
          className="lg:hidden relative inline-block text-left"
          ref={menuRef}
        >
          <Button
            type="button"
            disabled={isMutating}
            aria-haspopup="menu"
            aria-expanded={isActionsOpen}
            onClick={() => setIsActionsOpen((prev) => !prev)}
            variant="secondary"
            size="sm"
          >
            <Text variant="inherit">{APP_MESSAGES.ACTIONS}</Text>
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
                <Text variant="inherit">{APP_MESSAGES.OPEN_EDITOR}</Text>
              </Link>

              <Link
                role="menuitem"
                href={ROUTES.formResponses(form.id)}
                onClick={() => setIsActionsOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ViewIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                <Text variant="inherit">{APP_MESSAGES.RESPONSES}</Text>
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
                    variant="menu"
                    tone="success"
                    size="sm"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <Text variant="inherit">{APP_MESSAGES.COPIED}</Text>
                      </>
                    ) : (
                      <>
                        <ShareIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <Text variant="inherit">{APP_MESSAGES.COPY_LINK}</Text>
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
                    <Text variant="inherit">{APP_MESSAGES.OPEN_LIVE_FORM}</Text>
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
                variant="menu"
                tone="neutral"
                size="sm"
              >
                <EditIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                <Text variant="inherit">{APP_MESSAGES.RENAME_FORM}</Text>
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
                variant="menu"
                tone="danger"
                size="sm"
              >
                <DeleteIcon className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <Text variant="inherit">
                  {isDeletingThisForm
                    ? APP_MESSAGES.DELETING
                    : APP_MESSAGES.ARCHIVE_OR_DELETE_FORM}
                </Text>
              </Button>
            </div>
          )}
        </div>
      </Td>
    </Tr>
  );
}
