import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validateLoginPassword,
  validateName,
  validateNewPassword,
  validateTerms,
} from "./validation";

describe("auth validation", () => {
  it("validates email format after trimming", () => {
    expect(validateEmail("")).toMatch(/Indica o teu email/);
    expect(validateEmail("   ")).toMatch(/Indica o teu email/);
    expect(validateEmail("sem-arroba")).toMatch(/email válido/);
    expect(validateEmail("a@b")).toMatch(/email válido/);
    expect(validateEmail(" ana@example.com ")).toBeNull();
  });

  it("requires only presence for the login password", () => {
    expect(validateLoginPassword("")).not.toBeNull();
    expect(validateLoginPassword("x")).toBeNull();
  });

  it("requires at least 8 characters for a new password", () => {
    expect(validateNewPassword("")).not.toBeNull();
    expect(validateNewPassword("1234567")).toMatch(/pelo menos 8/);
    expect(validateNewPassword("12345678")).toBeNull();
  });

  it("validates the name and the terms checkbox", () => {
    expect(validateName("  ")).not.toBeNull();
    expect(validateName("Ana")).toBeNull();
    expect(validateName("x".repeat(101))).not.toBeNull();
    expect(validateTerms(false)).toMatch(/Termos/);
    expect(validateTerms(true)).toBeNull();
  });
});
