"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionPill } from "@/components/ActionPill";
import { InstallHint } from "@/components/InstallHint";
import { LedgerButton } from "@/components/LedgerButton";
import { LedgerPanel } from "@/components/LedgerPanel";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { MoreOverlay } from "@/components/MoreOverlay";
import { PoemView } from "@/components/PoemView";
import { TasteAnchorsOverlay } from "@/components/TasteAnchorsOverlay";
import { displayFromEntry, entryFromPoem, getState, saveState, todayKey } from "@/lib/storage";
import { applyFeedbackDelta, pickPoem } from "@/lib/recommend";
import type { AppState, DisplayPoem, LedgerEntry, SourceKind, TasteAnchor } from "@/lib/types";

export function DailyProseApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [todayPoem, setTodayPoem] = useState<DisplayPoem | null>(null);
  const [visiblePoem, setVisiblePoem] = useState<DisplayPoem | null>(null);
  const [archiveView, setArchiveView] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [anchorsOpen, setAnchorsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLiked, setShowLiked] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [busy, setBusy] = useState(true);
  const [curation, setCuration] = useState<{ mode: "curated" | "fallback"; rationale?: string; tasteUpdate?: string } | null>(
    null,
  );
  const [curatorEnabled, setCuratorEnabled] = useState<boolean | null>(null);
  const sessionSeenRef = useRef<string[]>([]);

  const date = useMemo(() => todayKey(), []);
  const dateLabel = useMemo(() => formatToday(date), [date]);
  const activeEntry = state?.ledger.find((entry) => entry.key === visiblePoem?.key);
  const likes = activeEntry?.likes ?? (activeEntry?.status === "kept" ? 1 : 0);

  const commitState = useCallback((next: AppState) => {
    setState(next);
    saveState(next);
  }, []);

  const chooseFreshPoem = useCallback(
    async (baseState: AppState, forceSource?: SourceKind) => {
      setBusy(true);
      setIsFading(true);

      const picked = await pickPoem(baseState, { forceSource, sessionSeen: sessionSeenRef.current });

      window.setTimeout(() => {
        if (!picked.poem) {
          setTodayPoem(null);
          setVisiblePoem(null);
          setBusy(false);
          setIsFading(false);
          return;
        }

        const poem = picked.poem;
        setCuration(
          picked.rationale?.trim()
            ? { mode: "curated", rationale: picked.rationale.trim(), tasteUpdate: picked.tasteUpdate?.trim() }
            : { mode: "fallback" },
        );
        const entry = entryFromPoem(poem, date);
        const nextState: AppState = {
          ...baseState,
          ledger: [entry, ...baseState.ledger.filter((item) => item.key !== entry.key)],
          todaySlot: { date, entryKey: entry.key },
          prefs: {
            ...baseState.prefs,
            seenPoemKeys: Array.from(new Set([...baseState.prefs.seenPoemKeys, entry.key])),
            tasteProfile: picked.tasteUpdate?.trim?.() ? picked.tasteUpdate.trim() : baseState.prefs.tasteProfile,
          },
        };

        commitState(nextState);
        setTodayPoem(poem);
        setVisiblePoem(poem);
        setArchiveView(false);
        setMoreOpen(false);
        setBusy(false);
        setIsFading(false);
      }, 260);
    },
    [commitState, date],
  );

  const readCuratorStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/curate/status", { headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const data = (await response.json()) as { enabled?: unknown };
      if (typeof data.enabled !== "boolean") return;
      setCuratorEnabled(data.enabled);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const boot = async () => {
      const stored = getState();
      const todaysEntry =
        stored.todaySlot?.date === date
          ? stored.ledger.find((entry) => entry.key === stored.todaySlot?.entryKey)
          : undefined;

      setState(stored);
      void syncAnchors(stored, commitState);
      void readCuratorStatus();

      if (todaysEntry) {
        const poem = await hydrateEntry(todaysEntry);
        setTodayPoem(poem);
        setVisiblePoem(poem);
        setBusy(false);
        return;
      }

      await chooseFreshPoem(stored);
    };

    boot();
  }, [chooseFreshPoem, commitState, date, readCuratorStatus]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const cycleLike = () => {
    if (!state || !visiblePoem) return;

    const entry = state.ledger.find((item) => item.key === visiblePoem.key);
    if (!entry) return;

    const currentLikes = entry.likes ?? (entry.status === "kept" ? 1 : 0);
    const cap = 3;
    const nextLikes = (currentLikes + 1) % (cap + 1);

    const deltaLikes = nextLikes - currentLikes;

    const updatedEntry: LedgerEntry = {
      ...entry,
      likes: nextLikes,
      status: nextLikes > 0 ? "kept" : "unread",
    };

    const nextLedger = state.ledger.map((item) => (item.key === entry.key ? updatedEntry : item));
    const scored = applyFeedbackDelta({ ...state, ledger: nextLedger }, updatedEntry, deltaLikes);
    commitState(scored);

    setShowLiked(true);
    window.setTimeout(() => setShowLiked(false), 1600);
  };

  const handleNext = async () => {
    if (!visiblePoem || !state) return;
    const markedState = state;

    sessionSeenRef.current = [...sessionSeenRef.current, visiblePoem.key];
    await chooseFreshPoem(markedState);
  };

  const handleLedgerSelect = async (entry: LedgerEntry) => {
    const poem = await hydrateEntry(entry);
    setVisiblePoem(poem);
    setArchiveView(true);
    setLedgerOpen(false);
    setMoreOpen(false);
  };

  const handleBackToToday = () => {
    setVisiblePoem(todayPoem);
    setArchiveView(false);
    setMoreOpen(false);
  };

  const handleCopy = async () => {
    if (!visiblePoem) return;

    await navigator.clipboard.writeText(copyTextFor(visiblePoem));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const dismissInstallHint = () => {
    if (!state) return;
    commitState({ ...state, installHintDismissed: true });
  };

  const retry = async () => {
    if (!state) return;
    await chooseFreshPoem(state);
  };

  return (
    <>
      <LoadingOverlay open={busy && !archiveView} label="loading poem" />
      <PoemView
        poem={visiblePoem}
        dateLabel={dateLabel}
        isArchiveView={archiveView}
        isFading={isFading}
        onRetry={retry}
        loading={busy}
      />

      {archiveView ? (
        <button
          className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-30 text-sm lowercase text-[color:var(--muted)]"
          type="button"
          onClick={handleBackToToday}
        >
          back to today
        </button>
      ) : null}

      <LedgerButton onClick={() => setLedgerOpen(true)} />

      {state ? (
        <LedgerPanel
          entries={state.ledger}
          open={ledgerOpen}
          onClose={() => setLedgerOpen(false)}
          onSelect={handleLedgerSelect}
          onOpenAnchors={() => setAnchorsOpen(true)}
          onUnlink={(entry) => {
            if (!state) return;
            if (!window.confirm('do you want to remove this poem from "liked poems"?')) return;

            const current = state.ledger.find((e) => e.key === entry.key);
            if (!current) return;

            const currentLikes = current.likes ?? (current.status === "kept" ? 1 : 0);
            if (currentLikes <= 0) return;

            const updated: LedgerEntry = {
              ...current,
              likes: 0,
              status: "unread",
            };

            const nextLedger = state.ledger.map((e) => (e.key === current.key ? updated : e));
            const scored = applyFeedbackDelta({ ...state, ledger: nextLedger }, updated, -currentLikes);
            commitState(scored);
          }}
        />
      ) : null}

      {visiblePoem ? (
        <MoreOverlay
          poem={visiblePoem}
          open={moreOpen}
          copied={copied}
          onCopy={handleCopy}
          onClose={() => setMoreOpen(false)}
          curation={curation ?? undefined}
          curatorEnabled={curatorEnabled}
        />
      ) : null}

      {state ? (
        <TasteAnchorsOverlay
          open={anchorsOpen}
          anchors={state.prefs.tasteAnchors ?? []}
          onClose={() => setAnchorsOpen(false)}
          onAdd={async (text) => {
            if (!state) return;
            const anchor = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
            await upsertAnchor(anchor, state, commitState);
          }}
          onUpdate={async (id, text) => {
            if (!state) return;
            const existing = (state.prefs.tasteAnchors ?? []).find((a) => a.id === id);
            const anchor = { id, text, createdAt: existing?.createdAt ?? new Date().toISOString() };
            await upsertAnchor(anchor, state, commitState);
          }}
          onRemove={async (anchorId) => {
            if (!state) return;
            await deleteAnchor(anchorId, state, commitState);
          }}
        />
      ) : null}

      <ActionPill
        disabled={busy}
        showNext={!archiveView}
        likes={likes}
        showLiked={showLiked}
        onLike={cycleLike}
        onMore={() => setMoreOpen((open) => !open)}
        onNext={handleNext}
      />

      {state ? <InstallHint dismissed={state.installHintDismissed} onDismiss={dismissInstallHint} /> : null}
    </>
  );
}

async function hydrateEntry(entry: LedgerEntry): Promise<DisplayPoem> {
  const fallback = displayFromEntry(entry);

  if (entry.source !== "contemporary") return fallback;

  try {
    const response = await fetch("/api/contemporary");
    const data = (await response.json()) as { poem?: { htmlBody: string; poemUrl: string } };

    const poem = data.poem;

    if (poem && poem.poemUrl === entry.poemUrl) {
      return {
        ...fallback,
        htmlBody: poem.htmlBody,
        lines: undefined,
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function copyTextFor(poem: DisplayPoem): string {
  const body = poem.htmlBody ? stripHtml(poem.htmlBody) : (poem.lines ?? []).join("\n");
  const footer = poem.poemUrl ? `\n\nsource: ${poem.poemUrl}` : "";

  return `${poem.title}\n${poem.author}\n\n${body}${footer}`;
}

function stripHtml(html: string): string {
  const element = document.createElement("div");
  element.innerHTML = html.replaceAll("<br>", "\n").replaceAll("</p>", "\n\n");
  return element.textContent?.trim() ?? "";
}

function formatToday(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

async function syncAnchors(state: AppState, commit: (s: AppState) => void) {
  try {
    const response = await fetch("/api/anchors", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const data = (await response.json()) as { anchors?: unknown };
    if (!Array.isArray(data.anchors)) return;

    commit({ ...state, prefs: { ...state.prefs, tasteAnchors: data.anchors as TasteAnchor[] } });
  } catch {
    // keep local cache if offline / unavailable
  }
}

async function upsertAnchor(anchor: { id: string; text: string; createdAt: string }, state: AppState, commit: (s: AppState) => void) {
  const optimistic: AppState = {
    ...state,
    prefs: { ...state.prefs, tasteAnchors: [anchor, ...(state.prefs.tasteAnchors ?? []).filter((a) => a.id !== anchor.id)] },
  };
  commit(optimistic);

  try {
    const response = await fetch("/api/anchors", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ anchor }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { anchors?: unknown };
    if (!Array.isArray(data.anchors)) return;
    commit({ ...optimistic, prefs: { ...optimistic.prefs, tasteAnchors: data.anchors as TasteAnchor[] } });
  } catch {
    // keep optimistic
  }
}

async function deleteAnchor(id: string, state: AppState, commit: (s: AppState) => void) {
  const optimistic: AppState = {
    ...state,
    prefs: { ...state.prefs, tasteAnchors: (state.prefs.tasteAnchors ?? []).filter((a) => a.id !== id) },
  };
  commit(optimistic);

  try {
    const response = await fetch("/api/anchors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { anchors?: unknown };
    if (!Array.isArray(data.anchors)) return;
    commit({ ...optimistic, prefs: { ...optimistic.prefs, tasteAnchors: data.anchors as TasteAnchor[] } });
  } catch {
    // keep optimistic
  }
}
