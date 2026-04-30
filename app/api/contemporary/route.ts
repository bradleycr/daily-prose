import { NextResponse } from "next/server";
import { contemporaryPoolKey } from "@/lib/contemporaryPoolKeys";
import { fetchPoesisRandomPoem } from "@/lib/poesis";
import { fetchTodaysContemporary } from "@/lib/poetsorg";
import { fetchDiscoveredPoetsOrgPoem } from "@/lib/poetsorgDiscover";
import type { ContemporaryPoem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pool = url.searchParams.get("pool") === "1";
  const n = Math.min(10, Math.max(2, Number(url.searchParams.get("n")) || 6));

  if (pool) {
    const poems = await buildContemporaryPool(n);
    return NextResponse.json({ poems }, { status: 200 });
  }

  const poem = await fetchTodaysContemporary();

  if (!poem) {
    // If poem-a-day is quiet/unavailable, optionally discover another poets.org poem.
    const discovered = await fetchDiscoveredPoetsOrgPoem(new Set());
    return NextResponse.json({ poem: discovered }, { status: 200 });
  }

  return NextResponse.json({ poem });
}

/**
 * Several poets.org options for one client-side curator pass (Poem-a-Day + light discovery).
 * Discovery is optional and depends on Google CSE env vars.
 */
async function buildContemporaryPool(target: number): Promise<ContemporaryPoem[]> {
  const seen = new Set<string>();
  const poems: ContemporaryPoem[] = [];

  const push = (poem: ContemporaryPoem | null) => {
    if (!poem) return;
    const key = contemporaryPoolKey(poem);
    if (seen.has(key)) return;
    seen.add(key);
    poems.push(poem);
  };

  push(await fetchTodaysContemporary());

  // Add a CC-licensed wildcard (Poesis) for variety.
  // This also keeps the LLM's daily pool non-degenerate when poets.org discovery is unavailable.
  push(await fetchPoesisRandomPoem({ language: "en" }));

  let attempts = 0;
  while (poems.length < target && attempts < 10) {
    attempts += 1;
    push(await fetchDiscoveredPoetsOrgPoem(seen));
  }

  return poems;
}
