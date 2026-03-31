import { FastifyInstance } from "fastify";
import { registerSchema, loginSchema, refreshSchema } from "./auth.schema";
import { registerUser, loginUser, refreshTokens, revokeToken } from "./auth.service";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "../../config/db";

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post("/register", async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input);
    return reply.status(201).send({ user });
  });

  // POST /auth/login
  app.post("/login", async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(
      input,
      (p) => app.jwt.sign(p, { expiresIn: "15m" }),
      (p) => app.jwt.sign(p, { expiresIn: "30d" })
    );
    return reply.send(result);
  });

  // POST /auth/refresh
  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await refreshTokens(
      refreshToken,
      (p) => app.jwt.sign(p, { expiresIn: "15m" }),
      (p) => app.jwt.sign(p, { expiresIn: "30d" })
    );
    return reply.send(tokens);
  });

  // POST /auth/logout
  app.post("/logout", { preHandler: requireAuth }, async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) await revokeToken(refreshToken);
    return reply.status(204).send();
  });

  // GET /auth/me
  app.get("/me", { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true, email: true, fullName: true, phone: true,
        avatarUrl: true, appRole: true, emailVerifiedAt: true,
      },
    });
    if (!user) return reply.status(404).send({ error: "User not found" });
    return reply.send({ user });
  });
}
