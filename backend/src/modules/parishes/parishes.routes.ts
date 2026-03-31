import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";

const CACHE_TTL = 60 * 60 * 24; // 24 hours

export async function parishRoutes(app: FastifyInstance) {
  // GET /parishes — search + paginate
  app.get("/", async (req, reply) => {
    const query = z.object({
      search: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      metropolisId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query);

    const { search, city, state, metropolisId, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Parameters<typeof prisma.parish.findMany>[0]["where"] = {
      deletedAt: undefined,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { clergy: { some: { fullName: { contains: search, mode: "insensitive" } } } },
      ];
    }
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (state) where.state = { equals: state, mode: "insensitive" };
    if (metropolisId) where.metropolisId = metropolisId;

    const [parishes, total] = await prisma.$transaction([
      prisma.parish.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true, name: true, city: true, state: true, country: true,
          phone: true, email: true, website: true, latitude: true, longitude: true,
          metropolisId: true,
        },
      }),
      prisma.parish.count({ where }),
    ]);

    return reply.send({
      data: parishes,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  });

  // GET /parishes/:id
  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const cacheKey = `parish:${id}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) return reply.send(JSON.parse(cached));

    const parish = await prisma.parish.findUnique({
      where: { id },
      include: {
        metropolis: true,
        clergy: {
          orderBy: { fullName: "asc" },
          select: { id: true, title: true, fullName: true, email: true, phone: true },
        },
      },
    });

    if (!parish) return reply.status(404).send({ error: "Parish not found" });

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(parish)).catch(() => {});
    return reply.send(parish);
  });

  // GET /parishes/:id/clergy
  app.get("/:id/clergy", async (req, reply) => {
    const { id } = req.params as { id: string };
    const clergy = await prisma.clergy.findMany({
      where: { parishId: id },
      orderBy: { fullName: "asc" },
    });
    return reply.send({ data: clergy });
  });
}
