"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import {
  getEligibleConditionParents,
  validateQuestionCondition,
} from "../domain/conditions";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

import { useBuilder } from "../context/builder-context";
import type { Question } from "@/features/forms/domain/types";
import { AlertTriangleIcon, CheckIcon } from "@/components/ui/icons";

interface ConditionBuilderProps {
  question: Question;
}

export function ConditionBuilder({ question }: ConditionBuilderProps) {
  const { definition, updateQuestion } = useBuilder();

  const eligibleParents = getEligibleConditionParents(
    definition.questions,
    question.id,
  );
  const isConditional = question.visibility !== null;
  const currentParentId = question.visibility?.parentQuestionId ?? "";
  const currentOptionId = question.visibility?.equalsOptionId ?? "";
  const selectedParent = definition.questions.find(
    (q) => q.id === currentParentId,
  );
  const errors = validateQuestionCondition(definition.questions, question);
  const isConditionValid = errors.length === 0;
  const validationMessage = errors.map((error) => error.issue).join(" ");

  const handleToggle = (enabled: boolean) => {
    if (!enabled) {
      updateQuestion(question.id, { visibility: null });
      return;
    }

    // Default to first eligible parent and its first option
    if (eligibleParents.length > 0) {
      const defaultParent = eligibleParents[0];
      if (defaultParent) {
        const defaultOption = defaultParent.options[0]?.id ?? "";
        updateQuestion(question.id, {
          visibility: {
            parentQuestionId: defaultParent.id,
            equalsOptionId: defaultOption,
          },
        });
      }
    } else {
      updateQuestion(question.id, {
        visibility: {
          parentQuestionId: "",
          equalsOptionId: "",
        },
      });
    }
  };

  const handleParentChange = (parentId: string) => {
    const parent = eligibleParents.find((p) => p.id === parentId);
    const defaultOption = parent?.options[0]?.id ?? "";
    updateQuestion(question.id, {
      visibility: {
        parentQuestionId: parentId,
        equalsOptionId: defaultOption,
      },
    });
  };

  const handleOptionChange = (optionId: string) => {
    if (!question.visibility) return;
    updateQuestion(question.id, {
      visibility: {
        ...question.visibility,
        equalsOptionId: optionId,
      },
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 space-y-3">
      {/* Toggle header */}
      <div className="flex items-center justify-between">
        <div>
          <label
            htmlFor="cond-toggle"
            className="text-xs font-semibold text-gray-900 cursor-pointer"
          >
            {APP_MESSAGES.CONDITIONAL_VISIBILITY}
          </label>
          <p className="text-caption text-gray-400">
            {APP_MESSAGES.SHOW_ONLY_WHEN_AN_EARLIER_ANSWER_MATCHES}
          </p>
        </div>

        <Input
          id="cond-toggle"
          type="checkbox"
          checked={isConditional}
          onChange={(e) => handleToggle(e.target.checked)}
        />
      </div>

      {/* Conditional Configuration Form */}
      {isConditional && (
        <div className="space-y-3 pt-2 border-t border-gray-200/80">
          {eligibleParents.length === 0 && !selectedParent ? (
            <div className="rounded-md bg-amber-50 p-2.5 border border-amber-200 text-caption text-amber-800 flex items-start gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {APP_MESSAGES.NO_ELIGIBLE_PARENT_FIELDS}
                </p>
                <p className="mt-0.5 text-amber-700">
                  {
                    APP_MESSAGES.CONDITIONS_REQUIRE_AN_EARLIER_SINGLE_CHOICE_QUESTION_THAT_IS
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Parent Field Selector */}
              <div>
                <label
                  htmlFor={`condition-parent-${question.id}`}
                  className="block text-caption font-medium text-gray-700 mb-1"
                >
                  {APP_MESSAGES.WHEN_PARENT_QUESTION}
                </label>
                <Select
                  id={`condition-parent-${question.id}`}
                  value={currentParentId}
                  onChange={(e) => handleParentChange(e.target.value)}
                  className="rounded-md p-1.5"
                >
                  <option value="" disabled>
                    {APP_MESSAGES.SELECT_ELIGIBLE_QUESTION}
                  </option>
                  {eligibleParents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.label || APP_MESSAGES.UNTITLED_SINGLE_SELECT}
                    </option>
                  ))}
                  {/* If current parent is invalid / outside eligible list, display it */}
                  {selectedParent &&
                    !eligibleParents.some(
                      (p) => p.id === selectedParent.id,
                    ) && (
                      <option
                        value={selectedParent.id}
                        className="text-red-600"
                      >
                        {selectedParent.label} {APP_MESSAGES.INVALID_DEPENDENCY}
                      </option>
                    )}
                </Select>
              </div>

              {/* Option Selector */}
              {selectedParent?.type === "single_select" && (
                <div>
                  <label
                    htmlFor={`condition-option-${question.id}`}
                    className="block text-caption font-medium text-gray-700 mb-1"
                  >
                    {APP_MESSAGES.EQUALS_CHOICE}
                  </label>
                  <Select
                    id={`condition-option-${question.id}`}
                    value={currentOptionId}
                    onChange={(e) => handleOptionChange(e.target.value)}
                    className="rounded-md p-1.5"
                  >
                    <option value="" disabled>
                      {APP_MESSAGES.SELECT_CHOICE}
                    </option>
                    {selectedParent.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label || APP_MESSAGES.UNTITLED_CHOICE}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Status Indicator */}
              {isConditionValid ? (
                <div className="flex items-center gap-1.5 text-caption text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{APP_MESSAGES.CONDITION_IS_VALID_AND_ACTIVE}</span>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2 text-caption text-red-700 bg-red-50 border border-red-200 p-2 rounded">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <AlertTriangleIcon className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>{validationMessage}</span>
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      updateQuestion(question.id, { visibility: null })
                    }
                    className="text-micro font-semibold text-red-700 underline hover:text-red-900 shrink-0 cursor-pointer"
                    title={APP_MESSAGES.REMOVE_BROKEN_CONDITION}
                  >
                    {APP_MESSAGES.REMOVE_CONDITION}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
