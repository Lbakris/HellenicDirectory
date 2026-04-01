/**
 * Fastify server bootstrap.
 *
 * Security posture:
 *  - Helmet with a restrictive Content-Security-Policy (API-appropriate directives).
 *  - CORS restricted to configured origins.
 *  - Global rate-limit of 100 req/min via Redis; auth routes use tighter per-route limits.
 *  - All routes served under /api/v1 for future versioning.
 *  - Health check validates the Postgres connection, not just process liveness.
 *  - Graceful shutdown handles SIGTERM and SIGINT.
 */

import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import cron from "node-cron";

import { env } from "./config/env";
import { prisma } from "./config/db";
import { redis } from "./config/redis";
import { errorHandler } from "./middleware/errorHandler";

import { authRoutes } from "./modules/auth/auth.routes";
import { parishRoutes } from "./modules/parishes/parishes.routes";
import { directoryRoutes } from "./modules/directories/directories.routes";
import { messagingRoutes } from "./modules/messaging/messaging.routes";
import { businessRoutes } from "./modules/businesses/businesses.routes";
import { memberRoutes } from "./modules/members/members.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { runGoarchScraper } from "./jobs/goarchScraper";

const app = Fastify({
  logger: env.NODE_ENV !== "test",
  // Trust proxy headers from load balancers (needed for req.ip accuracy in rate limiting).
  trustProxy: true,
});

async function bootstrap() {
  // ── Security plugins ───────────────────────────────────────────────────────
  await app.register(fastifyHelmet, {
    // Restrict CSP for an API server: no scripts, no frames, HTTPS only.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : undefined,
      },
    },
    // HSTS: enforce HTTPS for 1 year in production.
    hsts:
      env.NODE_ENV === "production"
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(fastifyCors, {
    origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(fastifyJwt, { secret: env.JWT_ACCESS_SECRET });

  // Global rate limit; auth routes declare tighter per-route overrides.
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    redis,
    // Return RFC 7807-style error on rate limit.
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Retry after ${context.after}.`,
    }),
  });

  // ── Error handler ──────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ── Health check ───────────────────────────────────────────────────────────
  // Tests the actual Postgres connection so orchestrators (k8s, ECS) can detect
  // DB connectivity failures, not just process liveness.
  app.get("/health", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: "ok", ts: new Date().toISOString() });
    } catch {
      return reply.status(503).send({ status: "error", ts: new Date().toISOString() });
    }
  });

  // ── Versioned API routes ───────────────────────────────────────────────────
  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: "/auth" });
      await v1.register(parishRoutes, { prefix: "/parishes" });
      await v1.register(directoryRoutes, { prefix: "/directories" });
      await v1.register(messagingRoutes, { prefix: "/directories" });
      await v1.register(businessRoutes, { prefix: "/businesses" });
      await v1.register(memberRoutes, { prefix: "/members" });
      await v1.register(adminRoutes, { prefix: "/admin" });
    },
    { prefix: "/api/v1" }
  );

  // ── Database & cache connections ───────────────────────────────────────────
  await prisma.$connect();
  // IORedis connects lazily; no explicit connect() call required.

  // ── Scheduled jobs ─────────────────────────────────────────────────────────
  if (env.NODE_ENV === "production") {
    cron.schedule("0 2 * * *", () => {
      runGoarchScraper().catch(console.error);
    });
    console.info("[Cron] GoarchScraper scheduled daily at 02:00 UTC");
  }

  // ── Start listening ────────────────────────────────────────────────────────
  const address = await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.info(`[Server] Listening on ${address}`);
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.info(`[Server] ${signal} received — shutting down gracefully`);
  await app.close();
  await prisma.$disconnect();
  // IORedis: quit() sends QUIT command and closes the connection cleanly.
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

bootstrap().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
