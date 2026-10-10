import { APP_MESSAGES } from "@/lib/constants/messages";
import { revisionSchema as revision } from "@/lib/validation/primitives";
import { z } from "zod";
import { FormDefinitionSchema, ThemeDefinitionSchema } from "./types";

export const renameFormSchema = z.object({
  name: z.string().trim().min(1),
  expectedRevision: revision,
});
export const saveDraftSchema = z.object({
  expectedRevision: revision,
  definition: FormDefinitionSchema,
  theme: ThemeDefinitionSchema,
});
export const publishRequestSchema = z.object({
  expectedRevision: revision,
  operationId: z.string().uuid(),
});
export const createFormSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  name: z.string().trim().min(1).default(APP_MESSAGES.UNTITLED_CLINICAL_INTAKE),
  initialDefinition: FormDefinitionSchema.optional(),
  initialTheme: ThemeDefinitionSchema.optional(),
});
