import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/db";
import { requireAdmin, requireOwner } from "../../middleware/auth";
import { AppRole } from "@prisma/client";

export async function adminRoutes(app: FastifyInstance) {
  // GET /admin/users
  app.get("/users", { preHandler: requireAdmin }, async (req, reply) => {
    const query = z.object({
      search: z.string().optional(),
      role: z.nativeEnum(AppRole).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query);

    const where: Parameters<typeof prisma.user.findMany>[0]["where"] = {
      deletedAt: null,
    };
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
        select: { id: true, email: true, fullName: true, appRole: true, createdAt: true, emailVerifiedAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({ data: users, meta: { total, page: query.page, limit: query.limit } });
  });

  // PATCH /admin/users/:id/role — owner-only
  app.patch("/users/:id/role", { preHandler: requireOwner }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { appRole } = z.object({ appRole: z.nativeEnum(AppRole) }).parse(req.body);

    const user = await prisma.user.update({ where: { id }, data: { appRole } });
    return reply.send({ user: { id: user.id, appRole: user.appRole } });
  });

  // GET /admin/stats
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

  // GET /admin/directories
  app.get("/directories", { preHandler: requireAdmin }, async (req, reply) => {
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
}
