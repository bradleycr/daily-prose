import { ArrowMark, CircleMark, HeartMark } from "./Marks";

type ActionPillProps = {
  likes: number;
  onLike: () => void;
  onNext: () => void;
  onMore: () => void;
  showLiked: boolean;
  disabled?: boolean;
  showNext?: boolean;
};

export function ActionPill({
  likes,
  onLike,
  onNext,
  onMore,
  showLiked,
  disabled = false,
  showNext = true,
}: ActionPillProps) {
  const likeStrength = Math.max(0, Math.min(3, likes));
  const likeMix = likeStrength <= 0 ? 0 : 58 + likeStrength * 14; // 1..3 -> 72..100
  const likeColor = likeStrength > 0 ? `color-mix(in srgb, var(--kept) ${likeMix}%, var(--ink))` : undefined;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="glass flex h-14 items-center gap-1 rounded-full px-3 text-[color:var(--muted)]">
        <button
          aria-label="like poem"
          className={`relative grid h-11 w-11 place-items-center transition-colors ${
            likes > 0 ? "text-[color:var(--kept)]" : "hover:text-[color:var(--ink)]"
          }`}
          style={likeColor ? { color: likeColor } : undefined}
          disabled={disabled}
          type="button"
          onClick={onLike}
        >
          <HeartMark className="h-6 w-6 transition-all duration-500" filled={likes > 0} />
          <span
            className={`pointer-events-none absolute -bottom-6 text-[0.66rem] lowercase tracking-[0.08em] text-[color:var(--kept)] transition-opacity ${
              showLiked ? "opacity-100" : "opacity-0"
            }`}
          >
            liked
          </span>
        </button>
        {showNext ? (
          <button
            aria-label="show another poem"
            className="grid h-11 w-11 place-items-center transition-colors hover:text-[color:var(--ink)]"
            disabled={disabled}
            type="button"
            onClick={onNext}
          >
            <CircleMark className="h-6 w-6" />
          </button>
        ) : null}
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
