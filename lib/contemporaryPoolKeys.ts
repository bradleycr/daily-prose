import type { ContemporaryPoem } from "./types";

/** Same key shape as `poemKey("contemporary", …)` in `recommend.ts`, for server-side dedupe. */
export function contemporaryPoolKey(poem: ContemporaryPoem): string {
  // Include upstream source to avoid collisions across providers.
  return `contemporary::${poem.source}::${poem.author}::${poem.title}`;
}
