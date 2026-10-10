import { APP_MESSAGES } from "@/lib/constants/messages";
import "server-only";
import { eq } from "drizzle-orm";
import { forms } from "@/lib/db/schema";
import type { Transaction } from "@/lib/db/transaction";
import { AppError } from "@/lib/errors";

/** Every form mutation locks its container before touching a draft or version. */
export async function lockActiveForm(tx: Transaction, formId: string) {
  const [form] = await tx
    .select()
    .from(forms)
    .where(eq(forms.id, formId))
    .for("update")
    .limit(1);
  if (!form || form.archivedAt)
    throw new AppError(
      "NOT_FOUND",
      APP_MESSAGES.FORM_NOT_FOUND_OR_HAS_BEEN_ARCHIVED,
      404,
      { resourceType: "form" },
    );
  return form;
}
