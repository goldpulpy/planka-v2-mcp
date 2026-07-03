import { describe, expect, test } from "@jest/globals";
import {
  createPlankaError,
  isPlankaError,
  PlankaAuthenticationError,
  PlankaConflictError,
  PlankaError,
  PlankaPermissionError,
  PlankaRateLimitError,
  PlankaResourceNotFoundError,
  PlankaValidationError,
} from "../common/errors.js";

describe("Planka errors", () => {
  test("createPlankaError maps known HTTP statuses to specific error classes", () => {
    expect(createPlankaError(401, { message: "Bad token" })).toBeInstanceOf(
      PlankaAuthenticationError,
    );
    expect(createPlankaError(403, { message: "Denied" })).toBeInstanceOf(PlankaPermissionError);
    expect(createPlankaError(404, { message: "Card" })).toBeInstanceOf(PlankaResourceNotFoundError);
    expect(createPlankaError(409, { message: "Conflict" })).toBeInstanceOf(PlankaConflictError);
    expect(createPlankaError(422, { message: "Invalid" })).toBeInstanceOf(PlankaValidationError);
    expect(createPlankaError(429, { message: "Slow down" })).toBeInstanceOf(PlankaRateLimitError);
  });

  test("createPlankaError falls back to the generic PlankaError", () => {
    const error = createPlankaError(500, { message: "Server failed" });

    expect(error).toBeInstanceOf(PlankaError);
    expect(error).toMatchObject({
      name: "PlankaError",
      message: "Server failed",
      status: 500,
      response: { message: "Server failed" },
    });
    expect(isPlankaError(error)).toBe(true);
    expect(isPlankaError(new Error("plain"))).toBe(false);
  });

  test("rate-limit errors expose the reset timestamp", () => {
    const resetAt = new Date("2026-07-04T12:00:00.000Z");
    const error = new PlankaRateLimitError("Wait", resetAt);

    expect(error.resetAt).toBe(resetAt);
    expect(error.response).toEqual({
      message: "Wait",
      reset_at: "2026-07-04T12:00:00.000Z",
    });
  });
});
