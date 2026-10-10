"use client";
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
      <FormField id="email" label={APP_MESSAGES.REVIEWER_EMAIL}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isLoading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="reviewer@baskhealth.com"
        />
      </FormField>

      <FormField id="password" label={APP_MESSAGES.PASSWORD}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
          <span>{errorMessage}</span>
        </Alert>
      )}

      <div>
        <Button
          type="submit"
          loading={isLoading}
          loadingLabel={APP_MESSAGES.SIGNING_IN}
          variant="primary"
          className="w-full"
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md mx-auto mb-4">
          {APP_MESSAGES.BH}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          {APP_MESSAGES.INTAKE_STUDIO_REVIEWER_PORTAL}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {APP_MESSAGES.SECURE_CLINICAL_ADMINISTRATION_AND_FORM_AUTHORING}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-gray-200 sm:rounded-2xl sm:px-10 space-y-6">
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
            <p className="text-caption text-gray-400">
              {
                APP_MESSAGES.AUTHORIZED_CLINICAL_PERSONNEL_REVIEWERS_ONLY_ALL_OPERATIONS_AUDITED
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
