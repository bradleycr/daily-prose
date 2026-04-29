import { ArrowMark, CircleMark, DislikeMark, HeartMark } from "./Marks";

type ActionPillProps = {
  likes: number;
  dislikes: number;
  onLike: () => void;
  onDislike: () => void;
  onNext: () => void;
  onMore: () => void;
  showLiked: boolean;
  disabled?: boolean;
  disableNext?: boolean;
};

export function ActionPill({
  likes,
  dislikes,
  onLike,
  onDislike,
  onNext,
  onMore,
  showLiked,
  disabled = false,
  disableNext = false,
}: ActionPillProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="glass flex h-14 items-center gap-1 rounded-full px-3 text-[color:var(--muted)]">
        <button
          aria-label="like poem"
          className={`relative grid h-11 w-11 place-items-center transition-colors ${
            likes > 0 ? "text-[color:var(--kept)]" : "hover:text-[color:var(--ink)]"
          }`}
          disabled={disabled}
          type="button"
          onClick={onLike}
        >
          <HeartMark className="h-6 w-6 transition-all duration-500" filled={likes > 0} />
          {likes > 1 ? (
            <span className="absolute right-1 top-1 text-[0.62rem] tracking-[0.06em] text-[color:var(--kept)]">
              {likes}
            </span>
          ) : null}
          <span
            className={`pointer-events-none absolute -bottom-6 text-[0.66rem] lowercase tracking-[0.08em] text-[color:var(--kept)] transition-opacity ${
              showLiked ? "opacity-100" : "opacity-0"
            }`}
          >
            liked
          </span>
        </button>
        <button
          aria-label="dislike poem"
          className={`relative grid h-11 w-11 place-items-center transition-colors ${
            dislikes > 0 ? "text-[color:var(--muted)]" : "hover:text-[color:var(--ink)]"
          }`}
          disabled={disabled}
          type="button"
          onClick={onDislike}
        >
          <DislikeMark className="h-5 w-5" />
          {dislikes > 1 ? (
            <span className="absolute right-1 top-1 text-[0.62rem] tracking-[0.06em]">{dislikes}</span>
          ) : null}
        </button>
        <button
          aria-label="show another poem"
          className="grid h-11 w-11 place-items-center transition-colors hover:text-[color:var(--ink)]"
          disabled={disabled || disableNext}
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
