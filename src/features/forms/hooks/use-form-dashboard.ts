"use client";
import { ROUTES } from "@/lib/constants/application";

import { APP_MESSAGES } from "@/lib/constants/messages";

import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/http/api-client";
import { logout } from "@/features/auth/client/auth-api";
import { createForm, deleteForm, renameForm } from "../client/forms-api";
import type { FormListItem } from "../domain/dashboard-types";

export function useFormDashboard(initialForms: FormListItem[]) {
  const router = useRouter();
  const busy = useRef(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "create" | "rename" | "delete" | "logout";
    formId?: string;
  } | null>(null);
  const isMutating = pendingAction !== null;
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formsList, setFormsList] = useState<FormListItem[]>(initialForms);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rename state
  const [renamingFormId, setRenamingFormId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  const filteredForms = formsList.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFormName.trim() || busy.current) return;
    busy.current = true;
    setPendingAction({ type: "create" });

    setSuccessMessage(null);
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const data = await createForm(newFormName.trim());

      router.push(ROUTES.editForm(data.form.id));
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, APP_MESSAGES.NETWORK_ERROR_CREATING_FORM),
      );
    } finally {
      setIsCreating(false);
      busy.current = false;
      setPendingAction(null);
    }
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(APP_MESSAGES.ARE_YOU_SURE_YOU_WANT_TO_DELETE_OR(formName))) {
      return;
    }

    if (busy.current) return;
    busy.current = true;
    setPendingAction({ type: "delete", formId });
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteForm(formId);
      setFormsList((prev) => prev.filter((f) => f.id !== formId));
      setSuccessMessage(APP_MESSAGES.FORM_REMOVED);
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, APP_MESSAGES.NETWORK_ERROR_DELETING_FORM),
      );
    } finally {
      busy.current = false;
      setPendingAction(null);
    }
  };

  const handleStartRename = (form: FormListItem) => {
    setRenamingFormId(form.id);
    setRenamingName(form.name);
  };

  const handleSaveRename = async (formId: string) => {
    if (!renamingName.trim()) return;

    if (busy.current) return;
    busy.current = true;
    setPendingAction({ type: "rename", formId });
    setErrorMessage(null);
    setSuccessMessage(null);
    const name = renamingName.trim();
    try {
      const form = formsList.find((item) => item.id === formId);
      if (!form) return;
      await renameForm(formId, name, form.draftRevision ?? 0);
      setFormsList((prev) =>
        prev.map((f) =>
          f.id === formId
            ? {
                ...f,
                name,
                draftRevision: (f.draftRevision ?? 0) + 1,
                updatedAt: new Date(),
              }
            : f,
        ),
      );
      setRenamingFormId(null);
      setSuccessMessage(APP_MESSAGES.FORM_RENAMED);
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, APP_MESSAGES.NETWORK_ERROR_RENAMING_FORM),
      );
    } finally {
      busy.current = false;
      setPendingAction(null);
    }
  };

  const handleLogout = async () => {
    if (busy.current) return;
    busy.current = true;
    setPendingAction({ type: "logout" });
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await logout();
      router.push(ROUTES.adminLogin);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(error, APP_MESSAGES.NETWORK_ERROR_SIGNING_OUT),
      );
    } finally {
      busy.current = false;
      setPendingAction(null);
    }
  };

  const openCreateDialog = () => {
    setNewFormName("");
    setErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  return {
    openCreateDialog,
    filteredForms,
    searchQuery,
    setSearchQuery,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newFormName,
    setNewFormName,
    isCreating,
    errorMessage,
    renamingFormId,
    renamingName,
    setRenamingName,
    setRenamingFormId,
    handleCreateForm,
    handleDeleteForm,
    handleStartRename,
    handleSaveRename,
    handleLogout,
    isMutating,
    pendingAction,
    successMessage,
  };
}
