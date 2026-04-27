import * as cheerio from "cheerio";
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
    const poem = parsePoemADay(html);
    cached = { expiresAt: Date.now() + CACHE_MS, poem };
    return poem;
  } catch {
    cached = { expiresAt: Date.now() + 10 * 60 * 1000, poem: null };
    return null;
  }
}

function parsePoemADay(html: string): ContemporaryPoem | null {
  const $ = cheerio.load(html);
  const titleLink = $(
    ".field--name-title a, h1 a, article h1 a, .view-poem-a-day h2 a",
  ).first();
  const titleNode = titleLink.length ? titleLink : $("h1, article h1, .field--name-title").first();
  const title = cleanText(titleNode.text());

  const poemHref =
    titleLink.attr("href") ??
    $("link[rel='canonical']").attr("href") ??
    $("meta[property='og:url']").attr("content");

  const authorLink = $(
    "a[href*='/poets/'], .field--name-field-author a, .poem-author a, article a[href*='/poets/']",
  ).first();
  const author = cleanText(authorLink.text());

  const bodyNode = $(
    ".field--name-field-poem-text, .poem__body, .poem-body, .field--name-body, article .field--type-text-with-summary",
  ).first();

  if (!title || !author || !poemHref || !bodyNode.length) return null;

  const copyright = cleanText(
    $(".field--name-field-copyright, .copyright, .poem-copyright").first().text(),
  );

  return {
    title,
    author,
    htmlBody: sanitizePoemHtml(bodyNode.html() ?? ""),
    poemUrl: absoluteUrl(poemHref),
    authorUrl: absoluteUrl(authorLink.attr("href") ?? `/poets/${slugify(author)}`),
    copyright,
    source: "poets.org",
  };
}

function sanitizePoemHtml(html: string): string {
  const $ = cheerio.load(html, null, false);
  const allowed = new Set(["em", "i", "br", "span", "p"]);

  $("*").each((_, element) => {
    const current = $(element);
    const tagName = String(current.prop("tagName") ?? "").toLowerCase();

    if (!allowed.has(tagName)) {
      current.replaceWith(current.html() ?? current.text());
      return;
    }

    const style = indentationStyle(current.attr("class") ?? "", current.text());
    for (const attr of Object.keys(current.attr() ?? {})) {
      current.removeAttr(attr);
    }
    if (style) current.attr("style", style);
  });

  return $.html().trim();
}

function indentationStyle(className: string, text: string): string {
  const classIndent = className.match(/indent-?(\d+)?/i)?.[1];
  const leadingSpaces = text.match(/^(\s+)/)?.[1]?.length ?? 0;
  const level = Number(classIndent ?? Math.min(leadingSpaces, 8));

  return level > 0 ? `padding-left:${Math.min(level, 8) * 0.75}em` : "";
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
