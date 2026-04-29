import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = Boolean(process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.trim());
  return NextResponse.json({ enabled });
}

