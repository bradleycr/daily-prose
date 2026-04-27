"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionPill } from "@/components/ActionPill";
import { InstallHint } from "@/components/InstallHint";
import { LedgerButton } from "@/components/LedgerButton";
import { LedgerPanel } from "@/components/LedgerPanel";
import { MoreOverlay } from "@/components/MoreOverlay";
import { PoemView } from "@/components/PoemView";
import { displayFromEntry, entryFromPoem, getState, saveState, todayKey } from "@/lib/storage";
import { pickPoem, updatePreferenceForEntry } from "@/lib/recommend";
import type { AppState, DisplayPoem, LedgerEntry, SourceKind } from "@/lib/types";

export function DailyProseApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [todayPoem, setTodayPoem] = useState<DisplayPoem | null>(null);
  const [visiblePoem, setVisiblePoem] = useState<DisplayPoem | null>(null);
  const [archiveView, setArchiveView] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKept, setShowKept] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [busy, setBusy] = useState(true);
  const sessionSeenRef = useRef<string[]>([]);

  const date = useMemo(() => todayKey(), []);
  const dateLabel = useMemo(() => formatToday(date), [date]);
  const activeEntry = state?.ledger.find((entry) => entry.key === visiblePoem?.key);
  const kept = activeEntry?.status === "kept";

  const commitState = useCallback((next: AppState) => {
    setState(next);
    saveState(next);
  }, []);

  const chooseFreshPoem = useCallback(
    async (baseState: AppState, forceSource?: SourceKind) => {
      setBusy(true);
      setIsFading(true);

      const poem = await pickPoem(baseState, { forceSource, sessionSeen: sessionSeenRef.current });

      window.setTimeout(() => {
        if (!poem) {
          setTodayPoem(null);
          setVisiblePoem(null);
          setBusy(false);
          setIsFading(false);
          return;
        }

        const entry = entryFromPoem(poem, date);
        const nextState: AppState = {
          ...baseState,
          ledger: [entry, ...baseState.ledger.filter((item) => item.key !== entry.key)],
          todaySlot: { date, entryKey: entry.key },
          prefs: {
            ...baseState.prefs,
            seenPoemKeys: Array.from(new Set([...baseState.prefs.seenPoemKeys, entry.key])),
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

  useEffect(() => {
    const boot = async () => {
      const stored = getState();
      const todaysEntry =
        stored.todaySlot?.date === date
          ? stored.ledger.find((entry) => entry.key === stored.todaySlot?.entryKey)
          : undefined;

      setState(stored);

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
  }, [chooseFreshPoem, date]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const markCurrent = (status: "kept" | "dismissed"): AppState | null => {
    if (!state || !visiblePoem) return null;

    const entry = state.ledger.find((item) => item.key === visiblePoem.key);
    if (!entry) return state;

    const alreadyMarked = entry.status === status;
    const markedLedger = state.ledger.map((item) =>
      item.key === entry.key ? { ...item, status } : item,
    );
    const markedState = { ...state, ledger: markedLedger };
    const nextState = alreadyMarked
      ? markedState
      : updatePreferenceForEntry(markedState, { ...entry, status }, status === "kept" ? "keep" : "dismiss");

    commitState(nextState);
    return nextState;
  };

  const handleKeep = () => {
    markCurrent("kept");
    setShowKept(true);
    window.setTimeout(() => setShowKept(false), 2000);
  };

  const handleNext = async () => {
    if (!visiblePoem || !state) return;

    const markedState = markCurrent("dismissed") ?? state;
    const nextSource = visiblePoem.source === "contemporary" ? "canon" : "contemporary";

    sessionSeenRef.current = [...sessionSeenRef.current, visiblePoem.key];
    await chooseFreshPoem(markedState, nextSource);
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

  return (
    <>
      <PoemView poem={visiblePoem} dateLabel={dateLabel} isArchiveView={archiveView} isFading={isFading} />

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
        />
      ) : null}

      {visiblePoem ? (
        <MoreOverlay poem={visiblePoem} open={moreOpen} copied={copied} onCopy={handleCopy} />
      ) : null}

      <ActionPill
        disabled={busy || archiveView}
        kept={Boolean(kept)}
        showKept={showKept}
        onKeep={handleKeep}
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
