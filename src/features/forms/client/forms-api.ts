import { API_ROUTES } from "@/lib/constants/application";
import { z } from "zod";
import { apiRequest, successSchema } from "@/lib/http/api-client";
import { FormDefinitionSchema, ThemeDefinitionSchema } from "../domain/types";

export interface DraftSnapshot {
  definition: z.infer<typeof FormDefinitionSchema>;
  theme: z.infer<typeof ThemeDefinitionSchema>;
}

import { clearFormsCache } from "./forms-cache";

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
  const data = await apiRequest.patch(formUrl(id), saveSchema, {
    json: { ...snapshot, expectedRevision: revision },
    signal,
  });
  clearFormsCache();
  return data.revision;
}

export function loadFormDraft(id: string, signal?: AbortSignal) {
  return apiRequest.get(formUrl(id), draftSchema, { signal });
}

export async function createForm(name: string) {
  const data = await apiRequest.post(API_ROUTES.forms, formSchema, {
    json: { name },
  });
  clearFormsCache();
  return data;
}

export async function renameForm(
  id: string,
  name: string,
  expectedRevision: number,
) {
  const data = await apiRequest.patch(formUrl(id), formSchema, {
    json: { name, expectedRevision },
  });
  clearFormsCache();
  return data;
}

export async function deleteForm(id: string) {
  const data = await apiRequest.delete(formUrl(id), successSchema);
  clearFormsCache();
  return data;
}

export async function publishForm(
  id: string,
  revision: number,
  operationId: string,
) {
  const data = await apiRequest.post(
    API_ROUTES.publishForm(id),
    publishedSchema,
    {
      json: { expectedRevision: revision, operationId },
    },
  );
  clearFormsCache();
  return data;
}

const formsListSchema = successSchema.extend({
  forms: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      workspaceId: z.string(),
      latestPublishedVersionNumber: z.number().int().positive().nullable(),
      latestPublicSlug: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      draftRevision: revisionSchema.nullable(),
      draftUpdatedAt: z.string().nullable(),
    }),
  ),
});

export async function listForms(workspaceId: string, signal: AbortSignal) {
  const data = await apiRequest.get(
    `${API_ROUTES.forms}?workspaceId=${encodeURIComponent(workspaceId)}`,
    formsListSchema,
    { signal },
  );
  return data.forms.map(({ latestPublicSlug, ...form }) => ({
    ...form,
    publicSlug: latestPublicSlug,
  }));
}
