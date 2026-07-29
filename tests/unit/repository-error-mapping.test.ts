import { describe, expect, it } from "vitest";
import {
  classifyRepositoryFailure,
  getRepositoryFailureDetails,
} from "@/lib/repositories/error-mapping";

describe("repository error mapping", () => {
  it.each(["40001", "409", "23505"])(
    "maps database conflict code %s to a conflict",
    (code) => {
      expect(classifyRepositoryFailure({ code, message: "save failed" }))
        .toBe("conflict");
    },
  );

  it("recognizes the workflow conflict message without relying on instanceof", () => {
    expect(classifyRepositoryFailure({
      code: "P0001",
      message: "workflow version conflict",
    })).toBe("conflict");
  });

  it("keeps safe diagnostic details from plain provider errors", () => {
    expect(getRepositoryFailureDetails({
      code: "PGRST116",
      message: "JSON object requested, multiple rows returned",
      name: "PostgrestError",
    })).toEqual({
      code: "PGRST116",
      message: "JSON object requested, multiple rows returned",
      name: "PostgrestError",
    });
  });
});
