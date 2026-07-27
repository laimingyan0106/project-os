import { describe, expect, it } from "vitest";
import { loginSchema, safeNextPath, signupSchema } from "@/lib/auth";

describe("auth input contract", () => {
  it("only permits internal post-login paths", () => {
    expect(safeNextPath("/projects?view=active")).toBe("/projects?view=active");
    expect(safeNextPath("https://example.com")).toBe("/");
    expect(safeNextPath("//example.com")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });

  it("rejects malformed login credentials", () => {
    expect(loginSchema.safeParse({ email: "invalid", password: "" }).success).toBe(false);
  });

  it("requires a strong matching signup password", () => {
    expect(signupSchema.safeParse({
      email: "creator@example.com",
      password: "password1",
      confirmPassword: "password1",
    }).success).toBe(true);
    expect(signupSchema.safeParse({
      email: "creator@example.com",
      password: "password1",
      confirmPassword: "password2",
    }).success).toBe(false);
  });
});
