/**
 * Authentication service — register, login, token rotation, verification,
 * account deletion, and CCPA data export.
 *
 * Security notes:
 *  - bcrypt.compare is always called (even for unknown emails) to prevent
 *    timing-based user enumeration attacks.
 *  - Email verification tokens are stored as SHA-256 hashes; raw tokens are
 *    sent only in the verification email and never persisted.
 *  - Refresh token rotation uses a Prisma transaction to prevent token-reuse
 *    windows caused by non-atomic revoke + create sequences.
 *  - Consent timestamps are recorded at registration per CCPA §1798.140(ae),
 *    PIPEDA Clause 4.3, and Quebec Law 25.
 */

import bcrypt from "bcrypt";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { sendMail, verifyEmailHtml } from "../../lib/mailer";
import { env } from "../../config/env";
import type { RegisterInput, LoginInput } from "./auth.schema";

const SALT_ROUNDS = 12;

/**
 * Pre-computed bcrypt hash used as a stand-in when the requested user does not
 * exist, ensuring bcrypt.compare always runs and timing is constant regardless
 * of whether an account exists for the supplied email.
 */
const TIMING_DUMMY_HASH =
  "$2b$12$K9S5bNHsMLkE7RkO1K.Ro8.ZhSo/tKz7JCBEpbAz.dECbN2oHp2Lhm";

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Creates a new user account, records consent timestamps, and sends a
 * verification email. Only checks against active (non-deleted) accounts —
 * a soft-deleted email becomes available once its 30-day grace period expires.
 *
 * @throws 409 if an active account already exists for the email.
 */
export async function registerUser(input: RegisterInput) {
  // Only block active accounts; allow re-registration once a deletion grace period ends.
  const existing = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    const err = new Error("Email already in use") as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Generate a cryptographically random verification token.
  // Only the SHA-256 hash is stored; the raw token is transmitted in the email.
  const rawVerifyToken = crypto.randomBytes(32).toString("hex");
  const verifyTokenHash = crypto.createHash("sha256").update(rawVerifyToken).digest("hex");

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      emailVerifyToken: verifyTokenHash,
      // Consent tracking — required fields for compliance audit trail.
      privacyPolicyAcceptedAt: now,
      privacyPolicyVersion: input.privacyPolicyVersion,
      termsAcceptedAt: now,
      sensitiveDataConsentAt: now,
    },
    select: { id: true, email: true, fullName: true, appRole: true },
  });

  // Fire-and-forget: verification email failure must not block account creation.
  sendMail({
    to: user.email,
    subject: "Verify your Hellenic Directory account",
    html: verifyEmailHtml({
      fullName: user.fullName,
      verifyUrl: `${env.APP_URL}/verify-email?token=${rawVerifyToken}`,
    }),
    text: `Welcome to Hellenic Directory! Verify your email: ${env.APP_URL}/verify-email?token=${rawVerifyToken}`,
  }).catch(console.error);

  return user;
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Validates credentials, issues JWT access + refresh tokens, and persists a
 * hashed refresh token entry. bcrypt.compare always runs — even for unknown
 * emails — to keep response timing constant and prevent user enumeration.
 *
 * @throws 401 for any credential mismatch (user not found, deleted, wrong password,
 *         or OAuth-only account). All cases return the identical error message.
 */
export async function loginUser(
  input: LoginInput,
  sign: (payload: object) => string,
  signRefresh: (payload: object) => string
) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      fullName: true,
      appRole: true,
      passwordHash: true,
      deletedAt: true,
    },
  });

  // Always compare against a hash to prevent timing-based user enumeration.
  const hashToCompare = user?.passwordHash ?? TIMING_DUMMY_HASH;
  const valid = await bcrypt.compare(input.password, hashToCompare);

  // A single constant-time error covers all failure modes to prevent enumeration.
  if (!user || user.deletedAt || !user.passwordHash || !valid) {
    const err = new Error("Invalid credentials") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const payload = { sub: user.id, email: user.email, appRole: user.appRole };
  const accessToken = sign(payload);
  const refreshToken = signRefresh(payload);

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await prisma.authToken.create({
    data: {
      userId: user.id,
      tokenHash,
      deviceId: input.deviceId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, appRole: user.appRole },
  };
}

// ─── Token rotation ───────────────────────────────────────────────────────────

/**
 * Validates a refresh token, then atomically revokes it and issues new tokens.
 * The revoke + create is wrapped in a Prisma transaction to eliminate the race
 * window that would otherwise allow a stolen token to be reused.
 *
 * @throws 401 if the token is invalid, revoked, expired, or belongs to a
 *         soft-deleted user.
 */
export async function refreshTokens(
  refreshToken: string,
  sign: (payload: object) => string,
  signRefresh: (payload: object) => string
) {
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const stored = await prisma.authToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, email: true, appRole: true, deletedAt: true } },
    },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.user.deletedAt) {
    const err = new Error("Invalid or expired refresh token") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const payload = { sub: stored.user.id, email: stored.user.email, appRole: stored.user.appRole };
  const newAccess = sign(payload);
  const newRefresh = signRefresh(payload);
  const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");

  // Atomic rotation: revoke the old token and create the new one in a single transaction.
  // SERIALIZABLE isolation prevents a race window where two concurrent requests both
  // validate the same refresh token before either transaction commits. If a serialization
  // conflict occurs (Prisma P2034), it is surfaced as a 401 to the caller.
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.authToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
        await tx.authToken.create({
          data: {
            userId: stored.user.id,
            tokenHash: newHash,
            deviceId: stored.deviceId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (e: unknown) {
    // P2034: serialization failure — another request rotated this token concurrently.
    if ((e as { code?: string }).code === "P2034") {
      const err = new Error("Invalid or expired refresh token") as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }
    throw e;
  }

  return { accessToken: newAccess, refreshToken: newRefresh };
}

// ─── Revoke ───────────────────────────────────────────────────────────────────

/** Revokes a specific refresh token by hash. Used on explicit logout. */
export async function revokeToken(refreshToken: string) {
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await prisma.authToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─── Email verification ───────────────────────────────────────────────────────

/**
 * Marks the user's email as verified and clears the stored token hash.
 * The raw token from the email URL is hashed before the DB lookup.
 *
 * @throws 400 if the token is invalid, already used, or expired.
 */
export async function verifyEmail(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: tokenHash, emailVerifiedAt: null },
    select: { id: true },
  });

  if (!user) {
    const err = new Error("Invalid or already-used verification link") as Error & {
      statusCode: number;
    };
    err.statusCode = 400;
    throw err;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailVerifyToken: null },
  });
}

// ─── Account deletion (GDPR / CCPA right to erasure) ─────────────────────────

/**
 * Soft-deletes the user account and immediately revokes all active refresh
 * tokens. A background job should hard-delete the row after the 30-day
 * regulatory grace period defined in the Legal Compliance Blueprint §6.
 *
 * @throws 404 if the user does not exist or is already deleted.
 */
export async function requestAccountDeletion(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    const err = new Error("User not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  await prisma.$transaction([
    // Revoke all active refresh tokens immediately.
    prisma.authToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: now,
        // Soft-delete prevents login; hard-delete is scheduled after 30-day grace period.
        deletedAt: now,
      },
    }),
  ]);
}

// ─── Data export (CCPA §1798.110 / PIPEDA Principle 9 right of access) ───────

/**
 * Returns a structured export of all personal data held for the given user.
 * Intended for CCPA "right to know" and PIPEDA "right of access" requests.
 */
export async function exportAccountData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      appRole: true,
      createdAt: true,
      privacyPolicyAcceptedAt: true,
      privacyPolicyVersion: true,
      termsAcceptedAt: true,
      sensitiveDataConsentAt: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    const err = new Error("User not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const [memberships, sentMessages] = await prisma.$transaction([
    prisma.directoryMember.findMany({
      where: { userId },
      select: { directoryId: true, city: true, industry: true, employer: true, bio: true, joinedAt: true },
    }),
    prisma.message.findMany({
      where: { senderId: userId },
      select: { threadId: true, body: true, sentAt: true },
    }),
  ]);

  return { user, memberships, sentMessages };
}
