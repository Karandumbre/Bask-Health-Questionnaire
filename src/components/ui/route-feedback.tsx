"use client";

import { useTransition } from "react";
import Link from "next/link";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { ROUTES } from "@/lib/constants/application";
import { Alert } from "./alert";
import { Button } from "./button";
import { Spinner } from "./spinner";

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
        <h1 className="text-lg font-semibold">
          {APP_MESSAGES.ROUTE_ERROR_TITLE}
        </h1>
        <Alert>{APP_MESSAGES.ROUTE_ERROR_MESSAGE}</Alert>
        <Button
          variant="primary"
          loading={pending}
          loadingLabel={APP_MESSAGES.RETRYING}
          onClick={() => startTransition(reset)}
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
    <div
      role="status"
      className="min-h-screen bg-gray-50 flex items-center justify-center gap-3 text-sm"
    >
      <Spinner />
      {APP_MESSAGES.LOADING}
    </div>
  );
}
