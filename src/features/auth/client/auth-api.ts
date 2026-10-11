import { clearFormsCache } from "@/features/forms/client/forms-cache";
import { API_ROUTES } from "@/lib/constants/application";
import { apiRequest, successSchema } from "@/lib/http/api-client";

export async function login(email: string, password: string) {
  const data = await apiRequest.post(API_ROUTES.login, successSchema, {
    json: { email, password },
  });
  clearFormsCache();
  return data;
}
export async function logout() {
  const data = await apiRequest.post(API_ROUTES.logout, successSchema);
  clearFormsCache();
  return data;
}
