import type { DisplayPoem } from "@/lib/types";

type MoreOverlayProps = {
  poem: DisplayPoem;
  open: boolean;
  copied: boolean;
  onCopy: () => void;
};

export function MoreOverlay({ poem, open, copied, onCopy }: MoreOverlayProps) {
  if (!open) return null;

  const sourceLabel = poem.source === "canon" ? "poetrydb.org" : "poets.org";

  return (
    <div className="fixed inset-x-0 bottom-28 z-20 flex justify-center px-5">
      <div className="glass w-full max-w-xs rounded-[1.6rem] p-4 text-sm lowercase leading-9 text-[color:var(--ink)]">
        <button className="block w-full text-left hover:text-[color:var(--kept)]" type="button" onClick={onCopy}>
          {copied ? "copied" : "copy poem text"}
        </button>
        <a
          className="block hover:text-[color:var(--kept)]"
          href={poem.poemUrl}
          rel="noreferrer"
          target="_blank"
        >
          read on {sourceLabel}
        </a>
        {poem.authorUrl ? (
          <a
            className="block hover:text-[color:var(--kept)]"
            href={poem.authorUrl}
            rel="noreferrer"
            target="_blank"
          >
            about {poem.author.toLowerCase()}
          </a>
        ) : null}
      </div>
    </div>
  );
}
