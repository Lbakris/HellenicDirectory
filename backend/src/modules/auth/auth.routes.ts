/**
 * Authentication routes — /api/v1/auth/*
 *
 * Includes full CCPA/PIPEDA compliance endpoints:
 *  - POST /register     — with explicit consent capture
 *  - POST /login
 *  - POST /refresh
 *  - POST /logout
 *  - POST /verify-email
 *  - GET  /me
 *  - GET  /account/data — CCPA §1798.110 right-to-know data export
 *  - DELETE /account    — GDPR/CCPA right to erasure (soft-delete + token revocation)
 */

import { FastifyInstance } from "fastify";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  logoutSchema,
} from "./auth.schema";
import {
  registerUser,
  loginUser,
  refreshTokens,
  revokeToken,
  verifyEmail,
  requestAccountDeletion,
  exportAccountData,
} from "./auth.service";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "../../config/db";

export async function authRoutes(app: FastifyInstance) {
  // ── POST /register ────────────────────────────────────────────────────────
  // Stricter rate limit: 5 attempts per 15 minutes per IP to limit abuse.
  app.post(
    "/register",
    {
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (req, reply) => {
      const input = registerSchema.parse(req.body);
      const user = await registerUser(input);
      return reply.status(201).send({ user });
    }
  );

  // ── POST /login ───────────────────────────────────────────────────────────
  // Stricter rate limit: 10 attempts per 15 minutes per IP.
  app.post(
    "/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
    },
    async (req, reply) => {
      const input = loginSchema.parse(req.body);
      const result = await loginUser(
        input,
        (p) => app.jwt.sign(p, { expiresIn: "15m" }),
        (p) => app.jwt.sign(p, { expiresIn: "30d" })
      );
      return reply.send(result);
    }
  );

  // ── POST /refresh ─────────────────────────────────────────────────────────
  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await refreshTokens(
      refreshToken,
      (p) => app.jwt.sign(p, { expiresIn: "15m" }),
      (p) => app.jwt.sign(p, { expiresIn: "30d" })
    );
    return reply.send(tokens);
  });

  // ── POST /logout ──────────────────────────────────────────────────────────
  app.post("/logout", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = logoutSchema.safeParse(req.body);
    if (parsed.success && parsed.data.refreshToken) {
      await revokeToken(parsed.data.refreshToken);
    }
    return reply.status(204).send();
  });

  // ── POST /verify-email ────────────────────────────────────────────────────
  // Completes email address verification from the link sent at registration.
  app.post("/verify-email", async (req, reply) => {
    const { token } = verifyEmailSchema.parse(req.body);
    await verifyEmail(token);
    return reply.send({ message: "Email verified successfully" });
  });

  // ── GET /me ───────────────────────────────────────────────────────────────
  app.get("/me", { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        appRole: true,
        emailVerifiedAt: true,
      },
    });
    if (!user) return reply.status(404).send({ error: "User not found" });
    return reply.send({ user });
  });

  // ── GET /account/data — CCPA §1798.110 right-to-know ────────────────────
  // Returns all personal data held for the authenticated user as a JSON export.
  app.get("/account/data", { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const data = await exportAccountData(sub);
    return reply.send(data);
  });

  // ── DELETE /account — GDPR/CCPA right to erasure ─────────────────────────
  // Soft-deletes the account and revokes all tokens. Hard-delete is scheduled
  // after the 30-day regulatory grace period by the background purge job.
  app.delete("/account", { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    await requestAccountDeletion(sub);
    return reply.status(204).send();
  });
}
