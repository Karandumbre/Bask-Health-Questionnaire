"use client";

import {
  readFormsCache,
  fetchAndCacheForms,
  clearFormsCache,
} from "../client/forms-cache";
import { ROUTES } from "@/lib/constants/application";

import { APP_MESSAGES } from "@/lib/constants/messages";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiErrorMessage } from "@/lib/http/api-client";
import { logout } from "@/features/auth/client/auth-api";
import {
  createForm,
  deleteForm,
  renameForm,
  listForms,
} from "../client/forms-api";
import type { FormListItem } from "../domain/dashboard-types";

export function useFormDashboard(userId: string, workspaceId: string) {
  const cacheKey = `${userId}:${workspaceId}`;
  const refreshController = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const busy = useRef(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "create" | "rename" | "delete" | "logout";
    formId?: string;
  } | null>(null);
  const isMutating = pendingAction !== null || isRefreshing || isLoading;
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formsList, setFormsList] = useState<FormListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const controller = new AbortController();
    refreshController.current = controller;
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const forms = await fetchAndCacheForms(
        cacheKey,
        () => listForms(workspaceId, controller.signal),
        controller.signal,
      );
      if (forms) setFormsList(forms);
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          clearFormsCache();
          setFormsList([]);
        }
        setErrorMessage(
          apiErrorMessage(error, APP_MESSAGES.NETWORK_ERROR_LOADING_FORMS),
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
        busy.current = false;
      }
    }
  }, [cacheKey, workspaceId]);

  useEffect(() => {
    let disposed = false;
    async function load() {
      const cached = await Promise.resolve(readFormsCache(cacheKey));
      if (disposed) return;
      if (cached) {
        setFormsList(cached.forms);
        setIsLoading(false);
      }
      if (!cached?.fresh) void handleRefresh();
    }
    void load();
    return () => {
      disposed = true;
      refreshController.current?.abort();
      busy.current = false;
    };
  }, [cacheKey, handleRefresh]);

  // Rename state
  const [renamingFormId, setRenamingFormId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");

  const filteredForms = formsList.filter((f) => {
    const matchesSearch = f.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (!matchesSearch) {
      return false;
    }

    if (statusFilter === "published") {
      return Boolean(f.latestPublishedVersionNumber);
    }

    if (statusFilter === "draft") {
      return !f.latestPublishedVersionNumber;
    }

    return true;
  });

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
    isLoading,
    isRefreshing,
    handleRefresh,
    formsList,
    filteredForms,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
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
