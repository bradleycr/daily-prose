import * as cheerio from "cheerio";
import type { ContemporaryPoem } from "@/lib/types";
import { googleCseSearch } from "@/lib/googleCse";
import { sanitizePoemHtml } from "@/lib/poetsorgHtml";
import { earliestYearInText, isYearRecentEnough } from "@/lib/poetsorgYear";

const POETS_ORG = "https://poets.org";

export async function fetchDiscoveredPoetsOrgPoem(seenKeys: Set<string>): Promise<ContemporaryPoem | null> {
  // We only ingest full text from poets.org (safe + consistent parsing).
  // Discovery is optional; without Google CSE env vars this will return null.
  const queries = [
    "site:poets.org/poem/ \"Poem\"",
    "site:poets.org/poem/ \"poem\"",
    "site:poets.org/poem/ \"excerpt\"",
  ];

  for (const q of shuffle(queries)) {
    const results = await googleCseSearch(q, { num: 10 });
    for (const r of shuffle(results)) {
      const url = normalizePoetsOrgUrl(r.link);
      if (!url) continue;

      const poem = await fetchPoetsOrgPoemPage(url);
      if (!poem) continue;

      const key = `contemporary::${poem.author}::${poem.title}`;
      if (seenKeys.has(key)) continue;

      return poem;
    }
  }

  return null;
}

function normalizePoetsOrgUrl(url: string): string | null {
  if (!url) return null;
  if (!url.startsWith("http")) return null;
  if (!url.includes("poets.org")) return null;
  if (!url.includes("/poem/")) return null;
  return url;
}

export async function fetchPoetsOrgPoemPage(url: string): Promise<ContemporaryPoem | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Daily Prose / personal reader",
        Accept: "text/html",
      },
      next: { revalidate: 21_600 },
    });
    if (!response.ok) return null;

    const html = await response.text();
    return parsePoetsOrgPoemPage(html, url);
  } catch {
    return null;
  }
}

function parsePoetsOrgPoemPage(html: string, url: string): ContemporaryPoem | null {
  const $ = cheerio.load(html);

  const modernRoot = $("article.card--poem-full").first();

  const title = cleanText(
    modernRoot.length
      ? modernRoot.find("h1").first().text()
      : $("h1, article h1, .field--name-title").first().text(),
  );

  const authorLink = modernRoot.length
    ? modernRoot.find("a[data-byline-author-name]").first().length
      ? modernRoot.find("a[data-byline-author-name]").first()
      : modernRoot.find(".field--field_author a[href^='/poet/']").first()
    : $("a[href*='/poets/'], .field--name-field-author a, .poem-author a, article a[href*='/poets/']").first();

  const author = cleanText(authorLink.text());

  const bodyNode = modernRoot.length
    ? modernRoot.find(".field--body").first()
    : $(".field--name-field-poem-text, .poem__body, .poem-body, article .field--type-text-with-summary, .field--name-body").first();

  if (!title || !author || !bodyNode.length) return null;

  const copyright = cleanText(
    modernRoot.length
      ? modernRoot.find(".field--field_credit, .field--name-field-copyright, .copyright, .poem-copyright").first().text()
      : $(".field--name-field-copyright, .copyright, .poem-copyright").first().text(),
  );

  const yearSignal = earliestYearInText(
    [
      copyright,
      cleanText(bodyNode.text()),
      cleanText($('script[type="application/ld+json"]').first().text()),
    ].join("\n"),
  );
  if (typeof yearSignal === "number" && !isYearRecentEnough(yearSignal)) {
    return null;
  }

  return {
    title,
    author,
    htmlBody: sanitizePoemHtml(bodyNode.html() ?? ""),
    poemUrl: url,
    authorUrl: absoluteUrl(authorLink.attr("href") ?? `/poets/${slugify(author)}`),
    copyright,
    source: "poets.org",
  };
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

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

