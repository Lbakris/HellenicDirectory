import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { prisma } from "../../config/db";
import { sendMail } from "../../lib/mailer";
import type { RegisterInput, LoginInput } from "./auth.schema";

const SALT_ROUNDS = 12;

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    const err = new Error("Email already in use") as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
    },
    select: { id: true, email: true, fullName: true, appRole: true },
  });

  // Send verification email (fire-and-forget)
  sendMail({
    to: user.email,
    subject: "Verify your Hellenic Directory account",
    html: `<p>Welcome ${user.fullName}! Please verify your email by clicking <a href="${process.env.CORS_ORIGINS}/verify?token=placeholder">here</a>.</p>`,
  }).catch(console.error);

  return user;
}

export async function loginUser(
  input: LoginInput,
  sign: (payload: object) => string,
  signRefresh: (payload: object) => string
) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true, email: true, fullName: true, appRole: true,
      passwordHash: true, deletedAt: true,
    },
  });

  if (!user || user.deletedAt) {
    const err = new Error("Invalid credentials") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  if (!user.passwordHash) {
    const err = new Error("Please sign in with your OAuth provider") as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    const err = new Error("Invalid credentials") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const payload = { sub: user.id, email: user.email, appRole: user.appRole };
  const accessToken = sign(payload);
  const refreshToken = signRefresh(payload);

  // Store hashed refresh token
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
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      appRole: user.appRole,
    },
  };
}

export async function refreshTokens(
  refreshToken: string,
  sign: (payload: object) => string,
  signRefresh: (payload: object) => string
) {
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const stored = await prisma.authToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, appRole: true, deletedAt: true } } },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.user.deletedAt) {
    const err = new Error("Invalid or expired refresh token") as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  // Rotate: revoke old, issue new
  await prisma.authToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  const payload = { sub: stored.user.id, email: stored.user.email, appRole: stored.user.appRole };
  const newAccess = sign(payload);
  const newRefresh = signRefresh(payload);
  const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");

  await prisma.authToken.create({
    data: {
      userId: stored.user.id,
      tokenHash: newHash,
      deviceId: stored.deviceId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function revokeToken(refreshToken: string) {
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await prisma.authToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
