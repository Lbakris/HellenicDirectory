import { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/db";
import { requireAuth } from "../../middleware/auth";
import { sendMail, messageForwardHtml } from "../../lib/mailer";
import { env } from "../../config/env";
import { AppRole } from "@prisma/client";

const APP_URL = env.APP_URL;

export async function messagingRoutes(app: FastifyInstance) {
  // GET /directories/:id/messages — list threads for a directory
  app.get("/:id/messages", { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { sub, appRole } = req.user as { sub: string; appRole: AppRole };

    if (!(await assertMember(id, sub, appRole, reply))) return;

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

    if (!(await assertMember(id, sub, appRole, reply))) return;

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

    if (!(await assertMember(id, sub, appRole, reply))) return;

    const input = z.object({
      threadId: z.string().uuid().optional(),
      subject: z.string().optional(),
      body: z.string().min(1),
      recipientIds: z.array(z.string().uuid()).optional(),
      isBroadcast: z.boolean().default(false),
    }).parse(req.body);

    const isGlobalAdmin = appRole === AppRole.OWNER || appRole === AppRole.ADMIN;

    let threadId = input.threadId;

    if (threadId) {
      // Existing thread: the caller must be a participant of a thread that belongs
      // to THIS directory. Without this check any directory member could post into
      // an arbitrary thread id, including threads in other directories (IDOR).
      const existing = await prisma.messageThread.findFirst({
        where: { id: threadId, directoryId: id, participants: { some: { userId: sub } } },
        select: { id: true },
      });
      if (!existing) return reply.status(404).send({ error: "Thread not found" });
    } else {
      // New thread. Broadcasts (one-to-all announcements) are restricted to admins.
      if (input.isBroadcast && !isGlobalAdmin) {
        return reply.status(403).send({ error: "Only administrators can send broadcast messages" });
      }

      // Validate recipients: every recipient must be a member of this directory.
      const recipientIds = Array.from(new Set(input.recipientIds ?? []));
      if (recipientIds.length > 0) {
        const memberCount = await prisma.directoryMember.count({
          where: { directoryId: id, userId: { in: recipientIds } },
        });
        if (memberCount !== recipientIds.length) {
          return reply.status(400).send({ error: "All recipients must be members of this directory" });
        }
      }

      // De-duplicate participants (the sender is always included).
      const participantIds = Array.from(new Set([sub, ...recipientIds]));

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
            appUrl: APP_URL,
          }),
        }).catch(console.error);
      }

      // Mark as forwarded
      await prisma.message.update({ where: { id: message.id }, data: { emailForwardedAt: new Date() } });
    }).catch(console.error);

    return reply.status(201).send({ message: { id: message.id, threadId, sentAt: message.sentAt } });
  });
}

/**
 * Ensures the user may access the directory. Global admins always pass; otherwise
 * the user must have a DirectoryMember row. On failure this sends a 404 and returns
 * false — callers must `return` when it returns false. It never throws, so it cannot
 * trigger a second response from the global error handler.
 */
async function assertMember(
  directoryId: string,
  userId: string,
  appRole: AppRole,
  reply: FastifyReply
): Promise<boolean> {
  const isGlobalAdmin = appRole === AppRole.OWNER || appRole === AppRole.ADMIN;
  if (isGlobalAdmin) return true;

  const member = await prisma.directoryMember.findUnique({
    where: { directoryId_userId: { directoryId, userId } },
  });
  if (!member) {
    reply.status(404).send({ error: "Not found" });
    return false;
  }
  return true;
}
