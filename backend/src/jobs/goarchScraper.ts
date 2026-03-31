/**
 * goarch.org Parish Scraper
 *
 * Scrapes parish and clergy data from the Greek Orthodox Archdiocese of America
 * website and upserts it into the local database.
 *
 * Legal note: Review goarch.org Terms of Service before production use.
 * Explore a formal data partnership to ensure compliance.
 *
 * Run schedule: daily at 2:00 AM UTC
 */

import * as cheerio from "cheerio";
import { prisma } from "../config/db";

const BASE_URL = "https://www.goarch.org";
const PARISH_LIST_URL = `${BASE_URL}/parishes`;
const FETCH_DELAY_MS = 1500; // be polite to the server

interface ScrapedParish {
  goarchId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  rawData: Record<string, unknown>;
}

interface ScrapedClergy {
  goarchClergyId?: string;
  title?: string;
  fullName: string;
  email?: string;
  phone?: string;
}

async function fetchWithDelay(url: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, FETCH_DELAY_MS));
  const res = await fetch(url, {
    headers: {
      "User-Agent": "HellenicDirectory/1.0 (contact: admin@hellenicdir.com)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseParishFromHtml(html: string, goarchId: string): Partial<ScrapedParish> {
  const $ = cheerio.load(html);

  // These selectors are approximate — update when goarch.org structure changes
  const name = $("h1.parish-title, h1.entry-title").first().text().trim();
  const address = $(".parish-address, address").first().text().replace(/\s+/g, " ").trim();
  const phone = $("a[href^='tel:']").first().attr("href")?.replace("tel:", "");
  const email = $("a[href^='mailto:']").first().attr("href")?.replace("mailto:", "");
  const website = $("a.parish-website, .parish-links a[target='_blank']").first().attr("href");

  // Parse city/state/zip from address
  const addressMatch = address.match(/(.+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
  const city = addressMatch?.[1]?.split(",").pop()?.trim();
  const state = addressMatch?.[2];
  const zip = addressMatch?.[3];

  // Clergy
  const clergy: ScrapedClergy[] = [];
  $(".clergy-item, .priest-info").each((_, el) => {
    const fullName = $(el).find(".clergy-name, .priest-name").text().trim();
    const title = $(el).find(".clergy-title, .priest-title").text().trim();
    const clergyEmail = $(el).find("a[href^='mailto:']").attr("href")?.replace("mailto:", "");
    if (fullName) clergy.push({ fullName, title, email: clergyEmail });
  });

  return {
    goarchId,
    name,
    address,
    city,
    state,
    zip,
    phone,
    email,
    website,
    rawData: { name, address, phone, email, website, clergy },
  };
}

export async function runGoarchScraper() {
  console.info("[GoarchScraper] Starting scrape run...");
  let upserted = 0;
  let errors = 0;

  try {
    const listHtml = await fetchWithDelay(PARISH_LIST_URL);
    const $ = cheerio.load(listHtml);

    // Collect parish links — selector will vary based on actual site structure
    const parishLinks: { url: string; id: string }[] = [];
    $("a[href*='/parishes/']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const match = href.match(/\/parishes\/([^/]+)/);
      if (match && match[1]) {
        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
        parishLinks.push({ url: fullUrl, id: match[1] });
      }
    });

    // Deduplicate
    const unique = Array.from(new Map(parishLinks.map((p) => [p.id, p])).values());
    console.info(`[GoarchScraper] Found ${unique.length} parish links`);

    for (const { url, id } of unique) {
      try {
        const html = await fetchWithDelay(url);
        const data = parseParishFromHtml(html, id);

        if (!data.name) continue;

        await prisma.parish.upsert({
          where: { goarchId: id },
          create: {
            goarchId: id,
            name: data.name!,
            address: data.address,
            city: data.city,
            state: data.state,
            zip: data.zip,
            phone: data.phone,
            email: data.email,
            website: data.website,
            rawData: data.rawData,
            lastScrapedAt: new Date(),
          },
          update: {
            name: data.name!,
            address: data.address,
            city: data.city,
            state: data.state,
            zip: data.zip,
            phone: data.phone,
            email: data.email,
            website: data.website,
            rawData: data.rawData,
            lastScrapedAt: new Date(),
          },
        });

        upserted++;
      } catch (err) {
        console.error(`[GoarchScraper] Error scraping ${url}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("[GoarchScraper] Fatal error:", err);
  }

  console.info(`[GoarchScraper] Done. Upserted: ${upserted}, Errors: ${errors}`);
}
