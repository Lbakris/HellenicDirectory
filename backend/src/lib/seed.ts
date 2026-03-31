/**
 * Database seed — creates the app owner account and sample data.
 * Run with: npx tsx src/lib/seed.ts
 */

import bcrypt from "bcrypt";
import { prisma } from "../config/db";

async function seed() {
  console.info("[Seed] Starting...");

  // App owner
  const ownerEmail = process.env.APP_OWNER_EMAIL ?? "admin@hellenicdir.com";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordHash: await bcrypt.hash(ownerPassword, 12),
      fullName: "App Owner",
      appRole: "OWNER",
      emailVerifiedAt: new Date(),
    },
  });
  console.info(`[Seed] Owner account: ${ownerEmail}`);

  // Sample organizations
  const orgs = ["AHEPA", "Daughters of Penelope", "Philoptochos", "GOYA", "Greek Orthodox Youth"];
  for (const name of orgs) {
    await prisma.organization.upsert({
      where: { id: name },
      update: {},
      create: { id: name, name },
    }).catch(() =>
      prisma.organization.upsert({
        where: { name } as any,
        update: {},
        create: { name },
      })
    );
  }
  console.info("[Seed] Organizations created");

  // Sample parish (for dev/testing)
  await prisma.parish.upsert({
    where: { goarchId: "sample-parish-001" },
    update: {},
    create: {
      goarchId: "sample-parish-001",
      name: "Holy Trinity Greek Orthodox Church",
      address: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
      phone: "(212) 555-0100",
      email: "info@holytrinitynyc.org",
      website: "https://holytrinitynyc.org",
      latitude: 40.7128,
      longitude: -74.006,
      rawData: {},
      lastScrapedAt: new Date(),
    },
  });
  console.info("[Seed] Sample parish created");

  console.info("[Seed] Done");
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
