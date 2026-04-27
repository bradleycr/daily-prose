import type { FormKind } from "./types";

export function classifyForm(lineCount: number): FormKind {
  if (lineCount === 14) return "sonnet";
  if (lineCount <= 16) return "short";
  if (lineCount <= 40) return "medium";
  return "long";
}
