"use client";

import { useMemo, useState } from "react";
import type { TasteAnchor } from "@/lib/types";

type TasteAnchorsOverlayProps = {
  open: boolean;
  anchors: TasteAnchor[];
  onClose: () => void;
  onAdd: (text: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onUpdate: (id: string, text: string) => Promise<void>;
};

export function TasteAnchorsOverlay({
  open,
  anchors,
  onClose,
  onAdd,
  onRemove,
  onUpdate,
}: TasteAnchorsOverlayProps) {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<TasteAnchor | null>(null);

  const canSave = useMemo(() => text.trim().length >= 4, [text]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" style={{ backgroundColor: "var(--paper)" }}>
      <div className="mx-auto w-full max-w-[38rem] px-7 pb-10 pt-[10vh] sm:px-8 lg:px-0">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-3xl font-medium">things i like</h2>
            <p className="mt-1 text-sm italic text-[color:var(--muted)]">
              paste lines you love. this is used as curation context.
            </p>
          </div>
          <button className="text-sm lowercase text-[color:var(--muted)]" type="button" onClick={onClose}>
            close
          </button>
        </div>

        <div className="glass rounded-[1.6rem] p-4">
          <div className="grid gap-3">
            <textarea
              className="min-h-32 w-full resize-none rounded-xl bg-transparent px-3 py-2 text-sm leading-6 outline-none"
              placeholder="paste a passage, poem fragment, or anything that feels like home"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs lowercase tracking-[0.08em] text-[color:var(--muted)]">
              shared globally
            </p>
            <button
              className={`rounded-full px-4 py-2 text-sm lowercase ${
                canSave ? "text-[color:var(--ink)]" : "text-[color:var(--muted)]"
              }`}
              type="button"
              disabled={!canSave}
              onClick={async () => {
                if (!canSave) return;
                if (editing) {
                  await onUpdate(editing.id, text.trim());
                  setEditing(null);
                  setText("");
                  return;
                }

                await onAdd(text.trim());
                setText("");
              }}
            >
              {editing ? "update" : "save"}
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
                        <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink)]">
                          {a.text}
                        </pre>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <button
                          className="text-xs lowercase tracking-[0.08em] text-[color:var(--muted)]"
                          type="button"
                          onClick={() => {
                            setEditing(a);
                            setText(a.text);
                          }}
                        >
                          edit
                        </button>
                        <button
                          className="text-xs lowercase tracking-[0.08em] text-[color:var(--muted)]"
                          type="button"
                          onClick={() => void onRemove(a.id)}
                        >
                          remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs lowercase tracking-[0.12em] text-[color:var(--muted)]">editing</p>
            <button
              className="text-sm lowercase text-[color:var(--muted)]"
              type="button"
              onClick={() => {
                setEditing(null);
                setText("");
              }}
            >
              cancel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

