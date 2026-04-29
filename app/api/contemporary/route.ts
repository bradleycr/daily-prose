import { NextResponse } from "next/server";
import { fetchTodaysContemporary } from "@/lib/poetsorg";
import { fetchDiscoveredPoetsOrgPoem } from "@/lib/poetsorgDiscover";

export const dynamic = "force-dynamic";

export async function GET() {
  const poem = await fetchTodaysContemporary();

  if (!poem) {
    // If poem-a-day is quiet/unavailable, optionally discover another poets.org poem.
    const discovered = await fetchDiscoveredPoetsOrgPoem(new Set());
    return NextResponse.json({ poem: discovered }, { status: 200 });
  }

  return NextResponse.json({ poem });
}
