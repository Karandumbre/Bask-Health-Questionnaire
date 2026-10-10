import { apiRequest, successSchema } from "@/lib/http/api-client";

export function login(email: string, password: string) {
  return apiRequest("/api/auth/login", successSchema, {
    method: "POST",
    json: { email, password },
  });
}
export function logout() {
  return apiRequest("/api/auth/logout", successSchema, { method: "POST" });
}
