import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/db";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const businessSchema = z.object({
  businessName: z.string().min(2),
  contactName: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email(),
  city: z.string().min(2),
  state: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().max(250).optional(),
  logoUrl: z.string().url().optional(),
  keywords: z.array(z.string()).min(1).max(10),
});

export async function businessRoutes(app: FastifyInstance) {
  // GET /businesses — public search
  app.get("/", async (req, reply) => {
    const query = z.object({
      search: z.string().optional(),
      city: z.string().optional(),
      keyword: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query);

    const { search, city, keyword, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Parameters<typeof prisma.businessListing.findMany>[0]["where"] = {
      isActive: true,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (keyword) where.keywords = { has: keyword.toLowerCase() };

    const [businesses, total] = await prisma.$transaction([
      prisma.businessListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { businessName: "asc" },
        select: {
          id: true, businessName: true, contactName: true, phone: true,
          email: true, city: true, state: true, website: true,
          description: true, logoUrl: true, keywords: true,
        },
      }),
      prisma.businessListing.count({ where }),
    ]);

    return reply.send({
      data: businesses,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  });

  // GET /businesses/:id — public
  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const business = await prisma.businessListing.findFirst({
      where: { id, isActive: true, deletedAt: null },
    });
    if (!business) return reply.status(404).send({ error: "Not found" });
    return reply.send({ business });
  });

  // POST /businesses — admin only
  app.post("/", { preHandler: requireAdmin }, async (req, reply) => {
    const input = businessSchema.parse(req.body);
    const { sub } = req.user as { sub: string };

    const business = await prisma.businessListing.create({
      data: {
        ...input,
        keywords: input.keywords.map((k) => k.toLowerCase()),
        createdById: sub,
      },
    });

    return reply.status(201).send({ business });
  });

  // PUT /businesses/:id — admin only
  app.put("/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const input = businessSchema.partial().parse(req.body);

    const business = await prisma.businessListing.update({
      where: { id },
      data: {
        ...input,
        keywords: input.keywords?.map((k) => k.toLowerCase()),
      },
    });

    return reply.send({ business });
  });

  // DELETE /businesses/:id — admin only (soft delete)
  app.delete("/:id", { preHandler: requireAdmin }, async (req, reply) => {
    await prisma.businessListing.update({
      where: { id: (req.params as { id: string }).id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return reply.status(204).send();
  });
}
