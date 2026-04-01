/**
 * Database seed — creates the app owner account and reference data.
 *
 * Run with: npx tsx src/lib/seed.ts
 *
 * Required environment variables:
 *   APP_OWNER_EMAIL        — owner account email
 *   SEED_OWNER_PASSWORD    — owner account password (min 12 chars, no default)
 *
 * The SEED_OWNER_PASSWORD variable has no fallback. Providing a default here
 * would risk shipping a known-password owner account to production.
 */

import bcrypt from "bcrypt";
import { prisma } from "../config/db";

async function seed() {
  console.info("[Seed] Starting...");

  // ── App owner account ──────────────────────────────────────────────────────
  const ownerEmail = process.env.APP_OWNER_EMAIL;
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;

  if (!ownerEmail) {
    console.error("[Seed] APP_OWNER_EMAIL is required");
    process.exit(1);
  }
  if (!ownerPassword || ownerPassword.length < 12) {
    console.error("[Seed] SEED_OWNER_PASSWORD is required and must be at least 12 characters");
    process.exit(1);
  }

  const now = new Date();
  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordHash: await bcrypt.hash(ownerPassword, 12),
      fullName: "App Owner",
      appRole: "OWNER",
      emailVerifiedAt: now,
      // Record implicit consent for the seed owner (required fields on model).
      privacyPolicyAcceptedAt: now,
      privacyPolicyVersion: "2024-01-01",
      termsAcceptedAt: now,
      sensitiveDataConsentAt: now,
    },
  });
  console.info(`[Seed] Owner account: ${ownerEmail}`);

  // ── Reference organizations ────────────────────────────────────────────────
  // Organization.name has a @unique constraint — use it as the upsert key so
  // this is idempotent on repeated runs without requiring the row's UUID.
  const orgNames = [
    "AHEPA",
    "Daughters of Penelope",
    "Philoptochos",
    "GOYA",
    "Greek Orthodox Youth",
  ];
  for (const name of orgNames) {
    await prisma.organization.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.info("[Seed] Organizations created");

  // ── Sample parish (development / smoke-testing only) ──────────────────────
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
