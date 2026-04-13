import { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/db";
import { requireAuth } from "../../middleware/auth";
import { sendMail, messageForwardHtml } from "../../lib/mailer";
import { env } from "../../config/env";
import { AppRole } from "@prisma/client";

export async function messagingRoutes(app: FastifyInstance) {
  // GET /directories/:id/messages — list threads for a directory
  app.get("/:id/messages", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    await assertMember(id, sub, appRole, reply);

    const threads = await prisma.messageThread.findMany({
      where: {
        directoryId: id,
        participants: { some: { userId: sub } },
      },
      include: {
        messages: { orderBy: { sentAt: "desc" }, take: 1 },
        participants: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ data: threads });
  });

  // GET /directories/:id/messages/:threadId
  app.get("/:id/messages/:threadId", { preHandler: requireAuth }, async (req, reply) => {
    const { id, threadId } = req.params as { id: string; threadId: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    await assertMember(id, sub, appRole, reply);

    const thread = await prisma.messageThread.findFirst({
      where: { id: threadId, directoryId: id, participants: { some: { userId: sub } } },
      include: {
        messages: {
          orderBy: { sentAt: "asc" },
          include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
        participants: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
      },
    });

    if (!thread) return reply.status(404).send({ error: "Thread not found" });
    return reply.send({ thread });
  });

  // POST /directories/:id/messages — create thread or message
  app.post("/:id/messages", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    await assertMember(id, sub, appRole, reply);

    const input = z.object({
      threadId: z.string().uuid().optional(),
      subject: z.string().optional(),
      body: z.string().min(1),
      recipientIds: z.array(z.string().uuid()).optional(),
      isBroadcast: z.boolean().default(false),
    }).parse(req.body);

    let threadId = input.threadId;

    if (!threadId) {
      // New thread
      const participantIds = [sub, ...(input.recipientIds ?? [])];

      const thread = await prisma.messageThread.create({
        data: {
          directoryId: id,
          subject: input.subject,
          createdById: sub,
          type: input.isBroadcast ? "BROADCAST" : "DIRECT",
          participants: {
            create: participantIds.map((uid) => ({ userId: uid })),
          },
        },
      });
      threadId = thread.id;
    }

    const message = await prisma.message.create({
      data: { threadId, senderId: sub, body: input.body },
      include: { sender: { select: { fullName: true } } },
    });

    // Forward to participant emails (fire-and-forget)
    prisma.threadParticipant.findMany({
      where: { threadId, userId: { not: sub } },
      include: { user: { select: { email: true, fullName: true } } },
    }).then(async (participants) => {
      const sender = await prisma.user.findUnique({ where: { id: sub }, select: { fullName: true } });
      const directory = await prisma.directory.findUnique({ where: { id }, select: { name: true } });
      for (const p of participants) {
        await sendMail({
          to: p.user.email,
          subject: `New message from ${sender?.fullName}`,
          html: messageForwardHtml({
            senderName: sender?.fullName ?? "Someone",
            directoryName: directory?.name ?? "your directory",
            body: input.body,
            appUrl: env.APP_URL,
          }),
        }).catch(console.error);
      }

      // Mark as forwarded
      await prisma.message.update({ where: { id: message.id }, data: { emailForwardedAt: new Date() } });
    }).catch(console.error);

    return reply.status(201).send({ message: { id: message.id, threadId, sentAt: message.sentAt } });
  });
}

async function assertMember(directoryId: string, userId: string, appRole: AppRole, reply: FastifyReply) {
  const isGlobalAdmin = appRole === AppRole.OWNER || appRole === AppRole.ADMIN;
  if (isGlobalAdmin) return;

  const member = await prisma.directoryMember.findUnique({
    where: { directoryId_userId: { directoryId, userId } },
  });
  if (!member) {
    reply.status(404).send({ error: "Not found" });
    throw new Error("Not a member");
  }
}
