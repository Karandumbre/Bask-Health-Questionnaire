"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  FormDefinition,
  Question,
  FieldType,
  ThemeDefinition,
} from "@/features/forms/domain/types";
import { validateFormForPublish } from "@/features/forms/domain/validation";

import { useDraftAutosave } from "../hooks/use-draft-autosave";
import { loadFormDraft } from "../client/forms-api";
import {
  generateId,
  createDefaultQuestion,
  cloneQuestionWithNewId,
} from "../domain/question-operations";
import type { SaveStatus, ConflictDetails } from "../client/draft-autosave";
export type { SaveStatus, ConflictDetails } from "../client/draft-autosave";

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
  hasUnsavedChanges: boolean;

  baseDefinition: FormDefinition;
  baseTheme: ThemeDefinition;

  // Actions
  selectQuestion: (id: string | null) => void;
  addQuestion: (type: FieldType) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  duplicateQuestion: (id: string) => void;
  deleteQuestion: (id: string) => void;
  reorderQuestion: (id: string, direction: "up" | "down") => void;
  updateFormMeta: (updates: { title?: string; description?: string }) => void;
  updateTheme: (newTheme: ThemeDefinition) => void;
  saveNow: () => Promise<boolean>;
  saveForPublish: () => Promise<number | null>;
  resolveConflictReload: () => Promise<boolean>;
  resolveConflictForce: () => Promise<void>;
  resolveWithMergedDraft: (
    mergedDef: FormDefinition,
    mergedTheme: ThemeDefinition,
    serverRevision: number,
  ) => Promise<boolean>;
  setMode: (mode: "editor" | "preview") => void;
  setViewport: (vp: "desktop" | "mobile") => void;
  openPublishModal: () => void;
  closePublishModal: () => void;
}

const BuilderContext = createContext<BuilderContextType | null>(null);

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
  const [definition, setDefinition] =
    useState<FormDefinition>(initialDefinition);
  const [theme, setTheme] = useState<ThemeDefinition>(initialTheme);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initialDefinition.questions[0]?.id ?? null,
  );

  const {
    autosave,
    revision: draftRevision,
    status: saveStatus,
    lastSavedAt,
    conflict: conflictDetails,
  } = useDraftAutosave(formId, initialRevision, { definition, theme });

  const baseDraft = autosave.getAcknowledgedSnapshot();

  const [activeMode, setActiveMode] = useState<"editor" | "preview">("editor");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Question manipulation
  const selectQuestion = useCallback((id: string | null) => {
    setSelectedQuestionId(id);
  }, []);

  const addQuestion = useCallback(
    (type: FieldType) => {
      const newQ = createDefaultQuestion(type, definition.questions.length);
      setDefinition((prev) => ({
        ...prev,
        questions: [...prev.questions, newQ],
      }));
      setSelectedQuestionId(newQ.id);
    },
    [definition.questions.length],
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
    },
    [],
  );

  const duplicateQuestion = useCallback(
    (id: string) => {
      const index = definition.questions.findIndex((q) => q.id === id);
      if (index === -1) return;

      const source = definition.questions[index];
      if (!source) return;

      const newId = generateId("q");
      const clonedQuestion = cloneQuestionWithNewId(source, newId);

      setDefinition((prev) => {
        const nextQuestions = [...prev.questions];
        nextQuestions.splice(index + 1, 0, clonedQuestion);
        return { ...prev, questions: nextQuestions };
      });
      setSelectedQuestionId(newId);
    },
    [definition.questions],
  );

  const deleteQuestion = useCallback(
    (id: string) => {
      setDefinition((prev) => ({
        ...prev,
        questions: prev.questions.filter((q) => q.id !== id),
      }));
      if (selectedQuestionId === id)
        setSelectedQuestionId(
          definition.questions.find((q) => q.id !== id)?.id ?? null,
        );
    },
    [selectedQuestionId, definition.questions],
  );

  const reorderQuestion = useCallback(
    (id: string, direction: "up" | "down") => {
      setDefinition((prev) => {
        const index = prev.questions.findIndex((q) => q.id === id);
        if (index === -1) return prev;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= prev.questions.length)
          return prev;

        const nextQuestions = [...prev.questions];
        const moved = nextQuestions[index];
        if (!moved) return prev;

        nextQuestions.splice(index, 1);
        nextQuestions.splice(targetIndex, 0, moved);

        return { ...prev, questions: nextQuestions };
      });
    },
    [],
  );

  const updateFormMeta = useCallback(
    (updates: { title?: string; description?: string }) => {
      if (updates.title !== undefined) setFormName(updates.title);
      setDefinition((prev) => {
        const nextDef = { ...prev, ...updates };
        return nextDef;
      });
    },
    [],
  );

  const updateTheme = useCallback((newTheme: ThemeDefinition) => {
    setTheme(newTheme);
  }, []);

  const saveNow = autosave.flush;
  const saveForPublish = async () =>
    (await autosave.flush()) ? autosave.getSnapshot().revision : null;

  const resolveConflictReload = async () => {
    try {
      const data = await loadFormDraft(formId);
      autosave.reset(
        { definition: data.definition, theme: data.theme },
        data.draft.revision,
      );
      setDefinition(data.definition);
      setTheme(data.theme);
      setFormName(data.definition.title);
      setSelectedQuestionId((previous) =>
        data.definition.questions.some((q) => q.id === previous)
          ? previous
          : (data.definition.questions[0]?.id ?? null),
      );
      return true;
    } catch {
      autosave.fail();
      return false;
    }
  };

  const resolveConflictForce = async () => {
    if (conflictDetails)
      await autosave.forceSave(conflictDetails.serverRevision);
  };

  const resolveWithMergedDraft = async (
    mergedDef: FormDefinition,
    mergedTheme: ThemeDefinition,
    serverRevision: number,
  ) => {
    setDefinition(mergedDef);
    setTheme(mergedTheme);
    setFormName(mergedDef.title);
    return await autosave.saveWithMergedSnapshot(
      { definition: mergedDef, theme: mergedTheme },
      serverRevision,
    );
  };

  // Warn on tab close or page reload when there are unsaved edits
  const hasUnsavedChanges = saveStatus !== "saved";

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Validation errors for publish modal
  const publishValidationErrors = useMemo(
    () => validateFormForPublish(definition).errors,
    [definition],
  );

  return (
    <BuilderContext.Provider
      value={{
        formId,
        formName,
        draftRevision,
        definition,
        theme,
        baseDefinition: baseDraft.definition,
        baseTheme: baseDraft.theme,
        selectedQuestionId,
        saveStatus,
        lastSavedAt,
        conflictDetails,
        activeMode,
        previewViewport,
        isPublishModalOpen,
        publishValidationErrors,
        hasUnsavedChanges,
        selectQuestion,
        addQuestion,
        updateQuestion,
        duplicateQuestion,
        deleteQuestion,
        reorderQuestion,
        updateFormMeta,
        updateTheme,
        saveNow,
        saveForPublish,
        resolveConflictReload,
        resolveConflictForce,
        resolveWithMergedDraft,
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
    throw new Error(
      APP_MESSAGES.USEBUILDER_MUST_BE_USED_WITHIN_A_BUILDERPROVIDER,
    );
  }
  return context;
}
