import { ArrowMark, CircleMark, HeartMark } from "./Marks";

type ActionPillProps = {
  kept: boolean;
  onKeep: () => void;
  onNext: () => void;
  onMore: () => void;
  showKept: boolean;
  disabled?: boolean;
};

export function ActionPill({
  kept,
  onKeep,
  onNext,
  onMore,
  showKept,
  disabled = false,
}: ActionPillProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="glass flex h-14 items-center gap-2 rounded-full px-4 text-[color:var(--muted)]">
        <button
          aria-label="keep poem"
          className={`relative grid h-11 w-11 place-items-center transition-colors ${
            kept ? "text-[color:var(--kept)]" : "hover:text-[color:var(--ink)]"
          }`}
          disabled={disabled}
          type="button"
          onClick={onKeep}
        >
          <HeartMark className="h-6 w-6 transition-all duration-500" filled={kept} />
          <span
            className={`pointer-events-none absolute -bottom-6 text-[0.66rem] lowercase tracking-[0.08em] text-[color:var(--kept)] transition-opacity ${
              showKept ? "opacity-100" : "opacity-0"
            }`}
          >
            kept
          </span>
        </button>
        <button
          aria-label="show another poem"
          className="grid h-11 w-11 place-items-center transition-colors hover:text-[color:var(--ink)]"
          disabled={disabled}
          type="button"
          onClick={onNext}
        >
          <CircleMark className="h-6 w-6" />
        </button>
        <button
          aria-label="more"
          className="grid h-11 w-11 place-items-center transition-colors hover:text-[color:var(--ink)]"
          disabled={disabled}
          type="button"
          onClick={onMore}
        >
          <ArrowMark className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
