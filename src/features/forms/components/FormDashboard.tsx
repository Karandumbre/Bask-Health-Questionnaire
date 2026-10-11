"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusIcon,
  SearchIcon,
  NoteIcon,
  CheckIcon,
  EditIcon,
} from "@/components/ui/icons";
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
    formsList,
    filteredForms,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isCreateModalOpen,
    openCreateDialog,
    isMutating,
    pendingAction,
    successMessage,
    errorMessage,
    handleLogout,
  } = model;

  const totalForms = formsList.length;
  const publishedCount = formsList.filter((f) =>
    Boolean(f.latestPublishedVersionNumber),
  ).length;
  const draftCount = formsList.filter(
    (f) => !f.latestPublishedVersionNumber,
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {APP_MESSAGES.BH}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-tight truncate">
              {APP_MESSAGES.BASK_HEALTH_INTAKE_STUDIO}
            </h1>
            <p className="text-caption text-gray-500 truncate">
              {workspaceName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="text-xs text-gray-600 hidden sm:inline truncate max-w-xs">
            {userEmail}
          </span>
          <Button
            loading={pendingAction?.type === "logout"}
            loadingLabel={APP_MESSAGES.SIGNING_OUT}
            onClick={handleLogout}
            disabled={isMutating}
            className="text-xs text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            {APP_MESSAGES.SIGN_OUT}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {APP_MESSAGES.CLINICAL_INTAKE_FORMS}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {
                APP_MESSAGES.AUTHOR_PUBLISH_AND_REVIEW_VERSIONED_PATIENT_QUESTIONNAIRES
              }
            </p>
          </div>

          <Button
            onClick={openCreateDialog}
            disabled={isMutating}
            variant="primary"
            className="gap-2 whitespace-nowrap self-start sm:self-auto"
          >
            <PlusIcon className="w-4 h-4 shrink-0" />
            <span>{APP_MESSAGES.CREATE_NEW_FORM}</span>
          </Button>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-caption font-semibold uppercase tracking-wider text-gray-500 block">
                {APP_MESSAGES.TOTAL_INTAKE_FORMS}
              </span>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                {totalForms}
              </div>
              <p className="text-caption text-gray-500">
                {APP_MESSAGES.REGISTERED_CLINICAL_QUESTIONNAIRES}
              </p>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <NoteIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-caption font-semibold uppercase tracking-wider text-gray-500">
                  {APP_MESSAGES.PUBLISHED_AND_LIVE}
                </span>
                <span className="text-micro font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {APP_MESSAGES.DEPLOYED}
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-700 tracking-tight">
                {publishedCount}
              </div>
              <p className="text-caption text-gray-500">
                {APP_MESSAGES.LIVE_PATIENT_INTAKE_VERSIONS}
              </p>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-caption font-semibold uppercase tracking-wider text-gray-500 block">
                {APP_MESSAGES.WORKING_DRAFTS}
              </span>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                {draftCount}
              </div>
              <p className="text-caption text-gray-500">
                {APP_MESSAGES.UNPUBLISHED_FORMS_IN_PROGRESS}
              </p>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <EditIcon className="w-5 h-5" />
            </div>
          </div>
        </div>

        {errorMessage && !isCreateModalOpen && <Alert>{errorMessage}</Alert>}

        {successMessage && <Alert tone="success">{successMessage}</Alert>}

        {/* Toolbar: Segmented Filter Buttons + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
            <Button
              onClick={() => setStatusFilter("all")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                statusFilter === "all"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span>{APP_MESSAGES.ALL_FORMS_COUNT(totalForms)}</span>
            </Button>
            <Button
              onClick={() => setStatusFilter("published")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                statusFilter === "published"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span>{APP_MESSAGES.PUBLISHED_COUNT(publishedCount)}</span>
            </Button>
            <Button
              onClick={() => setStatusFilter("draft")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                statusFilter === "draft"
                  ? "bg-white text-gray-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span>{APP_MESSAGES.DRAFTS_COUNT(draftCount)}</span>
            </Button>
          </div>

          <div className="relative w-full sm:w-72">
            <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              aria-label={APP_MESSAGES.SEARCH_FORMS}
              placeholder={APP_MESSAGES.SEARCH_FORMS_BY_TITLE}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-xl text-xs w-full bg-white"
            />
          </div>
        </div>

        {/* Forms Table */}
        {filteredForms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <PlusIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              {APP_MESSAGES.NO_CLINICAL_FORMS_FOUND}
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              {
                APP_MESSAGES.GET_STARTED_BY_CREATING_YOUR_FIRST_PATIENT_INTAKE_QUESTIONNAIRE
              }
            </p>
            <Button
              onClick={openCreateDialog}
              disabled={isMutating}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {APP_MESSAGES.CREATE_FORM_NOW}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-caption font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 pl-4 sm:pl-5 pr-3 whitespace-nowrap rounded-tl-2xl">
                    {APP_MESSAGES.FORM_TITLE}
                  </th>
                  <th className="hidden md:table-cell py-3.5 px-4 whitespace-nowrap">
                    {APP_MESSAGES.STATUS}
                  </th>
                  <th className="hidden md:table-cell py-3.5 px-4 whitespace-nowrap">
                    {APP_MESSAGES.WORKING_DRAFT}
                  </th>
                  <th className="hidden md:table-cell py-3.5 px-4 whitespace-nowrap">
                    {APP_MESSAGES.LAST_UPDATED}
                  </th>
                  <th className="py-3.5 pl-3 pr-4 sm:pr-5 text-right whitespace-nowrap rounded-tr-2xl">
                    {APP_MESSAGES.ACTIONS}
                  </th>
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
