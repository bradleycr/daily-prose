/**
 * poets.org pages often include a republication year in copyright, but the underlying
 * poem can be much older unless we also look for "first published / originally published"
 * style hints. We conservatively pick the *earliest* plausible year we can infer.
 */

const YEAR_RE = /\b(1[6-9]\d{2}|20\d{2})\b/g;

export function minRecentPoetsOrgYear(now = new Date()): number {
  return now.getFullYear() - 150;
}

export function publicationYearHints(text: string): number[] {
  const hints: number[] = [];

  // Strong signals on poets.org credit lines.
  for (const re of [
    /\bOriginally published in Poem-a-Day on .{0,40}?\b(1[6-9]\d{2}|20\d{2})\b/gi,
    /\bPublished in Poem-a-Day on .{0,40}?\b(1[6-9]\d{2}|20\d{2})\b/gi,
    /\bFirst published in .{0,80}?\b(1[6-9]\d{2}|20\d{2})\b/gi,
    /\bOriginally published in .{0,80}?\b(1[6-9]\d{2}|20\d{2})\b/gi,
    /\bdatePublished\b\s*:\s*".{0,40}?\b(1[6-9]\d{2}|20\d{2})\b/gi,
  ]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const y = Number(match[1]);
      if (Number.isFinite(y)) hints.push(y);
    }
  }

  return hints;
}

export function earliestPublicationYearHint(text: string): number | null {
  const hints = publicationYearHints(text);
  if (!hints.length) return null;
  return Math.min(...hints);
}

export function parseYears(text: string): number[] {
  const years: number[] = [];
  YEAR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = YEAR_RE.exec(text)) !== null) {
    const y = Number(match[1]);
    if (Number.isFinite(y)) years.push(y);
  }
  return years;
}

export function earliestYearInText(text: string): number | null {
  const pub = earliestPublicationYearHint(text);
  if (typeof pub === "number") return pub;

  const years = parseYears(text);
  if (!years.length) return null;
  return Math.min(...years);
}

export function isYearRecentEnough(year: number, now = new Date()): boolean {
  return year >= minRecentPoetsOrgYear(now);
}
