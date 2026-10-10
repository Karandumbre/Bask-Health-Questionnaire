"use client";
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
  } = model;
  return (
    <tr key={form.id} className="hover:bg-gray-50/70 transition-colors group">
      {/* Title */}
      <td className="py-3.5 px-4 font-medium text-gray-900">
        {renamingFormId === form.id ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="text"
              value={renamingName}
              onChange={(e) => setRenamingName(e.target.value)}
              className="border border-blue-500 rounded px-2 py-0.5 text-xs outline-none"
              autoFocus
            />
            <Button
              disabled={isMutating}
              onClick={() => handleSaveRename(form.id)}
              className="text-blue-600 font-bold hover:underline"
            >
              Save
            </Button>
            <Button
              onClick={() => setRenamingFormId(null)}
              className="text-gray-400 hover:underline"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Link
            href={`/admin/forms/${form.id}/edit`}
            className="hover:text-blue-600 font-semibold text-gray-900 transition-colors"
          >
            {form.name}
          </Link>
        )}
      </td>

      {/* Status Badge */}
      <td className="py-3.5 px-4">
        {form.latestPublishedVersionNumber ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
            <CheckIcon className="w-3 h-3 text-emerald-600" />
            Published v{form.latestPublishedVersionNumber}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full">
            Unpublished Draft
          </span>
        )}
      </td>

      {/* Draft Revision */}
      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
        rev {form.draftRevision ?? 0}
      </td>

      {/* Updated At */}
      <td className="py-3.5 px-4 text-gray-500 text-[11px]">
        {new Date(form.updatedAt).toLocaleDateString()} at{" "}
        {new Date(form.updatedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/forms/${form.id}/edit`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 px-2.5 py-1 rounded-md transition-colors"
          >
            Open Editor
          </Link>

          <Button
            disabled={isMutating}
            onClick={() => handleStartRename(form)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
            title="Rename form"
          >
            <EditIcon className="w-3.5 h-3.5" />
          </Button>

          <Button
            disabled={isMutating}
            onClick={() => handleDeleteForm(form.id, form.name)}
            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
            title="Archive or delete form"
          >
            <DeleteIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
