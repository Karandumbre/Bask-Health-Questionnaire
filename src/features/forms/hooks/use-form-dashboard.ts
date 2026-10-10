"use client";
import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/http/api-client";
import { logout } from "@/features/auth/client/auth-api";
import { createForm, deleteForm, renameForm } from "../client/forms-api";
import type { FormListItem } from "../domain/dashboard-types";

export function useFormDashboard(initialForms: FormListItem[]) {
  const router = useRouter();
  const busy = useRef(false);
  const [isMutating, setIsMutating] = useState(false);
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
    setIsMutating(true);

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const data = await createForm(newFormName.trim());

      router.push(`/admin/forms/${data.form.id}/edit`);
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Network error creating form."));
    } finally {
      setIsCreating(false);
      busy.current = false;
      setIsMutating(false);
    }
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(`Are you sure you want to delete or archive '${formName}'?`)) {
      return;
    }

    if (busy.current) return;
    busy.current = true;
    setIsMutating(true);
    try {
      await deleteForm(formId);
      setFormsList((prev) => prev.filter((f) => f.id !== formId));
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Network error deleting form."));
    } finally {
      busy.current = false;
      setIsMutating(false);
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
    setIsMutating(true);
    try {
      const form = formsList.find((item) => item.id === formId);
      if (!form) return;
      await renameForm(formId, renamingName.trim(), form.draftRevision ?? 0);
      setFormsList((prev) =>
        prev.map((f) =>
          f.id === formId
            ? {
                ...f,
                name: renamingName.trim(),
                draftRevision: (f.draftRevision ?? 0) + 1,
                updatedAt: new Date(),
              }
            : f,
        ),
      );
      setRenamingFormId(null);
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Network error renaming form."));
    } finally {
      busy.current = false;
      setIsMutating(false);
    }
  };

  const handleLogout = async () => {
    if (busy.current) return;
    busy.current = true; setIsMutating(true);
    try {
      await logout();
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Network error signing out."));
    } finally { busy.current = false; setIsMutating(false); }
  };

  const openCreateDialog = () => { setNewFormName(""); setErrorMessage(null); setIsCreateModalOpen(true); };

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
  };
}
