"use client";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import type {
  Question,
  NumberQuestion,
  ShortTextQuestion,
  LongTextQuestion,
} from "../domain/types";

export function QuestionConstraintsEditor({
  question,
  onChange,
}: {
  question: NumberQuestion | ShortTextQuestion | LongTextQuestion;
  onChange: (updates: Partial<Question>) => void;
}) {
  const numeric = question.type === "number";
  const fields = numeric
    ? (["min", "max"] as const)
    : (["minLength", "maxLength"] as const);
  return (
    <section className="space-y-3 border-t border-gray-200 pt-2">
      <h3 className="text-xs font-semibold">
        {numeric ? "Numeric Bounds" : "Length Limits"}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((field, index) => {
          const id = `${field}-${question.id}`;
          const value =
            question.validation && field in question.validation
              ? (Reflect.get(question.validation, field) as number | undefined)
              : undefined;
          return (
            <FormField
              key={field}
              id={id}
              label={`${index === 0 ? "Min" : "Max"} ${numeric ? "Value" : "Length"}`}
            >
              <Input
                id={id}
                type="number"
                value={value ?? ""}
                min={numeric ? undefined : 0}
                step={numeric ? "any" : 1}
                onChange={(event) => {
                  const bound =
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value);
                  if (question.type === "number")
                    onChange({
                      type: "number",
                      validation: { ...question.validation, [field]: bound },
                    });
                  else
                    onChange({
                      type: question.type,
                      validation: { ...question.validation, [field]: bound },
                    });
                }}
                placeholder="None"
              />
            </FormField>
          );
        })}
      </div>
      {question.type === "number" && (
        <label className="flex items-center justify-between text-xs">
          Whole numbers only
          <Input
            type="checkbox"
            checked={question.validation?.integerOnly ?? false}
            onChange={(event) =>
              onChange({
                validation: {
                  ...question.validation,
                  integerOnly: event.target.checked,
                },
              })
            }
          />
        </label>
      )}
    </section>
  );
}
