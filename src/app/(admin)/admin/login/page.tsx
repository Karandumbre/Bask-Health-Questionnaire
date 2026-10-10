"use client";

import {
  apiRequest,
  apiErrorMessage,
  successSchema,
} from "@/lib/http/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useState, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangleIcon } from "@/components/ui/icons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/admin/forms";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await apiRequest("/api/auth/login", successSchema, {
        method: "POST",
        json: { email, password },
      });

      router.push(nextUrl);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        apiErrorMessage(
          error,
          "Network error during authentication. Please retry.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-semibold text-gray-700 mb-1"
        >
          Reviewer Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="reviewer@baskhealth.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-semibold text-gray-700 mb-1"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
        />
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-2.5 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div>
        <Button
          type="submit"
          disabled={isLoading}
          variant="primary"
          className="w-full"
        >
          {isLoading ? "Signing in..." : "Sign in to Intake Studio"}
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
          BH
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Intake Studio — Reviewer Portal
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Secure clinical administration and form authoring
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-gray-200 sm:rounded-2xl sm:px-10 space-y-6">
          <Suspense
            fallback={
              <div className="text-xs text-gray-400 text-center py-4">
                Loading login form...
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="pt-2 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-400">
              Authorized clinical personnel & reviewers only. All operations
              audited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
