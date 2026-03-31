import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/db";
import { requireAuth } from "../../middleware/auth";
import { AppRole, DirectoryAdminRole } from "@prisma/client";

export async function memberRoutes(app: FastifyInstance) {
  // PATCH /members/:memberId — update own member profile
  app.patch("/:memberId", { preHandler: requireAuth }, async (req, reply) => {
    const { memberId } = req.params as { memberId: string };
    const { sub } = req.user as { sub: string };

    const member = await prisma.directoryMember.findUnique({ where: { id: memberId } });
    if (!member || member.userId !== sub) return reply.status(403).send({ error: "Forbidden" });

    const input = z.object({
      photoUrl: z.string().url().optional(),
      city: z.string().optional(),
      industry: z.string().optional(),
      employer: z.string().optional(),
      preferredContact: z.enum(["email", "phone", "in-app"]).optional(),
      bio: z.string().max(500).optional(),
    }).parse(req.body);

    const updated = await prisma.directoryMember.update({ where: { id: memberId }, data: input });
    return reply.send({ member: updated });
  });

  // POST /members/:memberId/organizations — add organization to own profile
  app.post("/:memberId/organizations", { preHandler: requireAuth }, async (req, reply) => {
    const { memberId } = req.params as { memberId: string };
    const { sub } = req.user as { sub: string };

    const member = await prisma.directoryMember.findUnique({ where: { id: memberId } });
    if (!member || member.userId !== sub) return reply.status(403).send({ error: "Forbidden" });

    const { organizationId } = z.object({ organizationId: z.string().uuid() }).parse(req.body);

    const existing = await prisma.memberOrganization.findUnique({
      where: { memberId_organizationId: { memberId, organizationId } },
    });
    if (existing) return reply.status(409).send({ error: "Already added" });

    const mo = await prisma.memberOrganization.create({ data: { memberId, organizationId } });
    return reply.status(201).send({ memberOrganization: mo });
  });

  // PATCH /members/:memberId/organizations/:orgId — chapter admin verifies
  app.patch("/:memberId/organizations/:orgId", { preHandler: requireAuth }, async (req, reply) => {
    const { memberId, orgId } = req.params as { memberId: string; orgId: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    const mo = await prisma.memberOrganization.findUnique({
      where: { memberId_organizationId: { memberId, organizationId: orgId } },
      include: { member: true },
    });
    if (!mo) return reply.status(404).send({ error: "Not found" });

    const isGlobalAdmin = appRole === AppRole.OWNER || appRole === AppRole.ADMIN;
    const isChapterAdmin = isGlobalAdmin
      ? true
      : await prisma.directoryAdmin.findFirst({
          where: {
            directoryId: mo.member.directoryId,
            userId: sub,
            role: { in: [DirectoryAdminRole.DIRECTORY_ADMIN, DirectoryAdminRole.CHAPTER_ADMIN] },
          },
        });

    if (!isChapterAdmin) return reply.status(403).send({ error: "Forbidden" });

    const updated = await prisma.memberOrganization.update({
      where: { memberId_organizationId: { memberId, organizationId: orgId } },
      data: { verifiedAt: new Date(), verifiedById: sub },
    });

    return reply.send({ memberOrganization: updated });
  });
}
