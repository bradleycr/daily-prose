import { google } from "googleapis";

export type GoogleCseResult = {
  title: string;
  link: string;
  snippet?: string;
};

export async function googleCseSearch(query: string, options?: { num?: number }): Promise<GoogleCseResult[]> {
  const key = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!key || !cx) return [];

  const customsearch = google.customsearch("v1");
  const response = await customsearch.cse.list({
    auth: key,
    cx,
    q: query,
    num: Math.max(1, Math.min(10, options?.num ?? 8)),
    safe: "active",
  });

  const items = response.data.items ?? [];
  return items
    .map((item) => ({
      title: item.title ?? "",
      link: item.link ?? "",
      snippet: item.snippet ?? undefined,
    }))
    .filter((item) => Boolean(item.link));
}

