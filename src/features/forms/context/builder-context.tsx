"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type {
  FormDefinition,
  Question,
  FieldType,
  ThemeDefinition,
} from "@/features/forms/domain/types";
import { validateFormForPublish } from "@/features/forms/domain/validation";

export type SaveStatus =
  | "saved"
  | "editing"
  | "saving"
  | "failed"
  | "conflict"
  | "offline";

export interface ConflictDetails {
  serverRevision: number;
  localRevision: number;
  message?: string;
}

export interface BuilderContextType {
  formId: string;
  formName: string;
  draftRevision: number;
  definition: FormDefinition;
  theme: ThemeDefinition;
  selectedQuestionId: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  conflictDetails: ConflictDetails | null;
  activeMode: "editor" | "preview";
  previewViewport: "desktop" | "mobile";
  isPublishModalOpen: boolean;
  publishValidationErrors: Array<{ questionId?: string; issue: string }>;

  // Actions
  selectQuestion: (id: string | null) => void;
  addQuestion: (type: FieldType) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  duplicateQuestion: (id: string) => void;
  deleteQuestion: (id: string) => void;
  reorderQuestion: (id: string, direction: "up" | "down") => void;
  updateFormMeta: (updates: { title?: string; description?: string }) => void;
  updateTheme: (newTheme: ThemeDefinition) => void;
  saveNow: () => Promise<void>;
  resolveConflictReload: () => Promise<void>;
  resolveConflictForce: () => Promise<void>;
  setMode: (mode: "editor" | "preview") => void;
  setViewport: (vp: "desktop" | "mobile") => void;
  openPublishModal: () => void;
  closePublishModal: () => void;
}

const BuilderContext = createContext<BuilderContextType | null>(null);

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultQuestion(type: FieldType, index: number): Question {
  const base = {
    id: generateId("q"),
    required: false,
    visibility: null,
  };

  switch (type) {
    case "short_text":
      return {
        ...base,
        type: "short_text",
        label: `Question ${index + 1}`,
        placeholder: "Enter text...",
      };
    case "long_text":
      return {
        ...base,
        type: "long_text",
        label: `Question ${index + 1}`,
        placeholder: "Enter detailed explanation...",
      };
    case "number":
      return {
        ...base,
        type: "number",
        label: `Numeric Question ${index + 1}`,
        validation: { integerOnly: true },
      };
    case "single_select":
      return {
        ...base,
        type: "single_select",
        label: `Single-choice Question ${index + 1}`,
        options: [
          { id: generateId("opt"), label: "Option 1" },
          { id: generateId("opt"), label: "Option 2" },
        ],
      };
    case "multi_select":
      return {
        ...base,
        type: "multi_select",
        label: `Multi-select Question ${index + 1}`,
        options: [
          { id: generateId("opt"), label: "Option 1" },
          { id: generateId("opt"), label: "Option 2" },
          { id: generateId("opt"), label: "Option 3" },
        ],
      };
    case "checkbox":
      return {
        ...base,
        type: "checkbox",
        label: `I acknowledge and consent to the intake terms`,
      };
  }
}

function cloneQuestionWithNewId(source: Question, newId: string): Question {
  const newLabel = `${source.label} (Copy)`;
  const vis = source.visibility ? { ...source.visibility } : null;

  switch (source.type) {
    case "single_select":
      return {
        ...source,
        id: newId,
        label: newLabel,
        options: source.options.map((opt) => ({ ...opt, id: generateId("opt") })),
        visibility: vis,
      };
    case "multi_select":
      return {
        ...source,
        id: newId,
        label: newLabel,
        options: source.options.map((opt) => ({ ...opt, id: generateId("opt") })),
        visibility: vis,
      };
    case "short_text":
    case "long_text":
    case "number":
    case "checkbox":
      return {
        ...source,
        id: newId,
        label: newLabel,
        visibility: vis,
      };
  }
}

export function BuilderProvider({
  formId,
  initialName,
  initialRevision,
  initialDefinition,
  initialTheme,
  children,
}: {
  formId: string;
  initialName: string;
  initialRevision: number;
  initialDefinition: FormDefinition;
  initialTheme: ThemeDefinition;
  children: ReactNode;
}) {
  const [formName, setFormName] = useState(initialName);
  const [draftRevision, setDraftRevision] = useState(initialRevision);
  const [definition, setDefinition] = useState<FormDefinition>(initialDefinition);
  const [theme, setTheme] = useState<ThemeDefinition>(initialTheme);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initialDefinition.questions[0]?.id ?? null
  );

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date());
  const [conflictDetails, setConflictDetails] = useState<ConflictDetails | null>(null);

  const [activeMode, setActiveMode] = useState<"editor" | "preview">("editor");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Refs for tracking debounced saves and latest state
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const definitionRef = useRef(definition);
  const themeRef = useRef(theme);
  const revisionRef = useRef(draftRevision);

  useEffect(() => {
    definitionRef.current = definition;
    themeRef.current = theme;
    revisionRef.current = draftRevision;
  }, [definition, theme, draftRevision]);

  // Real autosave execution
  const executeSave = useCallback(async () => {
    if (isSavingRef.current || !isDirtyRef.current) return;

    try {
      isSavingRef.current = true;
      setSaveStatus("saving");

      const response = await fetch(`/api/admin/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: revisionRef.current,
          definition: definitionRef.current,
          theme: themeRef.current,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // Revision conflict occurred!
        setSaveStatus("conflict");
        setConflictDetails({
          serverRevision: data.error?.details?.currentRevision ?? revisionRef.current + 1,
          localRevision: revisionRef.current,
          message: data.error?.message,
        });
        return;
      }

      if (!response.ok || !data.success) {
        setSaveStatus("failed");
        return;
      }

      // Success
      isDirtyRef.current = false;
      const nextRev = typeof data.revision === "number" ? data.revision : revisionRef.current + 1;
      setDraftRevision(nextRev);
      revisionRef.current = nextRev;
      setSaveStatus("saved");
      setLastSavedAt(new Date());
      setConflictDetails(null);
    } catch {
      setSaveStatus("failed");
    } finally {
      isSavingRef.current = false;
    }
  }, [formId]);

  // Trigger debounced autosave on edits
  const scheduleAutosave = useCallback(() => {
    isDirtyRef.current = true;
    setSaveStatus("editing");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSave();
    }, 800);
  }, [executeSave]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Question manipulation
  const selectQuestion = useCallback((id: string | null) => {
    setSelectedQuestionId(id);
  }, []);

  const addQuestion = useCallback(
    (type: FieldType) => {
      setDefinition((prev) => {
        const newQ = createDefaultQuestion(type, prev.questions.length);
        const nextQuestions = [...prev.questions, newQ];
        setSelectedQuestionId(newQ.id);
        return { ...prev, questions: nextQuestions };
      });
      scheduleAutosave();
    },
    [scheduleAutosave]
  );

  const updateQuestion = useCallback(
    (id: string, updates: Partial<Question>) => {
      setDefinition((prev) => {
        const nextQuestions = prev.questions.map((q) => {
          if (q.id === id) {
            return { ...q, ...updates } as Question;
          }
          return q;
        });
        return { ...prev, questions: nextQuestions };
      });
      scheduleAutosave();
    },
    [scheduleAutosave]
  );

  const duplicateQuestion = useCallback(
    (id: string) => {
      setDefinition((prev) => {
        const index = prev.questions.findIndex((q) => q.id === id);
        if (index === -1) return prev;

        const source = prev.questions[index];
        if (!source) return prev;

        const newId = generateId("q");
        const clonedQuestion = cloneQuestionWithNewId(source, newId);

        const nextQuestions = [...prev.questions];
        nextQuestions.splice(index + 1, 0, clonedQuestion);
        setSelectedQuestionId(newId);
        return { ...prev, questions: nextQuestions };
      });
      scheduleAutosave();
    },
    [scheduleAutosave]
  );

  const deleteQuestion = useCallback(
    (id: string) => {
      setDefinition((prev) => {
        const nextQuestions = prev.questions.filter((q) => q.id !== id);
        // Clean up broken conditions if this was an upstream parent
        const sanitizedQuestions = nextQuestions.map((q) => {
          if (q.visibility?.parentQuestionId === id) {
            return { ...q, visibility: null };
          }
          return q;
        });

        // Update selected question
        if (selectedQuestionId === id) {
          const nextSelected = sanitizedQuestions[0]?.id ?? null;
          setSelectedQuestionId(nextSelected);
        }

        return { ...prev, questions: sanitizedQuestions };
      });
      scheduleAutosave();
    },
    [selectedQuestionId, scheduleAutosave]
  );

  const reorderQuestion = useCallback(
    (id: string, direction: "up" | "down") => {
      setDefinition((prev) => {
        const index = prev.questions.findIndex((q) => q.id === id);
        if (index === -1) return prev;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= prev.questions.length) return prev;

        const nextQuestions = [...prev.questions];
        const moved = nextQuestions[index];
        if (!moved) return prev;

        nextQuestions.splice(index, 1);
        nextQuestions.splice(targetIndex, 0, moved);

        return { ...prev, questions: nextQuestions };
      });
      scheduleAutosave();
    },
    [scheduleAutosave]
  );

  const updateFormMeta = useCallback(
    (updates: { title?: string; description?: string }) => {
      setDefinition((prev) => {
        const nextDef = { ...prev, ...updates };
        if (updates.title) {
          setFormName(updates.title);
        }
        return nextDef;
      });
      scheduleAutosave();
    },
    [scheduleAutosave]
  );

  const updateTheme = useCallback(
    (newTheme: ThemeDefinition) => {
      setTheme(newTheme);
      scheduleAutosave();
    },
    [scheduleAutosave]
  );

  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isDirtyRef.current = true;
    await executeSave();
  }, [executeSave]);

  // Conflict resolution handlers
  const resolveConflictReload = useCallback(async () => {
    try {
      setSaveStatus("saving");
      const res = await fetch(`/api/admin/forms/${formId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDefinition(data.definition);
        setTheme(data.theme);
        setDraftRevision(data.draft.revision);
        revisionRef.current = data.draft.revision;
        isDirtyRef.current = false;
        setConflictDetails(null);
        setSaveStatus("saved");
      }
    } catch {
      setSaveStatus("failed");
    }
  }, [formId]);

  const resolveConflictForce = useCallback(async () => {
    if (!conflictDetails) return;
    try {
      setSaveStatus("saving");
      // Force save using server revision as expectedRevision
      const response = await fetch(`/api/admin/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedRevision: conflictDetails.serverRevision,
          definition: definitionRef.current,
          theme: themeRef.current,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const nextRev = typeof data.revision === "number" ? data.revision : conflictDetails.serverRevision + 1;
        setDraftRevision(nextRev);
        revisionRef.current = nextRev;
        isDirtyRef.current = false;
        setConflictDetails(null);
        setSaveStatus("saved");
        setLastSavedAt(new Date());
      } else {
        setSaveStatus("failed");
      }
    } catch {
      setSaveStatus("failed");
    }
  }, [formId, conflictDetails]);

  // Validation errors for publish modal
  const publishValidationErrors = validateFormForPublish(definition).errors;

  return (
    <BuilderContext.Provider
      value={{
        formId,
        formName,
        draftRevision,
        definition,
        theme,
        selectedQuestionId,
        saveStatus,
        lastSavedAt,
        conflictDetails,
        activeMode,
        previewViewport,
        isPublishModalOpen,
        publishValidationErrors,
        selectQuestion,
        addQuestion,
        updateQuestion,
        duplicateQuestion,
        deleteQuestion,
        reorderQuestion,
        updateFormMeta,
        updateTheme,
        saveNow,
        resolveConflictReload,
        resolveConflictForce,
        setMode: setActiveMode,
        setViewport: setPreviewViewport,
        openPublishModal: () => setIsPublishModalOpen(true),
        closePublishModal: () => setIsPublishModalOpen(false),
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error("useBuilder must be used within a BuilderProvider");
  }
  return context;
}
