"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { AlertTriangleIcon } from "@/components/ui/icons";
import type { useFormDashboard } from "../hooks/use-form-dashboard";

export function CreateFormDialog({
  model,
}: {
  model: ReturnType<typeof useFormDashboard>;
}) {
  const {
    isCreateModalOpen,
    isCreating,
    setIsCreateModalOpen,
    newFormName,
    setNewFormName,
    handleCreateForm,
    errorMessage,
  } = model;
  return (
    <>
      {/* Create New Form Modal */}
      {isCreateModalOpen && (
        <Dialog
          open
          titleId="create-form-title"
          onClose={isCreating ? undefined : () => setIsCreateModalOpen(false)}
          className="max-w-md space-y-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3
                id="create-form-title"
                className="text-base font-bold text-gray-900"
              >
                {APP_MESSAGES.CREATE_CLINICAL_FORM}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {
                  APP_MESSAGES.INITIALIZES_A_NEW_DRAFT_CONTAINER_READY_FOR_QUESTION_AUTHORING
                }
              </p>
            </div>
            <Button
              disabled={isCreating}
              onClick={() => setIsCreateModalOpen(false)}
              aria-label={APP_MESSAGES.CLOSE_CREATE_FORM_DIALOG}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>

          <form onSubmit={handleCreateForm} className="space-y-4">
            <div>
              <label
                htmlFor="new-form-name"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                {APP_MESSAGES.FORM_TITLE}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                id="new-form-name"
                placeholder={APP_MESSAGES.E_G_ADULT_ADHD_INITIAL_SCREENING}
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}

                autoFocus
              />
            </div>

            {errorMessage && (
              <Alert className="flex items-center gap-1.5">
                <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                disabled={isCreating}
                onClick={() => setIsCreateModalOpen(false)}
                variant="secondary"
                className="py-2"
              >
                {APP_MESSAGES.CANCEL}
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !newFormName.trim()}
                variant="primary"
                className="py-2"
              >
                {isCreating ? "Creating..." : APP_MESSAGES.CREATE_OPEN}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
