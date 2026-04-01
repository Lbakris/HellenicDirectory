/**
 * Admin routes — /api/v1/admin/*
 *
 * All state-changing operations write an AuditLog row (required by the
 * Legal Compliance Blueprint §5 and the SOC 2 audit-trail path).
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/db";
import { requireAdmin, requireOwner } from "../../middleware/auth";
import { AppRole } from "@prisma/client";

/** UUID v4 regex used to validate path parameters. */
const uuidSchema = z.string().uuid("Invalid ID format");

export async function adminRoutes(app: FastifyInstance) {
  // ── GET /admin/users ───────────────────────────────────────────────────────
  app.get("/users", { preHandler: requireAdmin }, async (req, reply) => {
    const query = z
      .object({
        search: z.string().optional(),
        role: z.nativeEnum(AppRole).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query);

    const where: Parameters<typeof prisma.user.findMany>[0]["where"] = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.role) where.appRole = query.role;

    const skip = (query.page - 1) * query.limit;
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          fullName: true,
          appRole: true,
          createdAt: true,
          emailVerifiedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({ data: users, meta: { total, page: query.page, limit: query.limit } });
  });

  // ── PATCH /admin/users/:id/role — owner-only ───────────────────────────────
  // Writes an AuditLog entry for every role change (compliance requirement).
  app.patch("/users/:id/role", { preHandler: requireOwner }, async (req, reply) => {
    const { id } = z.object({ id: uuidSchema }).parse(req.params);
    const { appRole } = z.object({ appRole: z.nativeEnum(AppRole) }).parse(req.body);
    const actor = req.user as { sub: string };

    // Fetch current role for audit snapshot.
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, appRole: true },
    });
    if (!target) return reply.status(404).send({ error: "User not found" });

    const [updated] = await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { appRole } }),
      prisma.auditLog.create({
        data: {
          actorId: actor.sub,
          action: "user.role_changed",
          entityType: "User",
          entityId: id,
          metadata: { previousRole: target.appRole, newRole: appRole },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] ?? null,
        },
      }),
    ]);

    return reply.send({ user: { id: updated.id, appRole: updated.appRole } });
  });

  // ── GET /admin/stats ───────────────────────────────────────────────────────
  app.get("/stats", { preHandler: requireAdmin }, async (_req, reply) => {
    const [users, parishes, directories, businesses, messages] = await prisma.$transaction([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.parish.count(),
      prisma.directory.count({ where: { deletedAt: null } }),
      prisma.businessListing.count({ where: { isActive: true, deletedAt: null } }),
      prisma.message.count(),
    ]);

    return reply.send({ stats: { users, parishes, directories, businesses, messages } });
  });

  // ── GET /admin/directories ─────────────────────────────────────────────────
  app.get("/directories", { preHandler: requireAdmin }, async (_req, reply) => {
    const directories = await prisma.directory.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { members: true } },
        createdBy: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ data: directories });
  });

  // ── GET /admin/audit-logs ──────────────────────────────────────────────────
  // Returns a paginated audit log for compliance review.
  app.get("/audit-logs", { preHandler: requireAdmin }, async (req, reply) => {
    const query = z
      .object({
        action: z.string().optional(),
        actorId: z.string().uuid().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(req.query);

    const where: Parameters<typeof prisma.auditLog.findMany>[0]["where"] = {};
    if (query.action) where.action = { contains: query.action };
    if (query.actorId) where.actorId = query.actorId;

    const skip = (query.page - 1) * query.limit;
    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { fullName: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return reply.send({ data: logs, meta: { total, page: query.page, limit: query.limit } });
  });
}
