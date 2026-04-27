import { NextResponse } from "next/server";
import { fetchTodaysContemporary } from "@/lib/poetsorg";

export const dynamic = "force-dynamic";

export async function GET() {
  const poem = await fetchTodaysContemporary();

  if (!poem) {
    return NextResponse.json({ poem: null }, { status: 200 });
  }

  return NextResponse.json({ poem });
}
