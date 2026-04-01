/**
 * Fastify authentication and authorisation preHandlers.
 *
 * Design note: Each function terminates the request-reply cycle by calling
 * `reply.send()` and then returning. Callers in `requireRole` check `reply.sent`
 * before accessing `req.user`, preventing a crash when auth fails in a composed
 * preHandler chain.
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { AppRole } from "@prisma/client";

/**
 * Verifies the Bearer JWT on the incoming request.
 * Responds 401 and returns if the token is missing or invalid.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

/**
 * Returns a preHandler that first validates the JWT via {@link requireAuth},
 * then checks that the authenticated user holds one of the required roles.
 *
 * Responds 403 if the role requirement is not met.
 */
export function requireRole(...roles: AppRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(req, reply);
    // If requireAuth already sent a 401 response, do not proceed.
    if (reply.sent) return;

    const user = req.user as { appRole: AppRole };
    if (!roles.includes(user.appRole)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
  };
}

/** Allows only OWNER and ADMIN roles. */
export const requireAdmin = requireRole(AppRole.OWNER, AppRole.ADMIN);

/** Allows only the OWNER role. */
export const requireOwner = requireRole(AppRole.OWNER);
