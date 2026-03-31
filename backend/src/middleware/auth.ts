import { FastifyRequest, FastifyReply } from "fastify";
import { AppRole } from "@prisma/client";

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
}

export function requireRole(...roles: AppRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(req, reply);
    const user = req.user as { appRole: AppRole };
    if (!roles.includes(user.appRole)) {
      reply.status(403).send({ error: "Forbidden" });
    }
  };
}

export const requireAdmin = requireRole(AppRole.OWNER, AppRole.ADMIN);
export const requireOwner = requireRole(AppRole.OWNER);
