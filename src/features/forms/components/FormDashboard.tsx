"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, Thead, Tbody, Tr, Th } from "@/components/ui/table";
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

import { DashboardHeader } from "./DashboardHeader";
import { ResponseListSkeleton } from "./FormLoading";
export type { FormListItem } from "../domain/dashboard-types";

export function FormDashboard({
  userId,
  workspaceId,
  workspaceName,
  userEmail,
}: {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  userEmail: string | null;
}) {
  const model = useFormDashboard(userId, workspaceId);
  const {
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
      <DashboardHeader
        workspaceName={workspaceName}
        userEmail={userEmail}
        handleLogout={handleLogout}
        isMutating={isMutating}
        isLoggingOut={pendingAction?.type === "logout"}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
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

          <div className="flex items-center gap-2">
            <Button
              onClick={() => void handleRefresh()}
              disabled={isMutating}
              loading={isRefreshing}
              loadingLabel={APP_MESSAGES.REFRESHING_FORMS}
              variant="secondary"
            >
              {APP_MESSAGES.REFRESH}
            </Button>
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
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-caption font-semibold uppercase tracking-wider text-gray-500 block">
                {APP_MESSAGES.TOTAL_INTAKE_FORMS}
              </span>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                {isLoading ? APP_MESSAGES.LOADING : totalForms}
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
                <Badge
                  tone="success"
                  className="bg-emerald-100 text-emerald-800 border-0 px-1.5"
                >
                  {APP_MESSAGES.DEPLOYED}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-emerald-700 tracking-tight">
                {isLoading ? APP_MESSAGES.LOADING : publishedCount}
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
                {isLoading ? APP_MESSAGES.LOADING : draftCount}
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
        {isLoading ? (
          <ResponseListSkeleton />
        ) : filteredForms.length === 0 ? (
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
            <Table>
              <Thead>
                <Tr className="hover:bg-transparent">
                  <Th className="pl-4 sm:pl-5 pr-3 rounded-tl-2xl w-full max-w-0">
                    {APP_MESSAGES.FORM_TITLE}
                  </Th>
                  <Th className="hidden md:table-cell w-px">
                    {APP_MESSAGES.STATUS}
                  </Th>
                  <Th className="hidden md:table-cell w-px">
                    {APP_MESSAGES.WORKING_DRAFT}
                  </Th>
                  <Th className="hidden md:table-cell w-px">
                    {APP_MESSAGES.LAST_UPDATED}
                  </Th>
                  <Th className="pl-3 pr-4 sm:pr-5 text-right rounded-tr-2xl w-px">
                    {APP_MESSAGES.ACTIONS}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredForms.map((form) => (
                  <FormRow key={form.id} form={form} model={model} />
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </main>

      <CreateFormDialog model={model} />
    </div>
  );
}
