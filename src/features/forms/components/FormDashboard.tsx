"use client";

import { Dialog } from "@/components/ui/dialog";
import { apiErrorMessage, apiRequest, successSchema } from "@/lib/http/api-client";
import { createForm, deleteForm, renameForm } from "../client/forms-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  DeleteIcon,
  CheckIcon,
  AlertTriangleIcon,
} from "@/components/ui/icons";

export interface FormListItem {
  id: string;
  name: string;
  workspaceId: string;
  latestPublishedVersionNumber: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  draftRevision: number | null;
  draftUpdatedAt: string | Date | null;
}

export function FormDashboard({
  initialForms,
  workspaceName,
  userEmail,
}: {
  initialForms: FormListItem[];
  workspaceName: string;
  userEmail: string | null;
}) {
  const router = useRouter();
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
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFormName.trim()) return;

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const data = await createForm(newFormName.trim());

      router.push(`/admin/forms/${data.form.id}/edit`);
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Network error creating form."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(`Are you sure you want to delete or archive '${formName}'?`)) {
      return;
    }

    try {
      await deleteForm(formId);
      setFormsList((prev) => prev.filter((f) => f.id !== formId));
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Network error deleting form."));
    }
  };

  const handleStartRename = (form: FormListItem) => {
    setRenamingFormId(form.id);
    setRenamingName(form.name);
  };

  const handleSaveRename = async (formId: string) => {
    if (!renamingName.trim()) return;

    try {
      await renameForm(formId, renamingName.trim());
      setFormsList((prev) => prev.map((f) => f.id === formId ? { ...f, name: renamingName.trim() } : f));
      setRenamingFormId(null);
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Network error renaming form."));
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", successSchema, { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Network error signing out."));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            BH
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">
              Bask Health — Intake Studio
            </h1>
            <p className="text-[11px] text-gray-500">{workspaceName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-600 hidden sm:inline">{userEmail}</span>
          <Button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-900 font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Clinical Intake Forms</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Author, publish, and review versioned patient questionnaires.
            </p>
          </div>

          <Button
            onClick={() => {
              setNewFormName("");
              setIsCreateModalOpen(true);
            }}
            variant="primary" className="gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create New Form</span>
          </Button>
        </div>

        {errorMessage && !isCreateModalOpen && <p role="alert" className="text-xs text-red-600">{errorMessage}</p>}

        {/* Search & Filter */}
        <div className="relative max-w-md">
          <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            aria-label="Search forms"
            placeholder="Search forms by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Forms Table / Grid */}
        {filteredForms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <PlusIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No clinical forms found</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Get started by creating your first patient intake questionnaire.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              + Create Form Now
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Form Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Working Draft</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredForms.map((form) => (
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
                          onClick={() => handleStartRename(form)}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                          title="Rename form"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          onClick={() => handleDeleteForm(form.id, form.name)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="Archive or delete form"
                        >
                          <DeleteIcon className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create New Form Modal */}
      {isCreateModalOpen && (
        <Dialog open titleId="create-form-title" onClose={isCreating ? undefined : () => setIsCreateModalOpen(false)} className="max-w-md space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="create-form-title" className="text-base font-bold text-gray-900">Create Clinical Form</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Initializes a new draft container ready for question authoring.
                </p>
              </div>
              <Button
                disabled={isCreating}
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateForm} className="space-y-4">
              <div>
                <label htmlFor="new-form-name" className="block text-xs font-semibold text-gray-700 mb-1">
                  Form Title <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  id="new-form-name"
                  placeholder="e.g. Adult ADHD Initial Screening"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}

                  autoFocus
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  disabled={isCreating}
                onClick={() => setIsCreateModalOpen(false)}
                  variant="secondary" className="py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !newFormName.trim()}
                  variant="primary" className="py-2"
                >
                  {isCreating ? "Creating..." : "Create & Open"}
                </Button>
              </div>
            </form>
        </Dialog>
      )}
    </div>
  );
}
