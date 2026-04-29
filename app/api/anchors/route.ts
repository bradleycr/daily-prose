import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AnchorSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  createdAt: z.string().min(1),
});

const UpsertSchema = z.object({
  anchor: AnchorSchema,
});

const DeleteSchema = z.object({
  id: z.string().min(1),
});

const FILE_NAME = "daily-prose-anchors.json";

export async function GET() {
  const gistId = process.env.GITHUB_ANCHORS_GIST_ID?.trim();
  if (!gistId) return NextResponse.json({ error: "anchors_gist_not_configured" }, { status: 503 });

  const anchors = await readAnchorsFromGist(gistId);
  return NextResponse.json({ anchors });
}

export async function POST(req: Request) {
  const gistId = process.env.GITHUB_ANCHORS_GIST_ID?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!gistId || !token) return NextResponse.json({ error: "anchors_gist_not_writable" }, { status: 503 });

  const body = UpsertSchema.parse(await req.json());
  const current = await readAnchorsFromGist(gistId);
  const next = upsert(current, body.anchor);

  const ok = await writeAnchorsToGist({ gistId, token, anchors: next });
  if (!ok) return NextResponse.json({ error: "anchors_gist_write_failed" }, { status: 502 });

  return NextResponse.json({ anchors: next });
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function DELETE(req: Request) {
  const gistId = process.env.GITHUB_ANCHORS_GIST_ID?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!gistId || !token) return NextResponse.json({ error: "anchors_gist_not_writable" }, { status: 503 });

  const body = DeleteSchema.parse(await req.json());
  const current = await readAnchorsFromGist(gistId);
  const next = current.filter((a) => a.id !== body.id);

  const ok = await writeAnchorsToGist({ gistId, token, anchors: next });
  if (!ok) return NextResponse.json({ error: "anchors_gist_write_failed" }, { status: 502 });

  return NextResponse.json({ anchors: next });
}

async function readAnchorsFromGist(gistId: string) {
  try {
    const response = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      files?: Record<string, { content?: string | null }>;
    };

    const raw = data.files?.[FILE_NAME]?.content ?? "[]";
    const parsed = z.array(AnchorSchema).safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data;
  } catch {
    return [];
  }
}

async function writeAnchorsToGist(input: { gistId: string; token: string; anchors: z.infer<typeof AnchorSchema>[] }) {
  try {
    const response = await fetch(`https://api.github.com/gists/${encodeURIComponent(input.gistId)}`, {
      method: "PATCH",
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: {
          [FILE_NAME]: {
            content: JSON.stringify(input.anchors, null, 2),
          },
        },
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function upsert(anchors: z.infer<typeof AnchorSchema>[], anchor: z.infer<typeof AnchorSchema>) {
  const without = anchors.filter((a) => a.id !== anchor.id);
  const next = [anchor, ...without];
  next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return next;
}

