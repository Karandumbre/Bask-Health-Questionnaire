import { API_ROUTES } from "@/lib/constants/application";
import { apiRequest, successSchema } from "@/lib/http/api-client";

export function login(email: string, password: string) {
  return apiRequest(API_ROUTES.login, successSchema, {
    method: "POST",
    json: { email, password },
  });
}
export function logout() {
  return apiRequest(API_ROUTES.logout, successSchema, { method: "POST" });
}
