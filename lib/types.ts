export type SourceKind = "canon" | "contemporary";

export type PoemStatus = "kept" | "dismissed" | "unread";

export type FormKind = "sonnet" | "short" | "medium" | "long";

export type CanonPoem = {
  title: string;
  author: string;
  lines: string[];
  linecount: string;
};

export type ContemporaryPoem = {
  title: string;
  author: string;
  htmlBody: string;
  poemUrl: string;
  authorUrl: string;
  copyright: string;
  source: "poets.org";
};

export type DisplayPoem = {
  key: string;
  title: string;
  author: string;
  source: SourceKind;
  publishedYear?: number;
  lines?: string[];
  htmlBody?: string;
  poemUrl: string;
  authorUrl: string;
  copyright?: string;
};

export type UserPreferences = {
  authorScores: Record<string, number>;
  formScores: Record<FormKind, number>;
  centuryScores: Record<string, number>;
  sourceScores: Record<SourceKind, number>;
  seenPoemKeys: string[];
  tasteProfile?: string;
  tasteAnchors?: TasteAnchor[];
};

export type TasteAnchor = {
  id: string;
  title?: string;
  author?: string;
  text: string;
  createdAt: string; // ISO
};

export type LedgerEntry = {
  key: string;
  date: string;
  title: string;
  author: string;
  source: SourceKind;
  status: PoemStatus;
  likes: number; // 0..3
  publishedYear?: number;
  lines?: string[];
  poemUrl?: string;
  authorUrl?: string;
  copyright?: string;
};

export type AppState = {
  prefs: UserPreferences;
  ledger: LedgerEntry[];
  todaySlot: {
    date: string;
    entryKey: string;
  } | null;
  installHintDismissed: boolean;
  schemaVersion: 1;
};
