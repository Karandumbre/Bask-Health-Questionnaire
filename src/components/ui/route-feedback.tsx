"use client";

import { Text } from "@/components/ui/text";
import { useTransition } from "react";
import Link from "next/link";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { ROUTES } from "@/lib/constants/application";
import { Alert } from "./alert";
import { Button } from "./button";
import { Skeleton, SkeletonRegion } from "./skeleton";

export function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="max-w-md w-full space-y-4 rounded-xl bg-white border border-gray-200 p-6">
        <Text as="h1" variant="heading" tone="primary" weight="semibold">
          {APP_MESSAGES.ROUTE_ERROR_TITLE}
        </Text>
        <Alert>{APP_MESSAGES.ROUTE_ERROR_MESSAGE}</Alert>
        <Button
          loading={pending}
          loadingLabel={APP_MESSAGES.RETRYING}
          onClick={() => startTransition(reset)}
          variant="primary"
          size="sm"
        >
          {APP_MESSAGES.RETRY}
        </Button>
        <Link href={ROUTES.home} className="block text-sm text-blue-600">
          {APP_MESSAGES.BACK_HOME}
        </Link>
      </div>
    </main>
  );
}

export function RouteLoading() {
  return (
    <SkeletonRegion className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-1/2" />
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
          >
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
