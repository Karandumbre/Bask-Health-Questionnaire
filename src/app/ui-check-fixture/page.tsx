"use client";
import { useState } from "react";
import {
  BuilderProvider,
  useBuilder,
} from "@/features/forms/context/builder-context";
import { ConflictModal } from "@/features/forms/components/ConflictModal";
import { PublishModal } from "@/features/forms/components/PublishModal";
import { FormDashboard } from "@/features/forms/components/FormDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
const definition = {
  schemaVersion: 1 as const,
  title: "Initial",
  questions: [
    {
      id: "q1",
      type: "short_text" as const,
      label: "Name",
      required: false,
      visibility: null,
    },
  ],
};
const theme = {
  presetName: "Ocean",
  isCustomShuffle: false,
  light: {
    background: "#fff",
    surface: "#fff",
    text: "#000",
    primary: "#00f",
    primaryForeground: "#fff",
  },
  dark: {
    background: "#000",
    surface: "#000",
    text: "#fff",
    primary: "#00f",
    primaryForeground: "#fff",
  },
};
function Editor() {
  const b = useBuilder();
  const [open, setOpen] = useState(false);
  return (
    <main className="p-8 space-y-4">
      <Input
        aria-label="Draft title"
        value={b.definition.title}
        onChange={(e) => b.updateFormMeta({ title: e.target.value })}
      />
      <p data-testid="status">{b.saveStatus}</p>
      <p data-testid="revision">{b.draftRevision}</p>
      <Button onClick={() => void b.saveNow()}>Save draft</Button>
      <Button onClick={b.openPublishModal}>Open publish</Button>
      <Button
        onClick={() => {
          console.log("OPEN TEST");
          setOpen(true);
        }}
      >
        Open test dialog
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          console.log("CLOSE TEST");
          setOpen(false);
        }}
        titleId="test-title"
      >
        <h2 id="test-title">Test dialog</h2>
        <Input aria-label="Dialog input" />
        <Button onClick={() => setOpen(false)}>Close test dialog</Button>
      </Dialog>
      <ConflictModal />
      <PublishModal />
    </main>
  );
}
export default function CheckPage() {
  return (
    <>
      <BuilderProvider
        formId="fixture"
        initialName="Initial"
        initialRevision={1}
        initialDefinition={definition}
        initialTheme={theme}
      >
        <Editor />
      </BuilderProvider>
      <FormDashboard
        initialForms={[]}
        workspaceName="Fixture workspace"
        userEmail={null}
      />
    </>
  );
}
