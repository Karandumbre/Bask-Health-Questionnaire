"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Dialog, DialogHeader, DialogActions } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
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
          <DialogHeader
            titleId="create-form-title"
            title={APP_MESSAGES.CREATE_CLINICAL_FORM}
            description={
              APP_MESSAGES.INITIALIZES_A_NEW_DRAFT_CONTAINER_READY_FOR_QUESTION_AUTHORING
            }
            onClose={() => setIsCreateModalOpen(false)}
            closeLabel={APP_MESSAGES.CLOSE_CREATE_FORM_DIALOG}
            disabled={isCreating}
          />

          <form onSubmit={handleCreateForm} className="space-y-4">
            <FormField
              id="new-form-name"
              label={APP_MESSAGES.FORM_TITLE}
              required
            >
              <Input
                type="text"
                required
                id="new-form-name"
                disabled={isCreating}
                placeholder={APP_MESSAGES.E_G_ADULT_ADHD_INITIAL_SCREENING}
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                autoFocus
              />
            </FormField>

            {errorMessage && (
              <Alert className="flex items-center gap-1.5">
                <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </Alert>
            )}

            <DialogActions>
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
                loading={isCreating}
                loadingLabel={APP_MESSAGES.CREATING}
                disabled={!newFormName.trim() || isCreating}
                variant="primary"
                className="py-2"
              >
                {APP_MESSAGES.CREATE_OPEN}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </>
  );
}
