import { FormDashboard } from "@/features/forms/components/FormDashboard";
import { ResponsesView } from "@/features/forms/components/ResponsesView";
import { BuilderProvider } from "@/features/forms/context/builder-context";
import { AdminHeader } from "@/features/forms/components/AdminHeader";
import { FormCanvas } from "@/features/forms/components/FormCanvas";
import { ConflictModal } from "@/features/forms/components/ConflictModal";
import { PublishModal } from "@/features/forms/components/PublishModal";
import { THEME_PRESET_OCEAN } from "@/features/themes/domain/presets";
import type { FormDefinition } from "@/features/forms/domain/types";
const definition: FormDefinition = { schemaVersion: 1, title: "Feedback fixture", questions: [{ id: "name", type: "short_text", label: "Your name", required: true, visibility: null }] };
export default async function Preview({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
 const { view } = await searchParams;
 if (view === "responses") return <ResponsesView formId="fixture" formName="Feedback fixture" initialSubmissions={[{ id: "sub-one", sessionId: "session-one", sessionReference: "BKS-FAKE-1234", publishedVersionId: "version-one", versionNumber: 1, answerSnapshot: {}, status: "completed", submittedAt: "2026-10-10T00:00:00Z" }]} />;
 if (view === "editor") return <BuilderProvider formId="fixture" initialName="Feedback fixture" initialRevision={1} initialDefinition={definition} initialTheme={THEME_PRESET_OCEAN}><AdminHeader/><FormCanvas/><ConflictModal/><PublishModal/></BuilderProvider>;
 return <FormDashboard initialForms={[{ id: "fixture", name: "Feedback fixture", workspaceId: "workspace-fixture", latestPublishedVersionNumber: null, createdAt: "2026-10-10T00:00:00Z", updatedAt: "2026-10-10T00:00:00Z", draftRevision: 1, draftUpdatedAt: null }]} workspaceName="Fixture workspace" userEmail="reviewer@example.com" />;
}
