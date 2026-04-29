import type { ContemporaryPoem } from "./types";

/** Same key shape as `poemKey("contemporary", …)` in `recommend.ts`, for server-side dedupe. */
export function contemporaryPoolKey(poem: ContemporaryPoem): string {
  // Keep this aligned with `poemKey("contemporary", author, title)` in `lib/recommend.ts`.
  return `contemporary::${poem.author}::${poem.title}`;
}
