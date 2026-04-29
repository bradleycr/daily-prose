import * as cheerio from "cheerio";
import { sanitizePoemHtml } from "./poetsorgHtml";
import { fetchPoetsOrgPoemPage } from "./poetsorgDiscover";
import { earliestYearInText, isYearRecentEnough } from "./poetsorgYear";
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

    // Fast path: the landing page embeds today's poem (no extra network hop).
    const embedded = parseTodaysPoemFromPoemADayHub(html);
    if (embedded) {
      cached = { expiresAt: Date.now() + CACHE_MS, poem: embedded };
      return embedded;
    }

    // Fallback: older hub layouts that only link out to `/poem/...`.
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

function parseTodaysPoemFromPoemADayHub(html: string): ContemporaryPoem | null {
  const $ = cheerio.load(html);

  const article = $("#block-views-block-poem-a-day-landing-page-current-poem article, .daily-poem__poem article").first();
  if (!article.length) return null;

  const titleLink = article.find("h2 a, h3 a").first();
  const title = cleanText(titleLink.text() || article.attr("data-poem-title") || "");
  const poemHref = titleLink.attr("href")?.trim();
  if (!title || !poemHref) return null;

  const bodyNode = article.find(".daily-poem__poem-text .field--body, .poem__body .field--body, .field--body").first();
  if (!bodyNode.length) return null;

  const authorLink = $(".poem-a-day__poem-author a[href^='/poet/'], .poem-a-day__poem-author a[itemprop='name']")
    .first();
  const author = cleanText(authorLink.text());
  if (!author) return null;

  const copyright = cleanText(article.find(".field--field_credit, .field--name-field-copyright, .copyright").first().text());

  const yearSignal = earliestYearInText(
    [copyright, cleanText(bodyNode.text()), cleanText($('script[type="application/ld+json"]').first().text())].join("\n"),
  );
  if (typeof yearSignal === "number" && !isYearRecentEnough(yearSignal)) {
    return null;
  }

  return {
    title,
    author,
    htmlBody: sanitizePoemHtml(bodyNode.html() ?? ""),
    poemUrl: absoluteUrl(poemHref),
    authorUrl: absoluteUrl(authorLink.attr("href") ?? `/poet/${slugify(author)}`),
    copyright,
    source: "poets.org",
  };
}

function resolveFeaturedPoemUrlFromPoemADay(html: string): string | null {
  const $ = cheerio.load(html);

  // poets.org redesign: `/poem-a-day` is often a hub page; the actual poem is linked from `/poem/...`.
  const scored: Array<{ url: string; score: number }> = [];

  $("#block-views-block-poem-a-day-landing-page-current-poem a[href^='/poem/']").each((_, el) => {
    const href = String($(el).attr("href") ?? "").trim();
    if (!href) return;

    const normalized = href.startsWith("http") ? href : absoluteUrl(href);
    if (!normalized.startsWith(`${POETS_ORG}/poem/`)) return;
    if (normalized.includes("/print") || normalized.includes("/embed")) return;

    const label = cleanText($(el).text());
    const score = label.length;

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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}
