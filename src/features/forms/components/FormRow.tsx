"use client";
import { ROUTES } from "@/lib/constants/application";

import { APP_MESSAGES } from "@/lib/constants/messages";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckIcon, EditIcon, DeleteIcon } from "@/components/ui/icons";
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
  return (
    <tr key={form.id} className="hover:bg-gray-50/70 transition-colors group">
      {/* Title */}
      <td className="py-3.5 px-4 font-medium text-gray-900">
        {renamingFormId === form.id ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="text"
              disabled={isMutating}
              aria-label={APP_MESSAGES.FORM_TITLE}
              value={renamingName}
              onChange={(e) => setRenamingName(e.target.value)}
              className="border border-blue-500 rounded px-2 py-0.5 text-xs outline-none"
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
              className="text-blue-600 font-bold hover:underline"
            >
              {APP_MESSAGES.SAVE}
            </Button>
            <Button
              disabled={isMutating}
              onClick={() => setRenamingFormId(null)}
              className="text-gray-400 hover:underline"
            >
              {APP_MESSAGES.CANCEL}
            </Button>
          </div>
        ) : (
          <Link
            href={ROUTES.editForm(form.id)}
            className="hover:text-blue-600 font-semibold text-gray-900 transition-colors"
          >
            {form.name}
          </Link>
        )}
      </td>

      {/* Status Badge */}
      <td className="py-3.5 px-4">
        {form.latestPublishedVersionNumber ? (
          <span className="inline-flex items-center gap-1 text-caption font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
            <CheckIcon className="w-3 h-3 text-emerald-600" />
            {APP_MESSAGES.PUBLISHED_V}
            {form.latestPublishedVersionNumber}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-caption font-medium text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full">
            {APP_MESSAGES.UNPUBLISHED_DRAFT}
          </span>
        )}
      </td>

      {/* Draft Revision */}
      <td className="py-3.5 px-4 font-mono text-caption text-gray-500">
        {APP_MESSAGES.REV} {form.draftRevision ?? 0}
      </td>

      {/* Updated At */}
      <td className="py-3.5 px-4 text-gray-500 text-caption">
        {new Date(form.updatedAt).toLocaleDateString()} {APP_MESSAGES.AT}{" "}
        {new Date(form.updatedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={ROUTES.formResponses(form.id)}
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md transition-colors"
          >
            Responses
          </Link>

          <Link
            href={ROUTES.editForm(form.id)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 px-2.5 py-1 rounded-md transition-colors"
          >
            {APP_MESSAGES.OPEN_EDITOR}
          </Link>

          <Button
            disabled={isMutating}
            onClick={() => handleStartRename(form)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
            aria-label={APP_MESSAGES.RENAME_FORM}
            title={APP_MESSAGES.RENAME_FORM}
          >
            <EditIcon className="w-3.5 h-3.5" />
          </Button>

          <Button
            disabled={isMutating}
            onClick={() => handleDeleteForm(form.id, form.name)}
            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
            loading={
              pendingAction?.type === "delete" &&
              pendingAction.formId === form.id
            }
            aria-label={
              pendingAction?.type === "delete" &&
              pendingAction.formId === form.id
                ? APP_MESSAGES.DELETING
                : APP_MESSAGES.ARCHIVE_OR_DELETE_FORM
            }
            title={APP_MESSAGES.ARCHIVE_OR_DELETE_FORM}
          >
            <DeleteIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
