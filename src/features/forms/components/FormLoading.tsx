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
    <SkeletonRegion className="min-h-screen bg-gray-50">
      <HeaderSkeleton />
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="w-2/3 space-y-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <ResponseListSkeleton />
      </div>
    </SkeletonRegion>
  );
}

export function EditorLoading() {
  return (
    <SkeletonRegion className="min-h-screen bg-gray-50">
      <HeaderSkeleton />
      <div className="flex">
        <div className="hidden lg:block w-80 shrink-0 border-r border-gray-200 p-4 space-y-4">
          <Skeleton className="h-5 w-36" />
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-6 space-y-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <div className="max-w-2xl mx-auto space-y-4">
            <QuestionSkeleton />
            <QuestionSkeleton />
            <QuestionSkeleton />
          </div>
        </div>
        <div className="hidden xl:block w-88 shrink-0 border-l border-gray-200 bg-white p-4 space-y-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </SkeletonRegion>
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
