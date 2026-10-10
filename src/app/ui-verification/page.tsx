"use client";
import { BuilderProvider } from "@/features/forms/context/builder-context";
import { AdminHeader } from "@/features/forms/components/AdminHeader";
import { FieldNavigator } from "@/features/forms/components/FieldNavigator";
import { FormCanvas } from "@/features/forms/components/FormCanvas";
import { QuestionInspector } from "@/features/forms/components/QuestionInspector";
import { ConflictModal } from "@/features/forms/components/ConflictModal";
import { PublishModal } from "@/features/forms/components/PublishModal";
import { FormDashboard } from "@/features/forms/components/FormDashboard";
import { THEME_PRESET_OCEAN } from "@/features/themes/domain/theme-tokens";
import type { FormDefinition } from "@/features/forms/domain/types";
const definition: FormDefinition = {
  schemaVersion: 1,
  title: "Browser fixture",
  questions: [
    {
      id: "parent",
      type: "single_select",
      label: "Parent choice",
      required: true,
      visibility: null,
      options: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
    },
    {
      id: "details",
      type: "short_text",
      label: "Conditional detail",
      required: false,
      visibility: { parentQuestionId: "parent", equalsOptionId: "yes" },
    },
    {
      id: "number",
      type: "number",
      label: "Numeric field",
      required: false,
      visibility: null,
    },
    {
      id: "broken",
      type: "short_text",
      label: "Broken dependency",
      required: false,
      visibility: { parentQuestionId: "number", equalsOptionId: "missing" },
    },
  ],
};
export default function Fixture() {
  return (
    <>
      <BuilderProvider
        formId="fixture"
        initialName="Browser fixture"
        initialRevision={0}
        initialDefinition={definition}
        initialTheme={THEME_PRESET_OCEAN}
      >
        <AdminHeader />
        <div className="flex">
          <FieldNavigator />
          <FormCanvas />
          <QuestionInspector />
        </div>
        <ConflictModal />
        <PublishModal />
      </BuilderProvider>
      <FormDashboard
        initialForms={[]}
        workspaceName="Fixture"
        userEmail={null}
      />
    </>
  );
}
