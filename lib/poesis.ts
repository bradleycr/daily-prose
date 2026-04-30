import { earliestYearInText, minRecentPoetsOrgYear } from "./poetsorgYear";
import type { ContemporaryPoem } from "./types";

type PoesisPoem = {
  _id?: string;
  title?: string;
  lines?: string[];
  slug?: string;
  language?: string;
  published?: string;
  author?: { name?: string; slug?: string };
  source?: { license?: string; link?: string; name?: string; modified?: boolean };
};

const POESIS = "https://poesis.davidweis.eu";

export async function fetchPoesisRandomPoem(options?: { language?: "en" | "fr" | "de" }): Promise<ContemporaryPoem | null> {
  const url = new URL(`${POESIS}/data/random-poem`);
  url.searchParams.set("language", options?.language ?? "en");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as PoesisPoem;
    const title = (data.title ?? "").trim();
    const author = (data.author?.name ?? "").trim();
    const lines = Array.isArray(data.lines) ? data.lines : [];
    if (!title || !author || lines.length < 2) return null;

    const publishedYear = earliestYearInText(data.published ?? "");
    if (typeof publishedYear === "number" && publishedYear < minRecentPoetsOrgYear()) return null;

    const authorSlug = (data.author?.slug ?? "").trim();
    const poemSlug = (data.slug ?? "").trim();
    const poemUrl = authorSlug && poemSlug ? `${POESIS}/${authorSlug}/poem/${poemSlug}` : POESIS;
    const authorUrl = authorSlug ? `${POESIS}/${authorSlug}` : POESIS;

    const license = data.source?.license?.trim() || "CC BY-SA 4.0";
    const sourceLine = data.source?.link ? ` · source: ${data.source.link}` : "";

    return {
      title,
      author,
      htmlBody: linesToHtml(lines),
      poemUrl,
      authorUrl,
      copyright: `${license}${sourceLine}`,
      source: "poesis",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function linesToHtml(lines: string[]): string {
  const escaped = lines.map((line) => escapeHtml(line));
  // Preserve line breaks; keep markup minimal + consistent with our sanitizer allowlist.
  return `<p>${escaped.join("<br>")}</p>`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

