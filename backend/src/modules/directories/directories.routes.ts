import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/db";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { sendMail, inviteEmailHtml } from "../../lib/mailer";
import { env } from "../../config/env";
import { AppRole } from "@prisma/client";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function directoryRoutes(app: FastifyInstance) {
  // POST /directories — admin-only creation
  app.post("/", { preHandler: requireAdmin }, async (req, reply) => {
    const input = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
    }).parse(req.body);

    const { sub } = req.user as { sub: string };
    const slug = slugify(input.name) + "-" + Date.now().toString(36);

    const directory = await prisma.directory.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        createdById: sub,
        admins: {
          create: { userId: sub, role: "DIRECTORY_ADMIN" },
        },
      },
    });

    return reply.status(201).send({ directory });
  });

  // GET /directories/:id — members only (returns 404 to non-members for privacy)
  app.get("/:id", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    const isAdmin = appRole === AppRole.OWNER || appRole === AppRole.ADMIN;
    const membership = isAdmin
      ? true
      : await prisma.directoryMember.findUnique({ where: { directoryId_userId: { directoryId: id, userId: sub } } });

    if (!membership) return reply.status(404).send({ error: "Not found" });

    const directory = await prisma.directory.findUnique({
      where: { id, deletedAt: null },
      include: { admins: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } } },
    });

    if (!directory) return reply.status(404).send({ error: "Not found" });
    return reply.send({ directory });
  });

  // GET /directories/:id/members
  app.get("/:id/members", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    const query = z.object({
      search: z.string().optional(),
      organization: z.string().optional(),
      industry: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query);

    const isAdmin = appRole === AppRole.OWNER || appRole === AppRole.ADMIN;
    const isMember = isAdmin
      ? true
      : await prisma.directoryMember.findUnique({ where: { directoryId_userId: { directoryId: id, userId: sub } } });

    if (!isMember) return reply.status(404).send({ error: "Not found" });

    const where: Parameters<typeof prisma.directoryMember.findMany>[0]["where"] = { directoryId: id };

    if (query.search) {
      where.user = {
        fullName: { contains: query.search, mode: "insensitive" },
      };
    }
    if (query.industry) where.industry = { contains: query.industry, mode: "insensitive" };
    if (query.organization) {
      where.organizations = {
        some: { organization: { name: { contains: query.organization, mode: "insensitive" } } },
      };
    }

    const skip = (query.page - 1) * query.limit;
    const [members, total] = await prisma.$transaction([
      prisma.directoryMember.findMany({
        where,
        skip,
        take: query.limit,
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          organizations: {
            include: { organization: true },
            where: { verifiedAt: { not: null } },
          },
        },
        orderBy: { user: { fullName: "asc" } },
      }),
      prisma.directoryMember.count({ where }),
    ]);

    return reply.send({
      data: members,
      meta: { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) },
    });
  });

  // POST /directories/:id/invite
  app.post("/:id/invite", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const isAdmin = appRole === AppRole.OWNER || appRole === AppRole.ADMIN;
    const isMember = isAdmin
      ? true
      : await prisma.directoryMember.findUnique({ where: { directoryId_userId: { directoryId: id, userId: sub } } });

    if (!isMember) return reply.status(404).send({ error: "Not found" });

    const directory = await prisma.directory.findUnique({ where: { id } });
    if (!directory) return reply.status(404).send({ error: "Not found" });

    // Check if already a member
    const alreadyMember = await prisma.directoryMember.findFirst({
      where: { directoryId: id, user: { email } },
    });
    if (alreadyMember) return reply.status(409).send({ error: "User is already a member" });

    const inviter = await prisma.user.findUnique({ where: { id: sub }, select: { fullName: true } });

    const invitation = await prisma.directoryInvitation.create({
      data: {
        directoryId: id,
        invitedById: sub,
        email,
        status: isAdmin ? "ACCEPTED" : "PENDING",
        adminApprovedById: isAdmin ? sub : undefined,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // APP_URL is Zod-validated as a URL in env.ts — safe to use as the invite base URL.
    const inviteUrl = `${env.APP_URL}/invite/${invitation.token}`;

    await sendMail({
      to: email,
      subject: `You've been invited to ${directory.name}`,
      html: inviteEmailHtml({
        directoryName: directory.name,
        inviterName: inviter?.fullName ?? "A member",
        inviteUrl,
      }),
    }).catch(console.error);

    return reply.status(201).send({ invitation: { id: invitation.id, email, status: invitation.status } });
  });

  // POST /directories/:id/approve-invite/:token
  app.post("/:id/approve-invite/:token", { preHandler: requireAuth }, async (req, reply) => {
    const { id, token } = req.params as { id: string; token: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    const invitation = await prisma.directoryInvitation.findUnique({
      where: { token },
      include: { directory: true },
    });

    if (
      !invitation ||
      invitation.directoryId !== id ||
      invitation.status !== "PENDING" ||
      invitation.expiresAt < new Date()
    ) {
      return reply.status(404).send({ error: "Invalid or expired invitation" });
    }

    const isAdmin = appRole === AppRole.OWNER || appRole === AppRole.ADMIN;
    const isMember = isAdmin
      ? true
      : await prisma.directoryMember.findUnique({ where: { directoryId_userId: { directoryId: id, userId: sub } } });

    if (!isMember) return reply.status(403).send({ error: "Forbidden" });

    await prisma.directoryInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        adminApprovedById: sub,
        secondApproverId: invitation.adminApprovedById ? sub : undefined,
      },
    });

    return reply.send({ message: "Invitation approved" });
  });

  // DELETE /directories/:id/members/:userId
  app.delete("/:id/members/:userId", { preHandler: requireAuth }, async (req, reply) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    const isAdmin = appRole === AppRole.OWNER || appRole === AppRole.ADMIN;
    const isDirAdmin = isAdmin
      ? true
      : await prisma.directoryAdmin.findUnique({ where: { directoryId_userId: { directoryId: id, userId: sub } } });

    // Allow self-removal or admin removal
    if (!isDirAdmin && sub !== userId) return reply.status(403).send({ error: "Forbidden" });

    await prisma.directoryMember.deleteMany({ where: { directoryId: id, userId } });
    return reply.status(204).send();
  });
}
