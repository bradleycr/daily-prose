"use client";

import type { AppState, DisplayPoem, LedgerEntry, SourceKind } from "./types";

const STORAGE_KEY = "dailyProse:state:v1";

export function defaultState(): AppState {
  return {
    prefs: {
      authorScores: {},
      formScores: {
        sonnet: 0,
        short: 0,
        medium: 0,
        long: 0,
      },
      centuryScores: {},
      sourceScores: {
        canon: 0,
        contemporary: 1,
      },
      seenPoemKeys: [],
      tasteProfile:
        "prefers contemporary, genre-bending work with emotional precision. tends to dislike conventional love poems. likes: rumi (you wake the dead to life), charles bukowski, rainer maria rilke, emily dickinson, and some shakespeare sonnets (esp. sonnet 60).",
      tasteAnchors: [],
    },
    ledger: [],
    todaySlot: null,
    installHintDismissed: false,
    schemaVersion: 1,
  };
}

export function getState(): AppState {
  if (typeof window === "undefined") return defaultState();

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState();

    const parsed = JSON.parse(stored) as Partial<AppState>;
    if (parsed.schemaVersion !== 1) return defaultState();

    return {
      ...defaultState(),
      ...parsed,
      ledger: (parsed.ledger ?? []).map((entry) => ({
        ...entry,
        likes: typeof entry.likes === "number" ? entry.likes : entry.status === "kept" ? 1 : 0,
        dislikes: typeof entry.dislikes === "number" ? entry.dislikes : entry.status === "dismissed" ? 1 : 0,
      })),
      prefs: {
        ...defaultState().prefs,
        ...parsed.prefs,
        formScores: {
          ...defaultState().prefs.formScores,
          ...parsed.prefs?.formScores,
        },
        sourceScores: {
          ...defaultState().prefs.sourceScores,
          ...parsed.prefs?.sourceScores,
        },
        tasteProfile: parsed.prefs?.tasteProfile ?? defaultState().prefs.tasteProfile,
        tasteAnchors: Array.isArray(parsed.prefs?.tasteAnchors) ? parsed.prefs?.tasteAnchors : [],
      },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function todayKey(date = new Date()): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

export function entryFromPoem(poem: DisplayPoem, date: string): LedgerEntry {
  return {
    key: poem.key,
    date,
    title: poem.title,
    author: poem.author,
    source: poem.source,
    status: "unread",
    likes: 0,
    dislikes: 0,
    lines: poem.source === "canon" ? poem.lines : undefined,
    poemUrl: poem.poemUrl,
    authorUrl: poem.authorUrl,
    copyright: poem.copyright,
  };
}

export function displayFromEntry(entry: LedgerEntry): DisplayPoem {
  const movedText = "this poem has moved. read it at poets.org";

  return {
    key: entry.key,
    title: entry.title,
    author: entry.author,
    source: entry.source,
    lines: entry.source === "canon" ? entry.lines : [movedText],
    poemUrl: entry.poemUrl ?? sourceUrlFor(entry.source, entry.author),
    authorUrl: entry.authorUrl ?? "",
    copyright: entry.copyright,
  };
}

function sourceUrlFor(source: SourceKind, author: string): string {
  if (source === "contemporary") return "https://poets.org/poem-a-day";
  return `https://poetrydb.org/author/${encodeURIComponent(author)}`;
}
