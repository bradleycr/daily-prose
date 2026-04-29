import { NextResponse } from "next/server";
import { z } from "zod";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const AnchorSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  author: z.string().optional(),
  text: z.string().min(1),
  createdAt: z.string().min(1),
});

const UpsertSchema = z.object({
  libraryId: z.string().min(8),
  anchor: AnchorSchema,
});

const DeleteSchema = z.object({
  libraryId: z.string().min(8),
  id: z.string().min(1),
});

export async function GET(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "redis_not_configured" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const libraryId = searchParams.get("libraryId") ?? "";
  if (libraryId.length < 8) return NextResponse.json({ error: "missing_library_id" }, { status: 400 });

  const key = anchorsKey(libraryId);
  const anchors = (await redis.get(key)) ?? [];

  return NextResponse.json({ anchors });
}

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "redis_not_configured" }, { status: 503 });

  const body = UpsertSchema.parse(await req.json());
  const key = anchorsKey(body.libraryId);

  const current = ((await redis.get(key)) as unknown) ?? [];
  const anchors = z.array(AnchorSchema).parse(Array.isArray(current) ? current : []);

  const next = [
    body.anchor,
    ...anchors.filter((a) => a.id !== body.anchor.id),
  ].slice(0, 60);

  await redis.set(key, next);
  return NextResponse.json({ anchors: next });
}

export async function PUT(req: Request) {
  // same as POST (id-based upsert)
  return POST(req);
}

export async function DELETE(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "redis_not_configured" }, { status: 503 });

  const body = DeleteSchema.parse(await req.json());
  const key = anchorsKey(body.libraryId);

  const current = ((await redis.get(key)) as unknown) ?? [];
  const anchors = z.array(AnchorSchema).parse(Array.isArray(current) ? current : []);
  const next = anchors.filter((a) => a.id !== body.id);

  await redis.set(key, next);
  return NextResponse.json({ anchors: next });
}

function anchorsKey(libraryId: string) {
  return `dailyprose:library:${libraryId}:anchors`;
}

