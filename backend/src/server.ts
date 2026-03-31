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

const app = Fastify({ logger: env.NODE_ENV !== "test" });

async function bootstrap() {
  // Plugins
  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors, {
    origin: env.CORS_ORIGINS.split(","),
    credentials: true,
  });
  await app.register(fastifyJwt, { secret: env.JWT_ACCESS_SECRET });
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    redis,
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  // Routes
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(parishRoutes, { prefix: "/parishes" });
  await app.register(directoryRoutes, { prefix: "/directories" });
  await app.register(messagingRoutes, { prefix: "/directories" });
  await app.register(businessRoutes, { prefix: "/businesses" });
  await app.register(memberRoutes, { prefix: "/members" });
  await app.register(adminRoutes, { prefix: "/admin" });

  // Connect DB & Redis
  await prisma.$connect();
  await redis.connect();

  // Schedule daily scraper at 2 AM UTC
  if (env.NODE_ENV === "production") {
    cron.schedule("0 2 * * *", () => {
      runGoarchScraper().catch(console.error);
    });
    console.info("[Cron] GoarchScraper scheduled daily at 02:00 UTC");
  }

  // Start server
  const address = await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.info(`[Server] Listening on ${address}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
