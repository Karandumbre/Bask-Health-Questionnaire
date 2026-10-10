"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { CreateFormDialog } from "./CreateFormDialog";
import { FormRow } from "./FormRow";
import { useFormDashboard } from "../hooks/use-form-dashboard";

import type { FormListItem } from "../domain/dashboard-types";
export type { FormListItem } from "../domain/dashboard-types";

export function FormDashboard({
  initialForms,
  workspaceName,
  userEmail,
}: {
  initialForms: FormListItem[];
  workspaceName: string;
  userEmail: string | null;
}) {
  const model = useFormDashboard(initialForms);
  const {
    filteredForms,
    searchQuery,
    setSearchQuery,
    isCreateModalOpen,
    openCreateDialog,
    isMutating,
    errorMessage,
    handleLogout,
  } = model;

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
          <span className="text-xs text-gray-600 hidden sm:inline">
            {userEmail}
          </span>
          <Button
            onClick={handleLogout}
            disabled={isMutating}
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
            <h2 className="text-xl font-bold text-gray-900">
              Clinical Intake Forms
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Author, publish, and review versioned patient questionnaires.
            </p>
          </div>

          <Button
            onClick={openCreateDialog}
            disabled={isMutating}
            variant="primary"
            className="gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create New Form</span>
          </Button>
        </div>

        {errorMessage && !isCreateModalOpen && (
          <p role="alert" className="text-xs text-red-600">
            {errorMessage}
          </p>
        )}

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
            <h3 className="text-sm font-bold text-gray-900">
              No clinical forms found
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Get started by creating your first patient intake questionnaire.
            </p>
            <Button
              onClick={openCreateDialog}
              disabled={isMutating}
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
                  <FormRow key={form.id} form={form} model={model} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <CreateFormDialog model={model} />
    </div>
  );
}
