"use client";

import { useMemo, useState } from "react";
import type { TasteAnchor } from "@/lib/types";

type TasteAnchorsOverlayProps = {
  open: boolean;
  anchors: TasteAnchor[];
  onClose: () => void;
  onAdd: (anchor: TasteAnchor) => void;
  onRemove: (id: string) => void;
};

export function TasteAnchorsOverlay({
  open,
  anchors,
  onClose,
  onAdd,
  onRemove,
}: TasteAnchorsOverlayProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");

  const canSave = useMemo(() => text.trim().length >= 20, [text]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" style={{ backgroundColor: "var(--paper)" }}>
      <div className="mx-auto w-full max-w-[38rem] px-7 pb-10 pt-[10vh] sm:px-8 lg:px-0">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-3xl font-medium">things i like</h2>
            <p className="mt-1 text-sm italic text-[color:var(--muted)]">
              paste lines you love. the curator will use them as an anchor.
            </p>
          </div>
          <button className="text-sm lowercase text-[color:var(--muted)]" type="button" onClick={onClose}>
            close
          </button>
        </div>

        <div className="glass rounded-[1.6rem] p-4">
          <div className="grid gap-3">
            <input
              className="w-full rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
              placeholder="title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="w-full rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
              placeholder="author (optional)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
            <textarea
              className="min-h-32 w-full resize-none rounded-xl bg-transparent px-3 py-2 text-sm leading-6 outline-none"
              placeholder="paste a passage, poem fragment, or anything that feels like home"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs lowercase tracking-[0.08em] text-[color:var(--muted)]">
              saved locally on this device
            </p>
            <button
              className={`rounded-full px-4 py-2 text-sm lowercase ${
                canSave ? "text-[color:var(--ink)]" : "text-[color:var(--muted)]"
              }`}
              type="button"
              disabled={!canSave}
              onClick={() => {
                const anchor: TasteAnchor = {
                  id: crypto.randomUUID(),
                  title: title.trim() || undefined,
                  author: author.trim() || undefined,
                  text: text.trim(),
                  createdAt: new Date().toISOString(),
                };
                onAdd(anchor);
                setTitle("");
                setAuthor("");
                setText("");
              }}
            >
              save
            </button>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="mb-3 text-sm lowercase tracking-[0.12em] text-[color:var(--muted)]">saved</h3>
          {anchors.length === 0 ? (
            <p className="text-sm italic text-[color:var(--muted)]">nothing yet</p>
          ) : (
            <div className="grid gap-3">
              {anchors
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((a) => (
                  <div key={a.id} className="glass rounded-[1.2rem] p-4">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <p className="text-sm leading-6">
                          {a.title ? <span className="font-display italic">{a.title}</span> : null}
                          {a.title && a.author ? <span className="text-[color:var(--muted)]"> · </span> : null}
                          {a.author ? <span className="text-[color:var(--muted)]">{a.author}</span> : null}
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink)]">
                          {a.text}
                        </pre>
                      </div>
                      <button
                        className="shrink-0 text-xs lowercase tracking-[0.08em] text-[color:var(--muted)]"
                        type="button"
                        onClick={() => onRemove(a.id)}
                      >
                        remove
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

