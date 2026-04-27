export function wikipediaLinkFor(name: string): string {
  const slug = name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.()_-]/g, "");

  return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug).replaceAll("%5F", "_")}`;
}
