"use client";
import { Text } from "@/components/ui/text";
import { ROUTES } from "@/lib/constants/application";

import { APP_MESSAGES } from "@/lib/constants/messages";

import { apiErrorMessage } from "@/lib/http/api-client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

import { login } from "@/features/auth/client/auth-api";
import { useState, useRef, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangleIcon } from "@/components/ui/icons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || ROUTES.adminForms;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const busy = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);

      router.push(nextUrl);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(
          error,
          APP_MESSAGES.NETWORK_ERROR_DURING_AUTHENTICATION_PLEASE_RETRY,
        ),
      );
    } finally {
      busy.current = false;
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormField
        id="email"
        label={APP_MESSAGES.REVIEWER_EMAIL}
        labelClassName="text-sm text-gray-700"
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="min-h-touch-target text-base"
          required
          disabled={isLoading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="reviewer@baskhealth.com"
        />
      </FormField>

      <FormField
        id="password"
        label={APP_MESSAGES.PASSWORD}
        labelClassName="text-sm text-gray-700"
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="min-h-touch-target text-base"
          required
          disabled={isLoading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
        />
      </FormField>

      {errorMessage && (
        <Alert className="flex items-start gap-2">
          <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <Text variant="inherit">{errorMessage}</Text>
        </Alert>
      )}

      <div>
        <Button
          type="submit"
          loading={isLoading}
          loadingLabel={APP_MESSAGES.SIGNING_IN}
          variant="primary"
          size="md"
          fullWidth
        >
          {isLoading
            ? APP_MESSAGES.SIGNING_IN
            : APP_MESSAGES.SIGN_IN_TO_INTAKE_STUDIO}
        </Button>
      </div>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-svh bg-gray-50 flex flex-col justify-start sm:justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm mx-auto mb-4">
          {APP_MESSAGES.BH}
        </div>
        <Text as="h1" variant="title" tone="primary" weight="bold">
          {APP_MESSAGES.INTAKE_STUDIO}
        </Text>
        <div className="mt-1">
          <Text as="p" variant="body" tone="secondary" weight="medium">
            {APP_MESSAGES.REVIEWER_LOGIN_PORTAL}
          </Text>
        </div>
        <div className="mt-2">
          <Text as="p" variant="body" tone="muted">
            {APP_MESSAGES.SECURE_CLINICAL_ADMINISTRATION_AND_FORM_AUTHORING}
          </Text>
        </div>
      </div>

      <div className="mt-6 mx-auto w-full max-w-md">
        <div className="bg-white p-5 sm:p-8 shadow-sm border border-gray-200 rounded-2xl space-y-6">
          <Suspense
            fallback={
              <div className="text-xs text-gray-400 text-center py-4">
                {APP_MESSAGES.LOADING_LOGIN_FORM}
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="pt-2 border-t border-gray-100 text-center">
            <Text as="p" variant="small" tone="muted">
              {
                APP_MESSAGES.AUTHORIZED_CLINICAL_PERSONNEL_REVIEWERS_ONLY_ALL_OPERATIONS_AUDITED
              }
            </Text>
          </div>
        </div>
      </div>
    </main>
  );
}
