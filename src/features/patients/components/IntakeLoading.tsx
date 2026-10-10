import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";
import { APP_MESSAGES } from "@/lib/constants/messages";

export function IntakeLoading() {
  return (
    <SkeletonRegion
      className="min-h-screen bg-gray-50 py-6 sm:py-8"
      label={APP_MESSAGES.LOADING_INTAKE}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4"
          >
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </SkeletonRegion>
  );
}
