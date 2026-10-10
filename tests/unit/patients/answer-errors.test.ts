import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/http/api-client";
import { apiAnswerErrors } from "@/features/patients/client/answer-errors";

describe("Answer validation feedback", () => {
  it("maps authoritative validation issues to their fields", () => {
    expect(
      apiAnswerErrors(
        new ApiError("Invalid answers", 422, "INVALID_ANSWER", {
          validationErrors: [
            {
              questionId: "age",
              issue: "Number cannot exceed 100",
              code: "MAX_VALUE_VIOLATION",
            },
          ],
        }),
      ),
    ).toEqual({ age: "Number cannot exceed 100" });
  });
  it("does not attach generic failures or malformed details to fields", () => {
    expect(apiAnswerErrors(new Error("Network unavailable"))).toEqual({});
    expect(
      apiAnswerErrors(
        new ApiError("Invalid", 422, "INVALID_ANSWER", {
          validationErrors: [{ issue: "Missing identifier" }],
        }),
      ),
    ).toEqual({});
  });
});
