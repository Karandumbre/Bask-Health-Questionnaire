import { DashboardHeader } from "./DashboardHeader";
import { AdminBackLink } from "./AdminBackLink";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";
import { APP_MESSAGES } from "@/lib/constants/messages";

function HeaderSkeleton() {
  return (
    <div className="h-16 border-b border-gray-200 bg-white px-4 sm:px-6 flex items-center justify-between gap-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

function QuestionSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

export function FormsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <div className="flex gap-2">
            <Button disabled variant="secondary">
              {APP_MESSAGES.REFRESH}
            </Button>
            <Button disabled variant="primary">
              {APP_MESSAGES.CREATE_NEW_FORM}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            APP_MESSAGES.TOTAL_INTAKE_FORMS,
            APP_MESSAGES.PUBLISHED_AND_LIVE,
            APP_MESSAGES.WORKING_DRAFTS,
          ].map((label) => (
            <div
              key={label}
              className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3"
            >
              <span className="text-caption font-semibold uppercase tracking-wider text-gray-500">
                {label}
              </span>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <SkeletonRegion label={APP_MESSAGES.LOADING_FORMS}>
          <ResponseListSkeleton />
        </SkeletonRegion>
      </main>
    </div>
  );
}

export function EditorLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="min-h-14 border-b border-gray-200 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AdminBackLink />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg border border-gray-200 p-0.5">
          {[
            APP_MESSAGES.EDITOR,
            APP_MESSAGES.PATIENT_PREVIEW,
            APP_MESSAGES.RESPONSES,
          ].map((label) => (
            <Button key={label} disabled className="text-xs px-3 py-1.5">
              {label}
            </Button>
          ))}
        </div>
        <Button disabled variant="primary">
          {APP_MESSAGES.PUBLISH}
        </Button>
      </header>
      <div className="flex">
        <div className="hidden lg:block w-80 shrink-0 border-r border-gray-200 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold uppercase text-gray-500">
              {APP_MESSAGES.FORM_QUESTIONS}
            </h2>
            <Button disabled variant="primary">
              {APP_MESSAGES.ADD_FIELD}
            </Button>
          </div>
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-6 space-y-4">
          <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <span className="text-xs text-gray-600">{APP_MESSAGES.THEME}</span>
            <Skeleton className="h-8 w-28" />
          </div>
          <SkeletonRegion className="max-w-2xl mx-auto space-y-4">
            <QuestionSkeleton />
            <QuestionSkeleton />
            <QuestionSkeleton />
          </SkeletonRegion>
        </div>
        <div className="hidden xl:block w-88 shrink-0 border-l border-gray-200 bg-white p-4 space-y-6">
          <h2 className="text-xs font-semibold text-gray-900">
            {APP_MESSAGES.QUESTION_SETTINGS}
          </h2>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ResponsesLoading() {
  return (
    <SkeletonRegion
      className="min-h-screen bg-gray-50"
      label={APP_MESSAGES.LOADING_RESPONSES}
    >
      <HeaderSkeleton />
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-40" />
        </div>
        <ResponseListSkeleton />
      </div>
    </SkeletonRegion>
  );
}

export function ResponseListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="bg-gray-50 p-5">
        <Skeleton className="h-4 w-2/3" />
      </div>
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex gap-4 border-t border-gray-100 p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ResponseDetailLoading() {
  return (
    <SkeletonRegion
      className="space-y-4 py-6"
      label={APP_MESSAGES.LOADING_RESPONSE_DETAIL}
    >
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <QuestionSkeleton />
        <QuestionSkeleton />
      </div>
    </SkeletonRegion>
  );
}
