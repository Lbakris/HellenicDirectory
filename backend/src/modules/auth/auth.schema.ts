/**
 * Zod validation schemas for the /auth endpoints.
 *
 * Compliance note: The registration schema enforces explicit opt-in consent for:
 *  - Privacy Policy  (required under CCPA/CPRA, all 20 US state privacy laws, PIPEDA)
 *  - Terms of Service
 *  - Sensitive data processing (religious affiliation — required under CCPA §1798.140(ae),
 *    PIPEDA Clause 4.3, and Quebec Law 25 §12 for 16 US states + Canada)
 *
 * Timestamps for each consent are recorded server-side in the User row at registration.
 */

import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(120),
  phone: z.string().optional(),

  // ── Consent acknowledgements ─────────────────────────────────────────────────
  /// Version identifier of the Privacy Policy the user accepted (e.g. "2024-01-01").
  /// Stored in User.privacyPolicyVersion for future audit trails.
  privacyPolicyVersion: z.string().min(1, "Privacy policy version is required"),
  /// Must be exactly `true` — any other value fails validation.
  consentPrivacyPolicy: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Privacy Policy to create an account" }),
  }),
  consentTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service to create an account" }),
  }),
  /// Required in 16 US states and Canada because directory membership implies
  /// Greek Orthodox community affiliation — a sensitive personal data category.
  consentSensitiveData: z.literal(true, {
    errorMap: () => ({
      message:
        "You must consent to processing of sensitive community-affiliation data to join a directory",
    }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  /// Raw 32-byte hex token from the verification email link.
  token: z.string().length(64, "Invalid verification token"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
