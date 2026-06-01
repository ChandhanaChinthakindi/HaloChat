/**
 * Tests for the client-side signup form validation logic.
 * Mirrors the same rules enforced server-side so issues surface on both sides.
 */
import { describe, it, expect } from "vitest";
import { calcAge } from "../utils/chatUtils";

function validateSignup(fields: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string | null;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
}): { valid: boolean; ageError: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!fields.name.trim()) errors.push("name required");
  if (!fields.email.trim()) errors.push("email required");
  if (fields.password.length < 8) errors.push("password too short");
  if (fields.password !== fields.confirmPassword) errors.push("passwords don't match");
  if (!fields.gender) errors.push("gender required");

  const dobFull =
    fields.dobDay.length === 2 && fields.dobMonth.length === 2 && fields.dobYear.length === 4
      ? `${fields.dobYear}-${fields.dobMonth}-${fields.dobDay}`
      : null;

  const isDobValid = dobFull !== null && !isNaN(new Date(dobFull).getTime());
  const userAge = isDobValid && dobFull ? calcAge(dobFull) : null;
  const isValidAge = userAge !== null && userAge >= 17;
  const ageError = isDobValid && userAge !== null && userAge < 17;

  if (!isValidAge) errors.push("invalid age");

  return { valid: errors.length === 0, ageError, errors };
}

const VALID_FORM = {
  name: "Jane Doe",
  email: "jane@example.com",
  password: "password123",
  confirmPassword: "password123",
  gender: "female" as const,
  dobDay: "15",
  dobMonth: "06",
  dobYear: "1998",
};

describe("Signup form validation", () => {
  it("passes for a fully valid form", () => {
    const { valid } = validateSignup(VALID_FORM);
    expect(valid).toBe(true);
  });

  it("fails when name is empty", () => {
    const { valid, errors } = validateSignup({ ...VALID_FORM, name: "  " });
    expect(valid).toBe(false);
    expect(errors).toContain("name required");
  });

  it("fails when password is shorter than 8 characters", () => {
    const { valid, errors } = validateSignup({ ...VALID_FORM, password: "short", confirmPassword: "short" });
    expect(valid).toBe(false);
    expect(errors).toContain("password too short");
  });

  it("fails when password and confirmPassword do not match", () => {
    const { valid, errors } = validateSignup({ ...VALID_FORM, confirmPassword: "differentpass" });
    expect(valid).toBe(false);
    expect(errors).toContain("passwords don't match");
  });

  it("fails when gender is not selected", () => {
    const { valid, errors } = validateSignup({ ...VALID_FORM, gender: null });
    expect(valid).toBe(false);
    expect(errors).toContain("gender required");
  });

  describe("Age gate (DOB validation)", () => {
    it("fails and flags ageError when user is 16", () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 16);
      dob.setDate(dob.getDate() - 1);
      const iso = dob.toISOString().slice(0, 10);
      const [year, month, day] = iso.split("-");
      const { valid, ageError } = validateSignup({
        ...VALID_FORM,
        dobDay: day,
        dobMonth: month,
        dobYear: year,
      });
      expect(valid).toBe(false);
      expect(ageError).toBe(true);
    });

    it("passes when user is exactly 17", () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 17);
      dob.setDate(dob.getDate() - 1);
      const iso = dob.toISOString().slice(0, 10);
      const [year, month, day] = iso.split("-");
      const { valid, ageError } = validateSignup({
        ...VALID_FORM,
        dobDay: day,
        dobMonth: month,
        dobYear: year,
      });
      expect(valid).toBe(true);
      expect(ageError).toBe(false);
    });

    it("passes for a 25-year-old", () => {
      const { valid } = validateSignup(VALID_FORM); // VALID_FORM uses 1998 DOB
      expect(valid).toBe(true);
    });

    it("fails and does NOT flag ageError when DOB fields are incomplete", () => {
      const { valid, ageError } = validateSignup({
        ...VALID_FORM,
        dobDay: "1",   // only 1 digit — incomplete
        dobMonth: "06",
        dobYear: "1998",
      });
      expect(valid).toBe(false);
      expect(ageError).toBe(false); // incomplete DOB, not an age-gate error
    });
  });
});
