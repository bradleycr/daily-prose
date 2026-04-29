import * as cheerio from "cheerio";
import { fetchPoetsOrgPoemPage } from "./poetsorgDiscover";
import type { ContemporaryPoem } from "./types";

const POETS_ORG = "https://poets.org";
const CACHE_MS = 6 * 60 * 60 * 1000;

let cached: {
  expiresAt: number;
  poem: ContemporaryPoem | null;
} | null = null;

export async function fetchTodaysContemporary(): Promise<ContemporaryPoem | null> {
  if (cached && cached.expiresAt > Date.now()) return cached.poem;

  try {
    const response = await fetch(`${POETS_ORG}/poem-a-day`, {
      headers: {
        "User-Agent": "Daily Prose / personal reader",
        Accept: "text/html",
      },
      next: { revalidate: 21_600 },
    });

    if (!response.ok) throw new Error("poets.org unavailable");

    const html = await response.text();
    const poemUrl = resolveFeaturedPoemUrlFromPoemADay(html);
    if (!poemUrl) throw new Error("poem-a-day_parse_failed");

    const poem = await fetchPoetsOrgPoemPage(poemUrl);
    cached = { expiresAt: Date.now() + CACHE_MS, poem };
    return poem;
  } catch {
    cached = { expiresAt: Date.now() + 10 * 60 * 1000, poem: null };
    return null;
  }
}

function resolveFeaturedPoemUrlFromPoemADay(html: string): string | null {
  const $ = cheerio.load(html);

  // poets.org redesign: `/poem-a-day` is often a hub page; the actual poem is linked from `/poem/...`.
  const scored: Array<{ url: string; score: number }> = [];

  $("a[href*='/poem/']").each((_, el) => {
    const href = String($(el).attr("href") ?? "").trim();
    if (!href) return;

    const normalized = href.startsWith("http") ? href : absoluteUrl(href);
    if (!normalized.startsWith(`${POETS_ORG}/poem/`)) return;
    if (normalized.includes("/print") || normalized.includes("/embed")) return;

    const label = cleanText($(el).text());
    const score = label.length; // hub pages usually include a real title on the primary poem link.

    scored.push({ url: normalized, score });
  });

  scored.sort((a, b) => b.score - a.score);

  const byUrl = new Map<string, number>();
  for (const item of scored) {
    byUrl.set(item.url, Math.max(byUrl.get(item.url) ?? 0, item.score));
  }

  const unique = [...byUrl.entries()].sort((a, b) => b[1] - a[1]);
  const strong = unique.find(([, score]) => score >= 8)?.[0];
  if (strong) return strong;

  return unique[0]?.[0] ?? null;
}

function absoluteUrl(href: string): string {
  return href.startsWith("http") ? href : `${POETS_ORG}${href.startsWith("/") ? "" : "/"}${href}`;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
