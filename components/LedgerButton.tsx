import { LedgerMark } from "./Marks";

type LedgerButtonProps = {
  onClick: () => void;
};

export function LedgerButton({ onClick }: LedgerButtonProps) {
  return (
    <button
      aria-label="open reading ledger"
      className="fixed left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-30 grid h-11 w-11 place-items-center rounded-full text-[color:var(--muted)] transition-colors hover:text-[color:var(--ink)]"
      type="button"
      onClick={onClick}
    >
      <LedgerMark className="h-5 w-5" />
    </button>
  );
}
