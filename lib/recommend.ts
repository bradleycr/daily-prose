import { wikipediaLinkFor } from "./biography";
import { centuryFor } from "./century";
import { classifyForm } from "./form";
import { getCanonAuthors, getPoemsByAuthor } from "./poetrydb";
import type { AppState, ContemporaryPoem, DisplayPoem, LedgerEntry, SourceKind } from "./types";

type PickOptions = {
  forceSource?: SourceKind;
  sessionSeen?: string[];
};

export async function pickPoem(
  state: AppState,
  options: PickOptions = {},
): Promise<DisplayPoem | null> {
  const seen = new Set([...state.prefs.seenPoemKeys, ...(options.sessionSeen ?? [])]);
  const source = options.forceSource ?? chooseSource(state);

  if (source === "contemporary") {
    const contemporary = await pickContemporary(seen);
    if (contemporary) return contemporary;
  }

  return pickCanon(state, seen);
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

function chooseSource(state: AppState): SourceKind {
  const canon = state.prefs.sourceScores.canon;
  const contemporary = state.prefs.sourceScores.contemporary;
  const pCanon = sigmoid(canon - contemporary);

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

    return {
      key,
      title: poem.title,
      author: poem.author,
      source: "contemporary",
      htmlBody: poem.htmlBody,
      poemUrl: poem.poemUrl,
      authorUrl: poem.authorUrl,
      copyright: poem.copyright,
    };
  } catch {
    return null;
  }
}

async function pickCanon(state: AppState, seen: Set<string>): Promise<DisplayPoem | null> {
  const authors = await getCanonAuthors();
  const sampledAuthors = sampleAuthors(authors, state, 8);
  const candidates: DisplayPoem[] = [];

  for (const author of sampledAuthors) {
    const poems = await getPoemsByAuthor(author);

    for (const poem of poems) {
      const lineCount = Number(poem.linecount || poem.lines.length);
      const key = poemKey("canon", poem.author, poem.title);

      if (seen.has(key) || lineCount < 4 || lineCount > 80) continue;

      candidates.push({
        key,
        title: poem.title,
        author: poem.author,
        source: "canon",
        lines: poem.lines,
        poemUrl: `https://poetrydb.org/author/${encodeURIComponent(poem.author)}`,
        authorUrl: wikipediaLinkFor(poem.author),
      });
    }
  }

  return scoreCandidates(candidates, state)[0] ?? null;
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
