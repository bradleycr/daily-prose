import { CANON_POETS } from "./canon";
import type { CanonPoem } from "./types";

const AUTHOR_CACHE_KEY = "dailyProse:verifiedAuthors:v1";
const AUTHOR_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const authorPoemCache = new Map<string, CanonPoem[]>();

type CachedAuthors = {
  expiresAt: number;
  authors: string[];
};

export async function getCanonAuthors(): Promise<string[]> {
  const cached = readAuthorCache();
  if (cached) return cached;

  try {
    const response = await fetch("https://poetrydb.org/author", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("author index unavailable");

    const data = (await response.json()) as { authors?: string[] };
    const available = new Set(data.authors ?? []);
    const authors = CANON_POETS.filter((name) => available.has(name));

    if (authors.length > 0) {
      writeAuthorCache(authors);
      return authors;
    }
  } catch {
    // The seed list is good enough for a quiet offline-ish fallback.
  }

  return [...CANON_POETS];
}

export async function getPoemsByAuthor(author: string): Promise<CanonPoem[]> {
  const cached = authorPoemCache.get(author);
  if (cached) return cached;

  const response = await fetch(`https://poetrydb.org/author/${encodeURIComponent(author)}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as CanonPoem[] | { status?: number; reason?: string };
  const poems = Array.isArray(data) ? data : [];
  authorPoemCache.set(author, poems);

  return poems;
}

function readAuthorCache(): string[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTHOR_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedAuthors;
    if (parsed.expiresAt < Date.now()) return null;
    return parsed.authors;
  } catch {
    return null;
  }
}

function writeAuthorCache(authors: string[]): void {
  if (typeof window === "undefined") return;

  const cached: CachedAuthors = {
    expiresAt: Date.now() + AUTHOR_CACHE_TTL,
    authors,
  };

  window.localStorage.setItem(AUTHOR_CACHE_KEY, JSON.stringify(cached));
}
