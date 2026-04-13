/**
 * goarch.org Parish Scraper
 *
 * Scrapes parish and clergy data from the Greek Orthodox Archdiocese of America
 * website and upserts it into the local database.
 *
 * Legal note: Review goarch.org Terms of Service before production use.
 * A formal data partnership or licensing agreement is strongly recommended
 * to ensure long-term compliance. All fetched data is attributed to goarch.org
 * in the rawData field.
 *
 * Run schedule: daily at 2:00 AM UTC (configured in server.ts).
 *
 * Reliability features:
 *  - Per-request timeout via AbortController (15 s default).
 *  - Circuit breaker: aborts the run after MAX_CONSECUTIVE_ERRORS consecutive
 *    individual-parish failures to prevent runaway error storms.
 *  - Polite crawl delay of 1.5 s between requests.
 */

import * as cheerio from "cheerio";
import { prisma } from "../config/db";

const BASE_URL = "https://www.goarch.org";
const PARISH_LIST_URL = `${BASE_URL}/parishes`;
/** Delay between requests in milliseconds — be polite to goarch.org servers. */
const FETCH_DELAY_MS = 1_500;
/** Per-request network timeout in milliseconds. */
const FETCH_TIMEOUT_MS = 15_000;
/** Number of consecutive per-parish errors that trigger the circuit breaker. */
const MAX_CONSECUTIVE_ERRORS = 5;

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

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

/**
 * Fetches a URL with a polite delay and a hard timeout.
 * Uses AbortController to cancel the request if the server does not respond
 * within FETCH_TIMEOUT_MS — preventing the scraper from hanging indefinitely.
 *
 * @throws Error on non-2xx response or network timeout.
 */
async function fetchWithDelay(url: string): Promise<string> {
  await new Promise<void>((resolve) => setTimeout(resolve, FETCH_DELAY_MS));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Identify the bot with contact info per goarch.org attribution requirements.
        "User-Agent":
          "HellenicDirectory/1.0 (https://hellenicdir.com; contact: admin@hellenicdir.com; data attributed to goarch.org)",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── HTML parsing ─────────────────────────────────────────────────────────────

/**
 * Parses a goarch.org parish detail page into a structured object.
 * Selectors are approximate — update them if the site structure changes.
 */
function parseParishFromHtml(html: string, goarchId: string): Partial<ScrapedParish> {
  const $ = cheerio.load(html);

  const name = $("h1.parish-title, h1.entry-title").first().text().trim();
  const address = $(".parish-address, address").first().text().replace(/\s+/g, " ").trim();
  const phone = $("a[href^='tel:']").first().attr("href")?.replace("tel:", "");
  const email = $("a[href^='mailto:']").first().attr("href")?.replace("mailto:", "");
  const website = $("a.parish-website, .parish-links a[target='_blank']").first().attr("href");

  // Parse city/state/zip from the address line (US format: "City, ST XXXXX").
  const addressMatch = address.match(/(.+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
  const city = addressMatch?.[1]?.split(",").pop()?.trim();
  const state = addressMatch?.[2];
  const zip = addressMatch?.[3];

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
    rawData: {
      source: "goarch.org",
      attribution: "Data sourced from goarch.org",
      name,
      address,
      phone,
      email,
      website,
      clergy,
    },
  };
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

/**
 * Fetches all parish links from the GOARCH parish listing page, then scrapes
 * each parish detail page and upserts the result into the database.
 *
 * A circuit breaker halts the run after MAX_CONSECUTIVE_ERRORS consecutive
 * individual failures to avoid flooding logs or the target server.
 */
export async function runGoarchScraper() {
  console.info("[GoarchScraper] Starting scrape run...");
  let upserted = 0;
  let errors = 0;
  let consecutiveErrors = 0;

  try {
    const listHtml = await fetchWithDelay(PARISH_LIST_URL);
    const $ = cheerio.load(listHtml);

    // Collect all parish detail links. Selector will vary with site structure.
    const parishLinks: { url: string; id: string }[] = [];
    $("a[href*='/parishes/']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const match = href.match(/\/parishes\/([^/]+)/);
      if (match?.[1]) {
        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
        parishLinks.push({ url: fullUrl, id: match[1] });
      }
    });

    // Deduplicate by goarchId.
    const unique = Array.from(new Map(parishLinks.map((p) => [p.id, p])).values());
    console.info(`[GoarchScraper] Found ${unique.length} parish links`);

    for (const { url, id } of unique) {
      // Circuit breaker: abort the run to avoid cascading failures.
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(
          `[GoarchScraper] Circuit breaker triggered after ${MAX_CONSECUTIVE_ERRORS} consecutive errors — aborting run`
        );
        break;
      }

      try {
        const html = await fetchWithDelay(url);
        const data = parseParishFromHtml(html, id);

        if (!data.name) {
          console.warn(`[GoarchScraper] No parish name parsed for ${url} — skipping`);
          consecutiveErrors++;
          continue;
        }
        if (!data.address || !data.city) {
          console.warn(
            `[GoarchScraper] Incomplete location data for "${data.name}" (${url}) — ` +
            `address=${data.address ?? "missing"}, city=${data.city ?? "missing"} — skipping upsert`
          );
          consecutiveErrors++;
          continue;
        }

        await prisma.parish.upsert({
          where: { goarchId: id },
          create: {
            goarchId: id,
            name: data.name,
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
            name: data.name,
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
        consecutiveErrors = 0; // Reset on success.
      } catch (err) {
        console.error(`[GoarchScraper] Error scraping ${url}:`, err);
        errors++;
        consecutiveErrors++;
      }
    }
  } catch (err) {
    console.error("[GoarchScraper] Fatal error fetching parish list:", err);
  }

  console.info(`[GoarchScraper] Done. Upserted: ${upserted}, Errors: ${errors}`);
}
