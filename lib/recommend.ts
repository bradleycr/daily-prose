import { wikipediaLinkFor } from "./biography";
import { centuryFor } from "./century";
import { classifyForm } from "./form";
import { earliestYearInText, minRecentPoetsOrgYear } from "./poetsorgYear";
import { getCanonAuthors, getPoemsByAuthor } from "./poetrydb";
import type { AppState, ContemporaryPoem, DisplayPoem, LedgerEntry, SourceKind } from "./types";

type PickOptions = {
  forceSource?: SourceKind;
  sessionSeen?: string[];
};

export type PickResult = {
  poem: DisplayPoem | null;
  tasteUpdate?: string;
  rationale?: string;
};

export async function pickPoem(
  state: AppState,
  options: PickOptions = {},
): Promise<PickResult> {
  const seen = new Set([...state.prefs.seenPoemKeys, ...(options.sessionSeen ?? [])]);
  const source = options.forceSource ?? chooseSource(state);

  if (source === "contemporary") {
    // poets.org can occasionally fail or repeat; try twice before falling back.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const contemporary = await pickContemporary(seen);
      if (contemporary) return { poem: contemporary };
    }
  }

  const allowOlderCanon = Math.random() < 0.02; // "once in a blue moon"
  const candidates = await pickCanonCandidates(state, seen, { allowOlderCanon });
  if (!candidates.length) return { poem: null };

  const curated = await tryCuratePick(candidates, state);
  if (curated) return curated;

  return { poem: scoreCandidates(candidates, state)[0] ?? null };
}

export function updatePreferenceForEntry(
  state: AppState,
  entry: LedgerEntry,
  direction: "keep" | "dismiss",
): AppState {
  const authorDelta = direction === "keep" ? 2 : -1;
  const traitDelta = direction === "keep" ? 1 : -0.5;
  const lineCount = entry.lines?.length ?? 24;
  const form = classifyForm(lineCount);
  const century = entry.source === "contemporary" ? "2000s" : centuryFor(entry.author);

  return {
    ...state,
    prefs: {
      ...state.prefs,
      authorScores: {
        ...state.prefs.authorScores,
        [entry.author]: (state.prefs.authorScores[entry.author] ?? 0) + authorDelta,
      },
      formScores: {
        ...state.prefs.formScores,
        [form]: (state.prefs.formScores[form] ?? 0) + traitDelta,
      },
      centuryScores: {
        ...state.prefs.centuryScores,
        [century]: (state.prefs.centuryScores[century] ?? 0) + traitDelta,
      },
      sourceScores: {
        ...state.prefs.sourceScores,
        [entry.source]: (state.prefs.sourceScores[entry.source] ?? 0) + traitDelta,
      },
      seenPoemKeys: unique([...state.prefs.seenPoemKeys, entry.key]),
    },
  };
}

export function applyFeedbackDelta(
  state: AppState,
  entry: LedgerEntry,
  deltaLikes: number,
): AppState {
  if (deltaLikes === 0) return state;

  const lineCount = entry.lines?.length ?? 24;
  const form = classifyForm(lineCount);
  const century = entry.source === "contemporary" ? "2000s" : centuryFor(entry.author);

  const authorDelta = deltaLikes * 1.6;
  const traitDelta = deltaLikes * 0.9;

  return {
    ...state,
    prefs: {
      ...state.prefs,
      authorScores: {
        ...state.prefs.authorScores,
        [entry.author]: (state.prefs.authorScores[entry.author] ?? 0) + authorDelta,
      },
      formScores: {
        ...state.prefs.formScores,
        [form]: (state.prefs.formScores[form] ?? 0) + traitDelta,
      },
      centuryScores: {
        ...state.prefs.centuryScores,
        [century]: (state.prefs.centuryScores[century] ?? 0) + traitDelta,
      },
      sourceScores: {
        ...state.prefs.sourceScores,
        [entry.source]: (state.prefs.sourceScores[entry.source] ?? 0) + traitDelta,
      },
      seenPoemKeys: unique([...state.prefs.seenPoemKeys, entry.key]),
    },
  };
}

function chooseSource(state: AppState): SourceKind {
  const canon = state.prefs.sourceScores.canon;
  const contemporary = state.prefs.sourceScores.contemporary;
  const preference = sigmoid(canon - contemporary); // 0..1
  const baseCanon = 0.03;
  const pCanon = Math.min(0.12, Math.max(0.01, baseCanon + preference * 0.06));

  return Math.random() < pCanon ? "canon" : "contemporary";
}

async function pickContemporary(seen: Set<string>): Promise<DisplayPoem | null> {
  try {
    const response = await fetch("/api/contemporary", { headers: { Accept: "application/json" } });
    if (!response.ok) return null;

    const data = (await response.json()) as { poem: ContemporaryPoem | null };
    if (!data.poem) return null;

    const poem = data.poem;
    const key = poemKey("contemporary", poem.author, poem.title);
    if (seen.has(key)) return null;

    const publishedYear = yearFromCopyright(poem.copyright);
    // If we can infer a year from copyright, enforce the recency window strictly.
    // If we can't infer a year, we still allow the poem (poets.org is overwhelmingly contemporary),
    // but we avoid obviously old republications when the copyright line includes a year.
    if (typeof publishedYear === "number" && publishedYear < minRecentPoetsOrgYear()) {
      return null;
    }

    return {
      key,
      title: poem.title,
      author: poem.author,
      source: "contemporary",
      publishedYear,
      htmlBody: poem.htmlBody,
      poemUrl: poem.poemUrl,
      authorUrl: poem.authorUrl,
      copyright: poem.copyright,
    };
  } catch {
    return null;
  }
}

function yearFromCopyright(copyright: string | undefined): number | undefined {
  if (!copyright) return undefined;
  const year = earliestYearInText(copyright);
  return typeof year === "number" ? year : undefined;
}

function authorCenturyStart(author: string): number {
  const century = centuryFor(author); // e.g. "1800s"
  const match = century.match(/^(\d{3})0s$/);
  if (!match) return 1900;
  return Number(match[1]) * 100;
}

async function pickCanonCandidates(
  state: AppState,
  seen: Set<string>,
  options: { allowOlderCanon: boolean },
): Promise<DisplayPoem[]> {
  const authors = await getCanonAuthors();
  const modernOnly = options.allowOlderCanon
    ? authors
    : authors.filter((author) => {
        // Approximate "recent" for canon via author-era buckets from `centuryFor`.
        // Keep 1800s+ by default (still old poetry, but matches "last ~150 years" much better than 1500s/1600s).
        return authorCenturyStart(author) >= 1800;
      });

  const sampledAuthors = sampleAuthors(modernOnly.length ? modernOnly : authors, state, 22);
  const candidates: DisplayPoem[] = [];

  // Fetch several authors in parallel, stop as soon as we have enough options.
  await mapLimit(sampledAuthors, 5, async (author) => {
    if (candidates.length >= 26) return;

    const poems = await getPoemsByAuthor(author);
    if (!poems.length) return;

    // Avoid scanning huge payloads end-to-end: sample a slice after shuffling indices.
    const picks = sampleIndices(poems.length, Math.min(42, poems.length));
    for (const index of picks) {
      const poem = poems[index];
      const lineCount = Number(poem.linecount || poem.lines.length);
      const key = poemKey("canon", poem.author, poem.title);

      if (seen.has(key) || lineCount < 4 || lineCount > 80) continue;

      candidates.push({
        key,
        title: poem.title,
        author: poem.author,
        source: "canon",
        lines: poem.lines,
        // PoetryDB is an API (JSON), not a reader-friendly poem page.
        // Link out to a human-readable search destination instead.
        poemUrl: `https://www.poetryfoundation.org/search?query=${encodeURIComponent(`${poem.title} ${poem.author}`)}`,
        authorUrl: wikipediaLinkFor(poem.author),
      });

      if (candidates.length >= 26) return;
    }
  });

  return candidates;
}

async function tryCuratePick(
  candidates: DisplayPoem[],
  state: AppState,
): Promise<PickResult | null> {
  try {
    // Only curate when we have a real pool to choose from.
    if (candidates.length < 4) return null;

    const history = state.ledger.slice(0, 120).map((entry) => ({
      id: entry.key,
      status: entry.likes > 0 ? "liked" : "neutral",
    }));

    const payload = {
      candidates: candidates.slice(0, 18).map((poem) => ({
        id: poem.key,
        title: poem.title,
        author: poem.author,
        source: poem.source,
        text: poem.htmlBody ? stripHtmlClient(poem.htmlBody) : (poem.lines ?? []).join("\n"),
      })),
      history,
      tasteProfile: state.prefs.tasteProfile ?? "",
      tasteAnchors: (state.prefs.tasteAnchors ?? []).slice(0, 12),
    };

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1400);

    const response = await fetch("/api/curate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    window.clearTimeout(timeout);

    if (!response.ok) return null;
    const data = (await response.json()) as { selectedId: string; rationale: string; tasteUpdate: string };
    const selected = candidates.find((poem) => poem.key === data.selectedId) ?? null;
    if (!selected) return null;

    return {
      poem: selected,
      rationale: data.rationale,
      tasteUpdate: typeof data.tasteUpdate === "string" ? data.tasteUpdate.trim() : "",
    };
  } catch {
    return null;
  }
}

function stripHtmlClient(html: string): string {
  const element = document.createElement("div");
  element.innerHTML = html.replaceAll("<br>", "\n").replaceAll("</p>", "\n\n");
  return element.textContent?.trim() ?? "";
}

async function mapLimit<T>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
}

function sampleIndices(max: number, count: number): number[] {
  const indices = Array.from({ length: max }, (_, index) => index);

  // Fisher–Yates, but we only need the first `count`.
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(Math.random() * (max - i));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, count);
}

function sampleAuthors(authors: string[], state: AppState, count: number): string[] {
  const pool = [...authors];
  const picked: string[] = [];

  while (pool.length > 0 && picked.length < count) {
    const weights = pool.map((author) => Math.max(0.15, 1 + (state.prefs.authorScores[author] ?? 0)));
    const index = weightedIndex(weights);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }

  return picked;
}

function scoreCandidates(candidates: DisplayPoem[], state: AppState): DisplayPoem[] {
  return candidates
    .map((poem) => {
      const lineCount = poem.lines?.length ?? 24;
      const form = classifyForm(lineCount);
      const century = centuryFor(poem.author);
      const score =
        (state.prefs.authorScores[poem.author] ?? 0) +
        (state.prefs.formScores[form] ?? 0) +
        (state.prefs.centuryScores[century] ?? 0) +
        Math.random() * 0.75;

      return { poem, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ poem }) => poem);
}

function weightedIndex(weights: number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.random() * total;

  for (let index = 0; index < weights.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return index;
  }

  return weights.length - 1;
}

function poemKey(source: SourceKind, author: string, title: string): string {
  return `${source}::${author}::${title}`;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
