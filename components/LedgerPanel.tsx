import type { LedgerEntry } from "@/lib/types";
import { HeartMark } from "@/components/Marks";

type LedgerPanelProps = {
  entries: LedgerEntry[];
  open: boolean;
  onClose: () => void;
  onSelect: (entry: LedgerEntry) => void;
  onUnlink: (entry: LedgerEntry) => void;
};

export function LedgerPanel({ entries, open, onClose, onSelect, onUnlink }: LedgerPanelProps) {
  const ordered = entries
    .filter((entry) => (entry.likes ?? 0) > 0 || entry.status === "kept")
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40" style={{ backgroundColor: "var(--paper)" }}>
      <button aria-label="close ledger" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <section className="glass absolute inset-x-3 bottom-3 max-h-[80dvh] translate-y-0 rounded-[2rem] p-6 transition-transform duration-300 ease-out sm:mx-auto sm:max-w-xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-medium">liked so far</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">{ordered.length} poems</p>
          </div>
          <button className="text-sm lowercase text-[color:var(--muted)]" type="button" onClick={onClose}>
            close
          </button>
        </div>

        <div className="max-h-[58dvh] overflow-y-auto pr-1">
          {ordered.length === 0 ? (
            <p className="py-8 text-sm italic text-[color:var(--muted)]">nothing yet</p>
          ) : (
            ordered.map((entry) => (
              <div
                key={entry.key}
                className="grid min-h-14 w-full grid-cols-[3.75rem_1fr_2.25rem] items-center gap-3 py-2 text-left"
              >
                <button className="contents" type="button" onClick={() => onSelect(entry)}>
                  <span className="text-[0.7rem] uppercase tracking-[0.12em] text-[color:var(--muted)]">
                    {formatLedgerDate(entry.date)}
                  </span>
                  <span>
                    <span className="block leading-5">{entry.title}</span>
                    <span className="block font-display text-sm italic text-[color:var(--muted)]">{entry.author}</span>
                  </span>
                </button>
                <button
                  aria-label="remove from liked poems"
                  className="grid h-10 w-10 place-items-center text-[color:var(--kept)]"
                  type="button"
                  onClick={() => onUnlink(entry)}
                >
                  <HeartMark className="h-5 w-5" filled />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function formatLedgerDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
