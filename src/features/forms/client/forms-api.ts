import { API_ROUTES } from "@/lib/constants/application";
import { z } from "zod";
import { apiRequest, successSchema } from "@/lib/http/api-client";
import { FormDefinitionSchema, ThemeDefinitionSchema } from "../domain/types";

export interface DraftSnapshot {
  definition: z.infer<typeof FormDefinitionSchema>;
  theme: z.infer<typeof ThemeDefinitionSchema>;
}

const revisionSchema = z.number().int().nonnegative();
const saveSchema = successSchema.extend({ revision: revisionSchema });
const draftSchema = successSchema.extend({
  draft: z.object({ revision: revisionSchema }),
  definition: FormDefinitionSchema,
  theme: ThemeDefinitionSchema,
});
const formSchema = successSchema.extend({ form: z.object({ id: z.string() }) });
const publishedSchema = successSchema.extend({
  versionNumber: z.number().int().positive(),
  publicSlug: z.string(),
  publicUrl: z.string(),
});

const formUrl = API_ROUTES.form;

export async function saveFormDraft(
  id: string,
  snapshot: DraftSnapshot,
  revision: number,
  signal?: AbortSignal,
) {
  const data = await apiRequest(formUrl(id), saveSchema, {
    method: "PATCH",
    json: { ...snapshot, expectedRevision: revision },
    signal,
  });
  return data.revision;
}

export function loadFormDraft(id: string, signal?: AbortSignal) {
  return apiRequest(formUrl(id), draftSchema, { signal });
}

export function createForm(name: string) {
  return apiRequest(API_ROUTES.forms, formSchema, {
    method: "POST",
    json: { name },
  });
}

export function renameForm(id: string, name: string, expectedRevision: number) {
  return apiRequest(formUrl(id), formSchema, {
    method: "PATCH",
    json: { name, expectedRevision },
  });
}

export function deleteForm(id: string) {
  return apiRequest(formUrl(id), successSchema, { method: "DELETE" });
}

export function publishForm(id: string, revision: number, operationId: string) {
  return apiRequest(API_ROUTES.publishForm(id), publishedSchema, {
    method: "POST",
    json: { expectedRevision: revision, operationId },
  });
}
