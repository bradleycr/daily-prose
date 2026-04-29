import type { DisplayPoem } from "@/lib/types";
import { LoadingGlyph } from "@/components/LoadingGlyph";

type PoemViewProps = {
  poem: DisplayPoem | null;
  dateLabel: string;
  isFading?: boolean;
  isArchiveView?: boolean;
  onRetry?: () => void;
  loading?: boolean;
};

export function PoemView({
  poem,
  dateLabel,
  isFading = false,
  isArchiveView = false,
  onRetry,
  loading = false,
}: PoemViewProps) {
  if (!poem) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[38rem] items-center justify-center px-7 text-[color:var(--muted)]">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <LoadingGlyph label="loading poem" className="text-[color:var(--muted)]" />
            <p className="text-sm lowercase tracking-[0.08em] opacity-80">loading</p>
          </div>
        ) : (
          <button
            className="text-left text-lg italic"
            type="button"
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
          >
            the library is quiet right now. tap to try again.
          </button>
        )}
      </main>
    );
  }

  return (
    <main
      className={`mx-auto w-full max-w-[38rem] px-7 pb-40 pt-[14vh] transition-opacity duration-[600ms] ease-out sm:px-8 lg:px-0 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="mb-14 flex items-start justify-between gap-8">
        <div>
          <h1 className="font-display text-[1.65rem] font-medium leading-tight tracking-[-0.01em] sm:text-[2rem]">
            {poem.title}
          </h1>
          <p className="mt-2 text-[0.72rem] uppercase tracking-[0.16em] text-[color:var(--muted)]">
            by <span className="font-display italic normal-case tracking-[0.04em]">{poem.author}</span>
            {poem.publishedYear ? (
              <span className="normal-case tracking-[0.08em] text-[color:var(--muted)]"> · {poem.publishedYear}</span>
            ) : null}
          </p>
        </div>
        <div className="shrink-0 pt-1 text-right">
          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--muted)]">
            {isArchiveView ? "memory" : dateLabel}
          </p>
          {loading ? (
            <LoadingGlyph
              label="loading poem"
              className="mt-2 flex justify-end text-[color:var(--muted)] opacity-80"
            />
          ) : null}
        </div>
      </div>

      {poem.htmlBody ? (
        <div
          className="poem contemporary-poem"
          // poets.org is sanitized server-side; only quiet formatting tags survive.
          dangerouslySetInnerHTML={{ __html: poem.htmlBody }}
        />
      ) : (
        <pre className="poem">{(poem.lines ?? []).join("\n")}</pre>
      )}

      {poem.copyright ? (
        <p className="mt-12 text-sm italic leading-6 text-[color:var(--muted)]">{poem.copyright}</p>
      ) : null}
    </main>
  );
}
